// import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const outDir = process.env.BUILD_PATH
const base = process.env.BASE_URL || ''

// https://vitejs.dev/config/
export default defineConfig({
  base,
  build: {
    outDir,
  },
  plugins: [react()],
  define: {
    global: "window"
  }
  // optimizeDeps: {
  //   esbuildOptions: {
  //     define: {
  //       global: 'globalThis',
  //     },
  //     plugins: [
  //       NodeGlobalsPolyfillPlugin({
  //         buffer: true,
  //       })
  //     ]
  //   }
  // }
})
