import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { pdfPlugin } from './pdf-plugin.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), pdfPlugin()],
  // Rutas relativas: la versión web vive en bortrax25.github.io/blox/.
  base: './',
  // Puerto propio de blox (5173 lo usa otro proyecto).
  server: { port: 5317, strictPort: true },
})
