import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import json from '@rollup/plugin-json';
import { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(),json()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
