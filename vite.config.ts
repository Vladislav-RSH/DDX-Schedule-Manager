import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves the project from a repository subpath.
  // Tatnet and local builds serve it from the domain root.
  base: process.env.GITHUB_ACTIONS === 'true' ? '/DDX-Schedule-Manager/' : '/',
  plugins: [
    react(),
    tailwindcss(),
  ],
})
