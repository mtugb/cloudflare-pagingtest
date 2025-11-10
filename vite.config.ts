import { resolve } from 'path'
import { defineConfig } from 'vite'

const rootDir = resolve(__dirname, 'src')

export default defineConfig({
	root: rootDir,
    server: {
    proxy: {
      '/api': 'http://localhost:8788' // ← Pages Functions へ転送
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        login: resolve(__dirname, 'src/login/index.html'),
        app: resolve(__dirname, 'src/app/index.html'),
        registerStep1: resolve(__dirname, 'src/register/step1/index.html'),
        registerStep2: resolve(__dirname, 'src/register/step2/index.html'),
        registerStep3: resolve(__dirname, 'src/register/step3/index.html'),
        registerComplete: resolve(__dirname, 'src/register/complete/index.html'),
      }
    },
    outDir: "../dist"//こいつ！！！！！！！！！！！！！！！！！！！！！
  }
})