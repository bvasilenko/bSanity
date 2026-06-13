import { BSanityError } from '../errors.js'
import { binaryNames, defaultDirectiveField, defaultMarkerStyle, type BinaryName, type BSanityConfig, type ResolvedBSanityConfig } from './types.js'

const fieldNamePattern = /^[A-Za-z_][A-Za-z0-9_]*$/u

export function normalizeConfig(config: BSanityConfig): ResolvedBSanityConfig {
  if (!isRecord(config)) {
    throwMalformed('Config must be an object.')
  }

  const documentTypes = normalizeDocumentTypes(config.documentTypes)
  const binaries = normalizeBinaries(config.binaries)
  const directiveField = normalizeDirectiveField(config.directiveField ?? defaultDirectiveField)
  const proxyEndpoint = normalizeProxyEndpoint(config.proxyEndpoint)
  const markerStyle = config.markerStyle ?? defaultMarkerStyle

  if (markerStyle !== 'sentinel' && markerStyle !== 'json-tail') {
    throwMalformed('markerStyle must be sentinel or json-tail.')
  }

  const resolved: ResolvedBSanityConfig = {
    documentTypes,
    binaries,
    directiveField,
    markerStyle,
    proxyEndpoint
  }

  if (config.cycleToken !== undefined) {
    if (typeof config.cycleToken !== 'string' || config.cycleToken.length === 0) {
      throwMalformed('cycleToken must be a non-empty string when supplied.')
    }

    return { ...resolved, cycleToken: config.cycleToken }
  }

  return resolved
}

function normalizeDocumentTypes(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throwMalformed('documentTypes must contain at least one document type.')
  }

  const unique = new Set<string>()

  for (const item of value) {
    if (typeof item !== 'string' || item.trim().length === 0) {
      throwMalformed('documentTypes entries must be non-empty strings.')
    }

    unique.add(item.trim())
  }

  return [...unique]
}

function normalizeBinaries(value: unknown): Readonly<Record<BinaryName, boolean>> {
  if (!isRecord(value)) {
    throwMalformed('binaries must be an object.')
  }

  const normalized = Object.fromEntries(binaryNames.map((name) => [name, value[name] === true])) as Record<BinaryName, boolean>

  if (!Object.values(normalized).some(Boolean)) {
    throwMalformed('At least one binary must be enabled.')
  }

  return normalized
}

function normalizeDirectiveField(value: unknown): string {
  if (typeof value !== 'string' || !fieldNamePattern.test(value)) {
    throwMalformed('directiveField must be a valid Sanity field name.')
  }

  return value
}

function normalizeProxyEndpoint(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    throwMalformed('proxyEndpoint must be a non-empty URL string.')
  }

  try {
    return new URL(value).toString()
  } catch (cause) {
    throw new BSanityError({ code: 'config-malformed', message: 'proxyEndpoint must be an absolute URL.', cause })
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function throwMalformed(message: string): never {
  throw new BSanityError({ code: 'config-malformed', message })
}
