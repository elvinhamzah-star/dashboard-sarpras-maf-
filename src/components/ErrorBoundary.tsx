import { Component, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean }

// Pola pesan error saat sebuah chunk (lazy import) gagal di-load — biasanya
// karena deploy baru menghapus hash chunk lama sementara client masih pakai
// index.html lama (service worker basi).
const CHUNK_ERR = /dynamically imported module|module script failed|Failed to fetch|Loading chunk|error loading dynamically/i

// Reload sekali otomatis, dengan anti-loop maksimal 1x per 10 detik supaya
// tidak muter kalau deploy benar-benar rusak.
export function reloadOnceGuarded() {
  const KEY = 'chunk-reload-ts'
  const last = Number(sessionStorage.getItem(KEY) || 0)
  if (Date.now() - last > 10000) {
    sessionStorage.setItem(KEY, String(Date.now()))
    window.location.reload()
  }
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    // Kalau ini error chunk basi → reload sekali otomatis.
    if (CHUNK_ERR.test(String(error?.message))) reloadOnceGuarded()
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
        padding: 24, textAlign: 'center', backgroundColor: 'var(--bg)',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(217,119,6,0.1)',
        }}>
          <svg width="26" height="26" fill="none" stroke="#B45309" strokeWidth="1.75" viewBox="0 0 24 24">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
          Ada yang tidak beres
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 300, lineHeight: 1.6 }}>
          Aplikasi mungkin baru diperbarui. Coba muat ulang untuk mengambil versi terbaru.
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: 4, padding: '10px 24px', borderRadius: 10, border: 'none',
            backgroundColor: 'var(--blue)', color: '#fff', fontSize: 14,
            fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Muat ulang
        </button>
      </div>
    )
  }
}
