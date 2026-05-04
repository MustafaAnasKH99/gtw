import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/new-game': 'http://localhost:3000',
      '/guess': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
    },
  },
})
