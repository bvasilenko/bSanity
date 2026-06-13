import type { DocumentActionProps, SanityDocument } from 'sanity'
import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRunBSuiteAction } from '../../src/actions/RunBSuiteAction.js'
import { parseDirectiveBundle } from '../../src/actions/parseDirectiveBundle.js'
import type { ResolvedBSanityConfig } from '../../src/config/types.js'
import { BSanityError } from '../../src/errors.js'

const patchExecute = vi.fn()
const request = vi.fn()
const onComplete = vi.fn()

vi.mock('sanity', () => ({
  useClient: () => ({ request }),
  useDocumentOperation: () => ({
    patch: { execute: patchExecute }
  })
}))

const draftDocument = createDocument('drafts.a', 'article')
const publishedDocument = createDocument('a', 'article')

const config: ResolvedBSanityConfig = {
  documentTypes: ['article'],
  binaries: { bground: true, banchor: true, bsmell: false, bratch: false, bwatch: false, bspector: false },
  directiveField: 'customDirective',
  markerStyle: 'sentinel',
  proxyEndpoint: 'https://example.com/proxy',
  cycleToken: 'cycle-token'
}

const directiveBundle = {
  cycleId: 'cycle-1',
  contextTag: 'host:sanity-v3',
  directive: 'GROUNDED - proceed',
  perBinary: [{ binary: 'bground', exitCode: 0, verdict: 'passed', directive: 'GROUNDED - proceed' }],
  corpusProvenance: 'unavailable at adapter layer'
}

describe('createRunBSuiteAction', () => {
  beforeEach(() => {
    patchExecute.mockReset()
    request.mockReset()
    onComplete.mockReset()
  })

  it('disables the action outside the configured document type allowlist', () => {
    const description = createRunBSuiteAction(config)(createProps({ type: 'product', draft: draftDocument }))

    expect(description?.label).toBe('Run b-suite')
    expect(description?.disabled).toBe(true)
  })

  it.each([
    ['draft document', { draft: draftDocument, published: null }],
    ['published document fallback', { draft: null, published: publishedDocument }]
  ])('persists a directive bundle for %s without replacing other document data', async (_label, documentState) => {
    request.mockResolvedValueOnce(directiveBundle)
    const description = createRunBSuiteAction(config)(createProps(documentState))

    description?.onHandle?.()

    await waitFor(() => expect(patchExecute).toHaveBeenCalledWith([{ set: { customDirective: directiveBundle } }]))
    expect(onComplete).toHaveBeenCalledOnce()
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        uri: 'https://example.com/proxy',
        method: 'POST',
        headers: expect.objectContaining({ 'x-bsuite-cycle-token': 'cycle-token' }),
        body: expect.objectContaining({ enabledBinaries: ['bground', 'banchor'] })
      })
    )
  })

  it.each([null, {}, { cycleId: 'cycle-1', contextTag: 'host:sanity-v3', directive: 'text' }])('rejects malformed proxy responses', (value) => {
    expect(() => parseDirectiveBundle(value)).toThrow(BSanityError)
  })
})

function createDocument(id: string, type: string): SanityDocument {
  return { _id: id, _type: type, _createdAt: '2026-06-13T00:00:00Z', _updatedAt: '2026-06-13T00:00:00Z', _rev: 'rev' }
}

function createProps(overrides: Partial<DocumentActionProps>): DocumentActionProps {
  return { id: 'drafts.a', type: 'article', draft: draftDocument, published: null, onComplete, ...overrides } as unknown as DocumentActionProps
}
