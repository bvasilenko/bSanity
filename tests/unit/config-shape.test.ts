import { describe, expect, it } from 'vitest'
import { normalizeConfig } from '../../src/config/normalizeConfig.js'
import { BSanityError } from '../../src/errors.js'

const validBaseConfig = {
  documentTypes: ['article'],
  binaries: { bground: true },
  proxyEndpoint: 'https://example.com/proxy'
}

describe('normalizeConfig', () => {
  it('deduplicates document types and applies defaults', () => {
    const config = normalizeConfig({ ...validBaseConfig, documentTypes: ['article', 'article'] })

    expect(config).toMatchObject({
      documentTypes: ['article'],
      directiveField: 'bsuiteDirective',
      markerStyle: 'sentinel',
      proxyEndpoint: 'https://example.com/proxy'
    })
    expect(config.binaries).toMatchObject({ bground: true, banchor: false, bsmell: false, bratch: false, bwatch: false, bspector: false })
  })

  it('preserves explicit optional settings', () => {
    const config = normalizeConfig({
      ...validBaseConfig,
      directiveField: 'customDirective',
      markerStyle: 'json-tail',
      cycleToken: 'token'
    })

    expect(config.directiveField).toBe('customDirective')
    expect(config.markerStyle).toBe('json-tail')
    expect(config.cycleToken).toBe('token')
  })

  it.each([
    ['empty document type list', { ...validBaseConfig, documentTypes: [] }],
    ['blank document type', { ...validBaseConfig, documentTypes: [''] }],
    ['no enabled binaries', { ...validBaseConfig, binaries: {} }],
    ['invalid directive field', { ...validBaseConfig, directiveField: 'bad-field' }],
    ['invalid marker style', { ...validBaseConfig, markerStyle: 'loose' }],
    ['relative proxy endpoint', { ...validBaseConfig, proxyEndpoint: '/proxy' }],
    ['empty cycle token', { ...validBaseConfig, cycleToken: '' }]
  ])('rejects %s', (_label, config) => {
    expect(() => normalizeConfig(config as Parameters<typeof normalizeConfig>[0])).toThrow(BSanityError)
  })
})
