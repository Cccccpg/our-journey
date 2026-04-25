import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/photos': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (id.includes('echarts') || id.includes('zrender')) {
            return 'map-vendor'
          }

          if (id.includes('vue') || id.includes('pinia')) {
            return 'framework'
          }

          if (id.includes('axios')) {
            return 'network'
          }
        }
      }
    }
  }
})
