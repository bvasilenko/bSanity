import { DirectivePanel } from './DirectivePanel.js'

interface StructureBuilderLike {
  defaults?: () => unknown
  list?: () => ListBuilderLike
  listItem?: () => ListItemBuilderLike
  component?: (component: unknown) => ComponentBuilderLike
  divider?: () => unknown
}

interface ListBuilderLike {
  title: (title: string) => ListBuilderLike
  items: (items: unknown[]) => unknown
}

interface ListItemBuilderLike {
  title: (title: string) => ListItemBuilderLike
  child: (child: unknown) => unknown
}

interface ComponentBuilderLike {
  title: (title: string) => unknown
}

export function createStructure(S: StructureBuilderLike): unknown {
  const defaults = S.defaults?.()

  if (!S.list || !S.listItem || !S.component) {
    return defaults
  }

  const items = Array.isArray(defaults) ? defaults : [defaults].filter(Boolean)
  const directiveItem = S.listItem().title('b-suite directives').child(S.component(DirectivePanel).title('Directive panel'))

  return S.list().title('Content').items(S.divider ? [...items, S.divider(), directiveItem] : [...items, directiveItem])
}
