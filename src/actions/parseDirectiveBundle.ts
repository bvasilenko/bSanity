import type { DirectiveBundle } from '../contracts/directive.js'
import { BSanityError } from '../errors.js'

export function parseDirectiveBundle(value: unknown): DirectiveBundle {
  if (!isRecord(value)) {
    throw new BSanityError({ code: 'proxy-missing-marker', message: 'Proxy response must be an object.' })
  }

  if (typeof value.cycleId !== 'string' || typeof value.contextTag !== 'string' || typeof value.directive !== 'string') {
    throw new BSanityError({ code: 'proxy-missing-marker', message: 'Proxy response is missing directive marker fields.' })
  }

  if (!Array.isArray(value.perBinary) || typeof value.corpusProvenance !== 'string') {
    throw new BSanityError({ code: 'proxy-missing-marker', message: 'Proxy response is missing per-binary results.' })
  }

  return value as unknown as DirectiveBundle
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
