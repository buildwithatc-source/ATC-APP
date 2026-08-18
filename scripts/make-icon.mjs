// Compose Android app-icon source images from the ATC logo, then
// `npx capacitor-assets generate --android` turns them into every mipmap density.
// Foreground = logo centered inside the adaptive safe zone; background = white.
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const SIZE = 1024
const LOGO = 'src/renderer/src/assets/logo.png'
mkdirSync('assets', { recursive: true })

const white = { r: 255, g: 255, b: 255, alpha: 1 }
const clear = { r: 255, g: 255, b: 255, alpha: 0 }

// Keep the logo well inside the safe zone (~60% width) so masks never clip it.
const logo = await sharp(LOGO).resize({ width: 620 }).png().toBuffer()

async function canvas(bg, out) {
  await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: bg } })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(out)
}

await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: white } })
  .png()
  .toFile('assets/icon-background.png')
await canvas(clear, 'assets/icon-foreground.png')
await canvas(white, 'assets/icon-only.png')

console.log('Wrote assets/icon-foreground.png, icon-background.png, icon-only.png')
