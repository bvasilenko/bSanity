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
