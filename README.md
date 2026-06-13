# @booga/bsanity

Your content team writes in Sanity Studio: marketing pages, product descriptions, regulated copy. They use AI assistants in the studio to draft. With bSanity installed, the same discipline checks that protect your engineers run on those drafts. A custom Document Action posts the working document to a Sanity Document Function proxy; the b-* tools fire in Node runtime: bground verifies factual claims against cited evidence, bsmell flags hedged or unsupported language, banchor checks alignment to the brief. Verdicts return into a structure-builder panel next to the document: no leaving the studio, no fact-check ping-pong, no after-the-fact retraction.


Sanity v3 plugin embedding the b-suite discipline runtime into the Studio authoring UI.

## Install

```bash
pnpm add @booga/bsanity sanity react react-dom
```

## Studio usage

```ts
// sanity.config.ts
import { defineConfig } from 'sanity'
import { bSanity } from '@booga/bsanity'

export default defineConfig({
  name: 'default',
  title: 'Studio',
  projectId: 'project-id',
  dataset: 'production',
  plugins: [
    bSanity({
      documentTypes: ['article'],
      binaries: { bground: true, banchor: true, bsmell: true },
      proxyEndpoint: 'https://example.com/b-sanity-binary-proxy',
      cycleToken: process.env.SANITY_STUDIO_BSANITY_CYCLE_TOKEN
    })
  ],
  schema: { types: [] }
})
```

## Function deployment

Current Sanity Function projects use a blueprint file for deployment resources.

```ts
// sanity.blueprint.ts
import { defineBlueprint, defineDocumentFunction } from '@sanity/blueprints'

export default defineBlueprint({
  resources: [
    defineDocumentFunction({
      name: 'b-sanity-binary-proxy',
      src: './functions/b-sanity-binary-proxy.ts',
      event: { on: ['publish'] }
    })
  ]
})
```

The exported proxy handler also works in another Node HTTP runtime when the request body matches this shape:

```json
{
  "documentJson": "{\"_type\":\"article\"}",
  "cycleId": "01J00000000000000000000000",
  "enabledBinaries": ["bground", "banchor"]
}
```

## License

MIT
