import * as childProcess from 'node:child_process'
import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import { BSanityError } from '../errors.js'
import { binaryNames, type BinaryName } from '../config/types.js'
import { isSupportedExitCode, type DirectiveBundle, type PerBinaryDirective, type ProxyRequestPayload } from '../contracts/directive.js'

export interface ProxyHandlerEvent {
  data: ProxyRequestPayload
  headers?: Record<string, string | undefined>
}

export interface ProxyRuntimeConfig {
  expectedCycleToken?: string
  binaryPaths?: Partial<Record<BinaryName, string>>
  timeoutMs?: number
  stdoutByteCap?: number
}

interface RunBinaryInput {
  binary: BinaryName
  command: string
  documentJson: string
  timeoutMs: number
  stdoutByteCap: number
}

const defaultTimeoutMs = 5000
const defaultStdoutByteCap = 64 * 1024
const contextTag = 'host:sanity-v3'
const corpusProvenance = 'unavailable at adapter layer'

export async function handleBSanityProxyEvent(event: ProxyHandlerEvent, config: ProxyRuntimeConfig = {}): Promise<DirectiveBundle> {
  assertAuthorized(event, config.expectedCycleToken)
  const payload = normalizePayload(event.data, config)
  const enabledBinaries = payload.enabledBinaries ?? [...binaryNames]

  if (enabledBinaries.length === 0) {
    throw new BSanityError({ code: 'fanout-budget-exceeded', message: 'At least one binary must be enabled.' })
  }

  const results = await Promise.all(
    enabledBinaries.map((binary) =>
      runBinary({
        binary,
        command: config.binaryPaths?.[binary] ?? binary,
        documentJson: payload.documentJson,
        timeoutMs: payload.timeoutMs ?? config.timeoutMs ?? defaultTimeoutMs,
        stdoutByteCap: payload.stdoutByteCap ?? config.stdoutByteCap ?? defaultStdoutByteCap
      })
    )
  )

  return {
    cycleId: payload.cycleId,
    contextTag,
    directive: joinDirectives(results),
    perBinary: results,
    corpusProvenance
  }
}

function normalizePayload(value: unknown, config: ProxyRuntimeConfig): Required<Pick<ProxyRequestPayload, 'documentJson' | 'cycleId'>> & Pick<ProxyRequestPayload, 'enabledBinaries' | 'timeoutMs' | 'stdoutByteCap'> {
  if (!isRecord(value)) {
    throw new BSanityError({ code: 'document-action-handler-failed', message: 'Proxy event data must be an object.' })
  }

  if (typeof value.documentJson !== 'string' || value.documentJson.length === 0) {
    throw new BSanityError({ code: 'document-action-handler-failed', message: 'documentJson must be a non-empty string.' })
  }

  if (typeof value.cycleId !== 'string' || value.cycleId.length === 0) {
    throw new BSanityError({ code: 'document-action-handler-failed', message: 'cycleId must be a non-empty string.' })
  }

  const payload: Required<Pick<ProxyRequestPayload, 'documentJson' | 'cycleId'>> & Pick<ProxyRequestPayload, 'enabledBinaries' | 'timeoutMs' | 'stdoutByteCap'> = {
    documentJson: value.documentJson,
    cycleId: value.cycleId
  }

  if (Array.isArray(value.enabledBinaries)) {
    payload.enabledBinaries = normalizeEnabledBinaries(value.enabledBinaries)
  }

  const timeoutMs = normalizePositiveInteger(value.timeoutMs, config.timeoutMs, defaultTimeoutMs, 'timeoutMs')
  const stdoutByteCap = normalizePositiveInteger(value.stdoutByteCap, config.stdoutByteCap, defaultStdoutByteCap, 'stdoutByteCap')

  payload.timeoutMs = timeoutMs
  payload.stdoutByteCap = stdoutByteCap

  return payload
}

function assertAuthorized(event: ProxyHandlerEvent, expectedCycleToken: string | undefined): void {
  if (expectedCycleToken === undefined) {
    return
  }

  const actual = event.headers?.['x-bsuite-cycle-token'] ?? event.headers?.['X-Bsuite-Cycle-Token']

  if (actual !== expectedCycleToken) {
    throw new BSanityError({ code: 'jwt-auth-failed', message: 'Missing or invalid cycle token.' })
  }
}

function normalizeEnabledBinaries(value: unknown[]): BinaryName[] {
  const result: BinaryName[] = []

  for (const item of value) {
    if (!binaryNames.includes(item as BinaryName)) {
      throw new BSanityError({ code: 'config-malformed', message: `Unsupported binary ${String(item)}.` })
    }

    result.push(item as BinaryName)
  }

  return [...new Set(result)]
}

function normalizePositiveInteger(value: unknown, fallback: number | undefined, defaultValue: number, name: string): number {
  const candidate = value ?? fallback ?? defaultValue

  if (!Number.isInteger(candidate) || typeof candidate !== 'number' || candidate <= 0) {
    throw new BSanityError({ code: 'config-malformed', message: `${name} must be a positive integer.` })
  }

  return candidate
}

async function runBinary(input: RunBinaryInput): Promise<PerBinaryDirective> {
  return new Promise((resolve, reject) => {
    const child = childProcess.spawn(input.command, [], { stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    let settled = false

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true
        child.kill('SIGTERM')
        reject(new BSanityError({ code: 'fanout-budget-exceeded', message: `${input.binary} timed out after ${input.timeoutMs}ms.` }))
      }
    }, input.timeoutMs)

    child.stdout.on('data', (chunk: Buffer) => {
      stdout = appendCapped(stdout, chunk, input.stdoutByteCap)
    })

    child.stderr.on('data', (chunk: Buffer) => {
      stderr = appendCapped(stderr, chunk, input.stdoutByteCap)
    })

    child.on('error', (cause) => {
      if (!settled) {
        settled = true
        clearTimeout(timeout)
        reject(new BSanityError({ code: 'proxy-unreachable', message: `Failed to spawn ${input.binary}.`, cause }))
      }
    })

    child.on('close', (code) => {
      if (settled) {
        return
      }

      settled = true
      clearTimeout(timeout)

      try {
        resolve(createBinaryResult(input.binary, code, stdout, stderr))
      } catch (cause) {
        reject(cause)
      }
    })

    writeDocument(child, input.documentJson, reject)
  })
}

function writeDocument(child: ChildProcessWithoutNullStreams, documentJson: string, reject: (reason: unknown) => void): void {
  child.stdin.on('error', (cause) => {
    reject(new BSanityError({ code: 'proxy-unreachable', message: 'Failed to pass document JSON to binary stdin.', cause }))
  })
  child.stdin.end(documentJson)
}

function createBinaryResult(binary: BinaryName, code: number | null, stdout: string, stderr: string): PerBinaryDirective {
  const exitCode = code ?? 64

  if (!isSupportedExitCode(exitCode)) {
    throw new BSanityError({ code: 'proxy-invalid-exit-code', message: `${binary} returned unsupported exit code ${exitCode}.` })
  }

  const directive = stdout.trim()

  if (directive.length === 0) {
    throw new BSanityError({ code: 'proxy-missing-marker', message: `${binary} emitted empty stdout.` })
  }

  return {
    binary,
    exitCode,
    verdict: verdictForExitCode(exitCode),
    directive,
    ...(stderr.trim().length > 0 ? { stderr: stderr.trim() } : {})
  }
}

function verdictForExitCode(exitCode: PerBinaryDirective['exitCode']): string {
  switch (exitCode) {
    case 0:
      return 'passed'
    case 1:
      return 'attention-required'
    case 2:
      return 'malformed'
    case 64:
      return 'internal-error'
  }
}

function joinDirectives(results: PerBinaryDirective[]): string {
  return results.map((result) => `${result.binary}: ${result.directive}`).join('\n\n')
}

function appendCapped(current: string, chunk: Buffer, byteCap: number): string {
  return `${current}${chunk.toString('utf8')}`.slice(0, byteCap)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
