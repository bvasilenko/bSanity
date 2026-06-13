import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { describe, expect, it, vi } from 'vitest'
import { BSanityError } from '../../src/errors.js'

interface SpawnedProcess extends EventEmitter {
  stdin: PassThrough
  stdout: PassThrough
  stderr: PassThrough
  kill: ReturnType<typeof vi.fn>
}

vi.mock('node:child_process', () => ({
  spawn: vi.fn((command: string) => {
    const child = Object.assign(new EventEmitter(), {
      stdin: new PassThrough(),
      stdout: new PassThrough(),
      stderr: new PassThrough(),
      kill: vi.fn()
    }) as SpawnedProcess

    queueMicrotask(() => emitProcessResult(command, child))

    return child
  })
}))

describe('handleBSanityProxyEvent', () => {
  it.each([
    ['exit code 0', 'success', 'passed'],
    ['exit code 1', 'attention', 'attention-required'],
    ['exit code 2', 'malformed', 'malformed'],
    ['exit code 64', 'internal', 'internal-error']
  ])('maps supported %s to a per-binary verdict', async (_label, command, verdict) => {
    const { handleBSanityProxyEvent } = await import('../../src/runtime/proxy.js')
    const bundle = await handleBSanityProxyEvent(
      { data: { documentJson: '{"_type":"article"}', cycleId: 'cycle-1', enabledBinaries: ['bground'] } },
      { binaryPaths: { bground: command } }
    )

    expect(bundle).toMatchObject({ cycleId: 'cycle-1', contextTag: 'host:sanity-v3' })
    expect(bundle.perBinary[0]).toMatchObject({ binary: 'bground', verdict })
  })

  it('deduplicates enabled binaries before fanout', async () => {
    const { handleBSanityProxyEvent } = await import('../../src/runtime/proxy.js')
    const bundle = await handleBSanityProxyEvent({
      data: { documentJson: '{}', cycleId: 'cycle-1', enabledBinaries: ['bground', 'bground'] }
    })

    expect(bundle.perBinary).toHaveLength(1)
  })

  it('accepts a valid cycle token', async () => {
    const { handleBSanityProxyEvent } = await import('../../src/runtime/proxy.js')

    await expect(
      handleBSanityProxyEvent(
        {
          data: { documentJson: '{}', cycleId: 'cycle-1', enabledBinaries: ['bground'] },
          headers: { 'x-bsuite-cycle-token': 'secret' }
        },
        { expectedCycleToken: 'secret' }
      )
    ).resolves.toMatchObject({ cycleId: 'cycle-1' })
  })

  it.each([
    ['missing token', {}, { expectedCycleToken: 'secret' }],
    ['empty document JSON', { documentJson: '', cycleId: 'cycle-1', enabledBinaries: ['bground'] }, {}],
    ['empty cycle ID', { documentJson: '{}', cycleId: '', enabledBinaries: ['bground'] }, {}],
    ['unsupported binary', { documentJson: '{}', cycleId: 'cycle-1', enabledBinaries: ['unknown'] }, {}],
    ['unsupported exit code', { documentJson: '{}', cycleId: 'cycle-1', enabledBinaries: ['bground'] }, { binaryPaths: { bground: 'unsupported' } }],
    ['empty stdout', { documentJson: '{}', cycleId: 'cycle-1', enabledBinaries: ['bground'] }, { binaryPaths: { bground: 'empty' } }],
    ['timeout', { documentJson: '{}', cycleId: 'cycle-1', enabledBinaries: ['bground'], timeoutMs: 1 }, { binaryPaths: { bground: 'timeout' } }]
  ])('rejects %s', async (_label, data, config) => {
    const { handleBSanityProxyEvent } = await import('../../src/runtime/proxy.js')

    await expect(handleBSanityProxyEvent({ data: data as never, headers: {} }, config)).rejects.toThrow(BSanityError)
  })
})

function emitProcessResult(command: string, child: SpawnedProcess): void {
  switch (command) {
    case 'timeout':
      return
    case 'unsupported':
      child.stdout.emit('data', Buffer.from('UNKNOWN'))
      child.emit('close', 3)
      return
    case 'empty':
      child.emit('close', 0)
      return
    case 'attention':
      child.stdout.emit('data', Buffer.from('ATTENTION - review'))
      child.emit('close', 1)
      return
    case 'malformed':
      child.stdout.emit('data', Buffer.from('MALFORMED - input'))
      child.emit('close', 2)
      return
    case 'internal':
      child.stdout.emit('data', Buffer.from('INTERNAL_ERROR - failed'))
      child.emit('close', 64)
      return
    default:
      child.stdout.emit('data', Buffer.from('GROUNDED - proceed'))
      child.emit('close', 0)
  }
}
