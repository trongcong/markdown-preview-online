import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_REPOSITORY
    ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/`
    : '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/mermaid/') || id.includes('/cytoscape'))
            return 'vendor-mermaid'
          if (id.includes('/@codemirror/') || id.includes('/@uiw/react-codemirror') || id.includes('/@lezer/'))
            return 'vendor-editor'
          if (
            id.includes('/react-markdown/') || id.includes('/remark') ||
            id.includes('/rehype') || id.includes('/highlight.js/') ||
            id.includes('/unified/') || id.includes('/vfile') ||
            id.includes('/hast') || id.includes('/mdast')
          ) return 'vendor-markdown'
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/'))
            return 'vendor-react'
        },
      },
    },
  },
})
