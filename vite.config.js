import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const commitSha = (process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT || 'local').slice(0, 7)
const buildDate = new Date().toLocaleDateString('en-GB')

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_SHA__: JSON.stringify(commitSha),
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Isolate jsPDF + html2canvas and all their transitive deps into one chunk.
          // This prevents Rollup TDZ errors caused by their internal circular ES-module deps.
          if (
            id.includes('jspdf') ||
            id.includes('html2canvas') ||
            id.includes('canvg') ||
            id.includes('fflate') ||
            id.includes('dompurify') ||
            id.includes('@fontsource')
          ) {
            return 'pdf-vendor'
          }
        },
      },
    },
  },
})

