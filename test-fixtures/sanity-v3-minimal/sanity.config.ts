import { defineConfig } from 'sanity'
import { bSanity } from '@booga/bsanity'
import { article } from './schemas/article'

export default defineConfig({
  name: 'default',
  title: 'Minimal bSanity fixture',
  projectId: 'project-id',
  dataset: 'production',
  plugins: [
    bSanity({
      documentTypes: ['article'],
      binaries: { bground: true },
      proxyEndpoint: 'https://example.com/b-sanity-binary-proxy'
    })
  ],
  schema: { types: [article] }
})
