import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ErrorBoundary, { reloadOnceGuarded } from './components/ErrorBoundary.tsx'

// Vite memancarkan event ini saat sebuah chunk lazy gagal di-load (deploy baru
// menghapus hash chunk lama sementara client masih pakai index.html lama).
// Jaring pertama: reload sekali untuk ambil index + chunk terbaru.
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault()
  reloadOnceGuarded()
})

// ── Service worker: auto-refresh saat versi baru aktif ────────────────────────
// registerType:'autoUpdate' + skipWaiting bikin SW baru langsung ambil alih,
// TAPI tab yang sudah terbuka tetap jalanin JS lama sampai di-reload. Akibatnya
// user "nyangkut" di bundle lama (yang hash-nya sudah dihapus dari server → 404,
// fitur/fix baru tak muncul). Reload sekali begitu SW baru memegang kendali.
// hadController: skip reload di kunjungan perdana (belum ada SW → baru install),
// hanya reload saat benar-benar UPGRADE versi. refreshing: cegah reload loop.
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing || !hadController) return
    refreshing = true
    window.location.reload()
  })
}

// ── iOS input zoom prevention ─────────────────────────────────────────────────
// iOS Safari zooms in when an input with font-size < 16px gets focus.
// We temporarily lock scale while the input is focused, then restore it —
// so user can still pinch-zoom the rest of the app normally.
const vpMeta = document.querySelector<HTMLMetaElement>('meta[name=viewport]')
if (vpMeta) {
  const NORMAL  = 'width=device-width, initial-scale=1'
  const NO_ZOOM = 'width=device-width, initial-scale=1, maximum-scale=1'
  document.addEventListener('focusin', e => {
    const tag = (e.target as HTMLElement).tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT')
      vpMeta.setAttribute('content', NO_ZOOM)
  })
  document.addEventListener('focusout', () => {
    vpMeta.setAttribute('content', NORMAL)
  })
}
// ─────────────────────────────────────────────────────────────────────────────

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
