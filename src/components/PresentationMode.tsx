/**
 * PresentationMode.tsx
 *
 * Fullscreen presentation overlay — embeds the 14-slide executive deck
 * from /presentation-mode-preview.html as a self-contained iframe.
 *
 * Close options:
 *  • Click the × button (top-right overlay)
 *  • Press Esc (postMessage bridge from iframe → parent)
 */

import { useEffect } from 'react'
import { Z_ALERT_OVERLAY, Z_PRESENTATION_CONTROLS } from '../lib/zIndex'

interface Props {
  onClose: () => void
}

export default function PresentationMode({ onClose }: Props) {
  useEffect(() => {
    // Receive Esc from inside the iframe
    const handleMessage = (e: MessageEvent) => {
      if (e.data === 'close-presentation') onClose()
    }
    window.addEventListener('message', handleMessage)

    // Also handle Esc when focus stays on parent window
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)

    // Prevent body scroll while presentation is open
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('message', handleMessage)
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: Z_ALERT_OVERLAY,
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* The presentation deck */}
      <iframe
        src="/presentation-mode-preview.html"
        title="Presentasi Sarpras MAF"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        allowFullScreen
      />

      {/* Close button — always accessible above the iframe */}
      <button
        onClick={onClose}
        title="Tutup Presentasi (Esc)"
        style={{
          position: 'absolute',
          top: 16,
          right: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 14px',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 8,
          color: 'rgba(255,255,255,0.7)',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          letterSpacing: '-0.01em',
          transition: 'all 0.15s',
          zIndex: Z_PRESENTATION_CONTROLS,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.16)'
          e.currentTarget.style.color = '#fff'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
          e.currentTarget.style.color = 'rgba(255,255,255,0.7)'
        }}
      >
        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
        Tutup
      </button>
    </div>
  )
}
