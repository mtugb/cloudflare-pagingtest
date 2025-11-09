import { resolve } from 'path'
import { defineConfig } from 'vite'

const rootDir = resolve(__dirname, 'src')

export default defineConfig({
	root: rootDir,
    server: {
    proxy: {
      '/api': 'http://localhost:8788' // ← Pages Functions へ転送
    }
  }
})