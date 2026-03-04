import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

const MARKETING_LAMBDA = "https://yea4yna7pn626f4bmw6w5cnwdm0tuvgr.lambda-url.us-east-1.on.aws"

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      "/api/identity": {
        target: "https://bjqd53qndxvche2oljwdzvf6z40zwojf.lambda-url.us-east-1.on.aws",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/identity/, ""),
      },
      "/api/catalog-products": {
        target: "https://4hwgeresndp2ot6b4jb47f6imq0iqdwq.lambda-url.us-east-1.on.aws",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/catalog-products/, ""),
      },
      // Un solo proxy para toda la Lambda marketing
      "/api/marketing": {
        target: MARKETING_LAMBDA,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/marketing/, ""),
      },
    },
  },
})