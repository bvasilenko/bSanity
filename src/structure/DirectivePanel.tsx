import React from 'react'
import ReactMarkdown from 'react-markdown'
import type { DirectiveBundle } from '../contracts/directive.js'

interface DirectivePanelProps {
  directive?: DirectiveBundle | null
}

export function DirectivePanel({ directive }: DirectivePanelProps): React.JSX.Element {
  if (!directive) {
    return <section data-testid="bsanity-directive-panel">No directive bundle has been written yet.</section>
  }

  return (
    <section data-testid="bsanity-directive-panel">
      <h2>b-suite directive</h2>
      <ReactMarkdown>{directive.directive}</ReactMarkdown>
      <dl>
        <dt>Cycle ID</dt>
        <dd>{directive.cycleId}</dd>
        <dt>Context</dt>
        <dd>{directive.contextTag}</dd>
      </dl>
      <ul>
        {directive.perBinary.map((result) => (
          <li key={result.binary}>
            <strong>{result.binary}</strong>: {result.verdict} ({result.exitCode})
          </li>
        ))}
      </ul>
    </section>
  )
}
