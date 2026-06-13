import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'runtime/proxy': 'src/runtime/proxy.ts',
    'functions/b-sanity-binary-proxy': 'functions/b-sanity-binary-proxy.ts'
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', 'sanity', '@sanity/functions']
})
