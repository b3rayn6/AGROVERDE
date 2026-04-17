import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Optimizaciones para Vercel
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'supabase': ['@supabase/supabase-js'],
          'ui-vendor': ['lucide-react', 'framer-motion'],
        },
      },
    },
    // Reducir el tamaño del bundle
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Eliminar console.logs en producción
      },
    },
  },
  server: {
    historyApiFallback: true,
    host: '0.0.0.0',
    port: 3000,
    hmr: {
      clientPort: 3000,
    },
    allowedHosts: ['.e2b.app', '.e2b.dev'],
  },
})
