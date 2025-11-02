import { defineConfig } from 'vite'
import path from 'node:path'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': 'http://localhost:8080'
    },
    fs: { allow: ['..'] }
  },
  resolve: {
    preserveSymlinks: true,
    alias: {
      '@pkg/renderer': path.resolve(__dirname, '../../packages/renderer/src')
    }
  },
  optimizeDeps: {
    exclude: ['@pkg/renderer'],
    include: ['scheduler']
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      }
    }
  }
})


