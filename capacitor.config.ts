import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Capacitor wraps the standalone web build (`dist-web`, produced by
 * `npm run build:web`) into a native Android/iOS app. The Electron desktop
 * build is unaffected — both targets share the same `src/renderer` app.
 *
 * Next steps to produce an APK (require the Android SDK / Android Studio):
 *   npm run build:web
 *   npx cap add android      # one-time: generates the native android/ project
 *   npx cap sync android     # copy web assets + plugins into it
 *   npx cap open android      # build/run from Android Studio
 */
const config: CapacitorConfig = {
  appId: 'com.buildwithatc.atcledger',
  appName: 'ATC Ledger',
  webDir: 'dist-web'
}

export default config
