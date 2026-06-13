import { describe, expect, it } from 'vitest'
import { bsuiteDirective } from '../../src/schema/bsuiteDirective.js'

describe('bsuiteDirective schema', () => {
  it('declares the closed directive fields in stable order', () => {
    expect(bsuiteDirective).toMatchObject({ name: 'bsuiteDirective', type: 'object' })
    expect(bsuiteDirective.fields?.map((field) => field.name)).toEqual([
      'cycleId',
      'contextTag',
      'directive',
      'perBinary',
      'corpusProvenance'
    ])
  })

  it('keeps per-binary verdicts restricted to binary, exitCode, and verdict fields', () => {
    const perBinaryField = bsuiteDirective.fields?.find((field) => field.name === 'perBinary') as ArrayFieldLike | undefined
    const verdictType = perBinaryField?.of?.[0]

    expect(verdictType?.type).toBe('object')
    expect(verdictType?.fields?.map((field) => field.name)).toEqual(['binary', 'exitCode', 'verdict'])
  })
})

interface ArrayFieldLike {
  of?: ObjectFieldLike[]
}

interface ObjectFieldLike {
  type?: string
  fields?: Array<{ name: string }>
}
