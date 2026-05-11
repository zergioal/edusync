import { defineConfig } from 'tsup'

export default defineConfig({
  entry:      ['src/index.ts'],
  format:     ['cjs'],
  outDir:     'dist',
  target:     'node20',
  // Workspace packages se incluyen inline en el bundle
  noExternal: [/^@edusync\//],
  // Libs con binarios nativos quedan como require() externo
  external:   ['@prisma/client', 'puppeteer', 'puppeteer-core'],
  clean:      true,
  sourcemap:  false,
})
