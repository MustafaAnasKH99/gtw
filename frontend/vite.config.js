import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Only used when VITE_API_BASE_URL is unset, i.e. running against the local
  // Express server. In production VITE_API_BASE_URL points at
  // https://<ref>.supabase.co/functions/v1 and these paths are the function names.
  server: {
    proxy: {
      '/new-game': 'http://localhost:3000',
      '/guess': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
      '/viz-ranks': 'http://localhost:3000',
    },
  },
})
