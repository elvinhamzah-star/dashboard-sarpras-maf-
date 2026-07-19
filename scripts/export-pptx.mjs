/**
 * export-pptx.mjs
 * Screenshots each slide of the HTML presentation at 1920×1080,
 * then assembles them into a PPTX file using pptxgenjs.
 *
 * Usage:  node scripts/export-pptx.mjs
 * Output: public/Laporan-Sarpras-MAF-Juli2026.pptx
 */

import { chromium } from 'playwright'
import PptxGenJS from 'pptxgenjs'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const TMP_DIR = path.join(ROOT, 'tmp-slides')
const OUT_FILE = path.join(ROOT, 'public', 'Laporan-Sarpras-MAF-Juli2026.pptx')
const URL = 'http://localhost:5173/presentation-mode-preview.html'
const N_SLIDES = 15

// ── 1. Screenshot every slide ─────────────────────────────────────────────────
async function screenshotSlides() {
  fs.mkdirSync(TMP_DIR, { recursive: true })

  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Users/mac/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  })
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto(URL, { waitUntil: 'networkidle' })

  // Wait for the stage to render
  await page.waitForSelector('#stage', { timeout: 15000 })
  await page.waitForTimeout(1500) // let fonts/animations settle

  const paths = []

  for (let i = 0; i < N_SLIDES; i++) {
    if (i > 0) {
      // Click "next" button
      await page.locator('button').last().click()
      await page.waitForTimeout(400) // wait for transition
    }

    // Screenshot just the stage element for a clean 16:9 capture
    const stage = page.locator('#stage')
    const imgPath = path.join(TMP_DIR, `slide-${String(i + 1).padStart(2, '0')}.png`)
    await stage.screenshot({ path: imgPath, type: 'png' })
    paths.push(imgPath)
    console.log(`  ✓ Slide ${i + 1}/${N_SLIDES}`)
  }

  await browser.close()
  return paths
}

// ── 2. Assemble PPTX ──────────────────────────────────────────────────────────
async function buildPptx(imagePaths) {
  const pptx = new PptxGenJS()

  pptx.layout = 'LAYOUT_WIDE' // 13.33" × 7.5" — standard 16:9

  for (let i = 0; i < imagePaths.length; i++) {
    const slide = pptx.addSlide()
    slide.addImage({
      path: imagePaths[i],
      x: 0,
      y: 0,
      w: '100%',
      h: '100%',
      sizing: { type: 'contain', w: '100%', h: '100%' },
    })
  }

  await pptx.writeFile({ fileName: OUT_FILE })
  console.log(`\n✅ PPTX saved → ${OUT_FILE}`)
}

// ── 3. Cleanup ────────────────────────────────────────────────────────────────
function cleanup() {
  fs.rmSync(TMP_DIR, { recursive: true, force: true })
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('📸 Screenshotting slides…')
const imagePaths = await screenshotSlides()

console.log('\n📦 Building PPTX…')
await buildPptx(imagePaths)

cleanup()
console.log('🧹 Temp files cleaned up')
