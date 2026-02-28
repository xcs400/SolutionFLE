import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Utilise des chemins absolus pour le routage SPA
  server: {
    allowedHosts: [
      'alinefle.duckdns.org',
      '.duckdns.org',
      'solutionfle.cloudflareaccess.com',
      '.cloudflareaccess.com'
    ]
  }
})
