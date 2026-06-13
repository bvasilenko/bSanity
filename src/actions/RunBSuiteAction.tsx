import type { DocumentActionComponent, DocumentActionDescription, SanityClient } from 'sanity'
import { useClient, useDocumentOperation } from 'sanity'
import type { ResolvedBSanityConfig } from '../config/types.js'
import type { DirectiveBundle, ProxyRequestPayload } from '../contracts/directive.js'
import { BSanityError } from '../errors.js'
import { parseDirectiveBundle } from './parseDirectiveBundle.js'

interface ActionProps {
  id: string
  type: string
  draft?: Record<string, unknown> | null
  published?: Record<string, unknown> | null
  onComplete?: () => void
}

export function createRunBSuiteAction(config: ResolvedBSanityConfig): DocumentActionComponent {
  return function RunBSuiteAction(props: ActionProps): DocumentActionDescription {
    const client = useClient({ apiVersion: '2025-02-19' }) as SanityClient
    const patch = useDocumentOperation(props.id, props.type).patch

    return {
      label: 'Run b-suite',
      disabled: !config.documentTypes.includes(props.type),
      onHandle: () => {
        void runAction({ config, props, client, patch })
      }
    }
  }
}

interface RunActionInput {
  config: ResolvedBSanityConfig
  props: ActionProps
  client: SanityClient
  patch: { execute: (operations: Array<{ set: Record<string, DirectiveBundle> }>) => void }
}

async function runAction(input: RunActionInput): Promise<void> {
  const document = input.props.draft ?? input.props.published

  if (!document) {
    throw new BSanityError({ code: 'document-action-handler-failed', message: 'No draft or published document is available.' })
  }

  if (!input.config.documentTypes.includes(input.props.type)) {
    throw new BSanityError({ code: 'document-action-handler-failed', message: `Document type ${input.props.type} is not enabled.` })
  }

  const bundle = await requestDirectiveBundle(input.config, input.client, document)

  try {
    input.patch.execute([{ set: { [input.config.directiveField]: bundle } }])
    input.props.onComplete?.()
  } catch (cause) {
    throw new BSanityError({ code: 'directive-write-failed', message: 'Failed to write directive bundle to the document.', cause })
  }
}

async function requestDirectiveBundle(
  config: ResolvedBSanityConfig,
  client: SanityClient,
  document: Record<string, unknown>
): Promise<DirectiveBundle> {
  const payload: ProxyRequestPayload = {
    documentJson: JSON.stringify(document),
    cycleId: createCycleId(),
    enabledBinaries: Object.entries(config.binaries)
      .filter(([, enabled]) => enabled)
      .map(([binary]) => binary as NonNullable<ProxyRequestPayload['enabledBinaries']>[number])
  }

  const headers: Record<string, string> = { 'content-type': 'application/json' }

  if (config.cycleToken !== undefined) {
    headers['x-bsuite-cycle-token'] = config.cycleToken
  }

  try {
    const body = await client.request<unknown>({
      uri: config.proxyEndpoint,
      method: 'POST',
      body: payload,
      headers
    })

    return parseDirectiveBundle(body)
  } catch (cause) {
    throw new BSanityError({ code: 'proxy-unreachable', message: 'Proxy request failed.', cause })
  }
}

function createCycleId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

