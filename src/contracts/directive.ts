import type { BinaryName } from '../config/types.js'

export const supportedExitCodes = [0, 1, 2, 64] as const

export type SupportedExitCode = (typeof supportedExitCodes)[number]

export interface PerBinaryDirective {
  binary: BinaryName
  exitCode: SupportedExitCode
  verdict: string
  directive: string
  stderr?: string
}

export interface DirectiveBundle {
  cycleId: string
  contextTag: string
  directive: string
  perBinary: PerBinaryDirective[]
  corpusProvenance: string
}

export interface ProxyRequestPayload {
  documentJson: string
  cycleId: string
  enabledBinaries?: BinaryName[]
  timeoutMs?: number
  stdoutByteCap?: number
}

export function isSupportedExitCode(code: number): code is SupportedExitCode {
  return supportedExitCodes.includes(code as SupportedExitCode)
}
