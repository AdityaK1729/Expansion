import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANT: Replace 'REPO_NAME' with your actual GitHub repository name
  // Example: If your repo is github.com/username/my-game, this should be '/my-game/'
  base: '/Expansion/', 
})
