import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Listen on all interfaces so the app is reachable from a browser (and
    // from the sandbox's live-preview host), not just localhost.
    host: '0.0.0.0',
    // Allow any preview/host header in dev. `true` disables the host check.
    allowedHosts: true,
    // In development the browser calls relative `/api/...` URLs and Vite
    // proxies them to the Express backend, so the storefront never needs to
    // know (or reach) the API's internal address.
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
