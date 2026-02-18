import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
server: {
  proxy: {
    "/api/identity": {
      target: "https://TU-LAMBDA-URL.on.aws",
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/identity/, ""),
    },
  },
},

});
