import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use relative base path so it works on any subfolder (GitHub Pages) 
  // without needing to specify the exact repo name.
  base: './', 
})
