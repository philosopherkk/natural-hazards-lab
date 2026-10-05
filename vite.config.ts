import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 4321,
    strictPort: true,
    host: '127.0.0.1',
  },
  preview: {
    port: 4321,
    strictPort: true,
    host: '127.0.0.1',
  },
})
