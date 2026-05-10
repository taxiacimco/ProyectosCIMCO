import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    historyApiFallback: true, // 🛡️ Esto obliga a Vite a redirigir todo al index.html
  }
})