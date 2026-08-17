import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Standalone web build of the renderer, for the Capacitor (Android/iOS) target.
 * It reuses the exact same `src/renderer` app as the Electron build; the
 * platform abstraction (src/renderer/src/lib/platform) selects the web/mobile
 * implementation at runtime when the Electron bridge is absent.
 *
 * The Electron build (electron.vite.config.ts) is unchanged and independent.
 * Env vars are read from the project-root .env (same VITE_SUPABASE_* as desktop).
 */
export default defineConfig({
  root: resolve('src/renderer'),
  base: './',
  envDir: resolve('.'),
  resolve: {
    alias: {
      '@renderer': resolve('src/renderer/src'),
      '@shared': resolve('src/shared')
    }
  },
  plugins: [react()],
  build: {
    outDir: resolve('dist-web'),
    emptyOutDir: true
  }
})
