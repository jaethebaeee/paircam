import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable in production for security and performance
    // Optimize chunk splitting for better caching and SEO
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React vendor chunk
          'react-vendor': ['react', 'react-dom'],
          // Socket.io is large, separate it
          'socket-vendor': ['socket.io-client'],
          // Icons and UI components
          'ui-vendor': ['@heroicons/react', 'flowbite', 'flowbite-react'],
          // Utilities
          'utils': ['uuid', 'clsx', 'date-fns', 'axios'],
        },
      },
    },
    // Reduce chunk size warning limit for better performance
    chunkSizeWarningLimit: 500,
    // Enable minification with optimized settings
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: ['log', 'debug'], // Keep error/warn for production debugging
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug'],
        passes: 2, // Multiple passes for better compression
      },
      mangle: {
        safari10: true, // Support older Safari
      },
      format: {
        comments: false, // Remove all comments
      },
    },
  },
  // Optimize deps for faster dev server startup and better SEO
  optimizeDeps: {
    include: ['react', 'react-dom', 'socket.io-client', 'uuid'],
    exclude: ['@heroicons/react'], // Large icon library, load on demand
  },
});