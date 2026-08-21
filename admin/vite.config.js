import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/admin/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Lets you write `@/components/...` instead of `../../components/...`
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 5174,
    // Allow any host in dev so the preview tunnel (e2b/ngrok) can reach Vite.
    allowedHosts: true,

    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        configure(proxy) {
          // Drop the Origin header so the API treats dev-proxied requests as
          // server-to-server (its CORS allowlist is for the real origins only).
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin')
          })
        },
      },

      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})

