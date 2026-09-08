import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    // Mirror the tsconfig path alias so tests import modules exactly as the app does.
    alias: { '@': resolve(__dirname, '.') },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
})
