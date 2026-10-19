import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2020',
    minify: 'esbuild',
    // three.js is ~600 kB on its own; it ships in the lazy stage chunk, after first paint
    chunkSizeWarningLimit: 700,
    // the brand marks stay separate files, fetched only when shown, instead of
    // all 136 being inlined into a script that has to be downloaded and parsed
    assetsInlineLimit: (file) => (file.includes('/src/life/brands/') ? false : undefined),
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          gsap: ['gsap', '@gsap/react'],
        },
      },
    },
  },
})
