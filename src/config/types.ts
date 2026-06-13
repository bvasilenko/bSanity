export const binaryNames = ['bground', 'banchor', 'bsmell', 'bratch', 'bwatch', 'bspector'] as const

export type BinaryName = (typeof binaryNames)[number]

export type MarkerStyle = 'sentinel' | 'json-tail'

export type BinarySelection = Partial<Record<BinaryName, boolean>>

export interface BSanityConfig {
  documentTypes: string[]
  binaries: BinarySelection
  directiveField?: string
  markerStyle?: MarkerStyle
  proxyEndpoint: string
  cycleToken?: string
}

export interface ResolvedBSanityConfig {
  documentTypes: readonly string[]
  binaries: Readonly<Record<BinaryName, boolean>>
  directiveField: string
  markerStyle: MarkerStyle
  proxyEndpoint: string
  cycleToken?: string
}

export const defaultDirectiveField = 'bsuiteDirective'
export const defaultMarkerStyle: MarkerStyle = 'sentinel'
