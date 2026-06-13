export type BSanityErrorCode =
  | 'proxy-unreachable'
  | 'proxy-invalid-exit-code'
  | 'proxy-missing-marker'
  | 'substrate-gate-bypass-detected'
  | 'client-version-mismatch'
  | 'document-action-handler-failed'
  | 'structure-panel-mount-failed'
  | 'config-malformed'
  | 'directive-write-failed'
  | 'jwt-auth-failed'
  | 'fanout-budget-exceeded'

interface BSanityErrorInput {
  code: BSanityErrorCode
  message: string
  cause?: unknown
}

export class BSanityError extends Error {
  readonly code: BSanityErrorCode
  override readonly cause?: unknown

  constructor(input: BSanityErrorInput) {
    super(input.message)
    this.name = 'BSanityError'
    this.code = input.code
    this.cause = input.cause
  }
}
