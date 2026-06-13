import { definePlugin } from 'sanity'
import { createRunBSuiteAction } from './actions/RunBSuiteAction.js'
import { normalizeConfig } from './config/normalizeConfig.js'
import type { BSanityConfig, BinaryName, MarkerStyle, ResolvedBSanityConfig } from './config/types.js'
import { bsuiteDirective } from './schema/bsuiteDirective.js'
import { createStructure } from './structure/createStructure.js'

export type { BSanityConfig, BinaryName, MarkerStyle, ResolvedBSanityConfig }
export { normalizeConfig } from './config/normalizeConfig.js'
export { BSanityError, type BSanityErrorCode } from './errors.js'
export type { DirectiveBundle, PerBinaryDirective, ProxyRequestPayload, SupportedExitCode } from './contracts/directive.js'
export { bsuiteDirective } from './schema/bsuiteDirective.js'
export { createRunBSuiteAction } from './actions/RunBSuiteAction.js'
export { DirectivePanel } from './structure/DirectivePanel.js'

export function bSanity(config: BSanityConfig): ReturnType<typeof definePlugin> {
  const resolvedConfig = normalizeConfig(config)
  const pluginOptions = {
    name: '@booga/bsanity',
    schema: {
      types: [bsuiteDirective]
    },
    document: {
      actions: (previousActions: unknown[], context: { schemaType: string }) => {
        if (!resolvedConfig.documentTypes.includes(context.schemaType)) {
          return previousActions
        }

        return [...previousActions, createRunBSuiteAction(resolvedConfig)]
      }
    },
    structure: (S: Parameters<typeof createStructure>[0]) => createStructure(S)
  }

  return definePlugin(pluginOptions as unknown as Parameters<typeof definePlugin>[0])
}
