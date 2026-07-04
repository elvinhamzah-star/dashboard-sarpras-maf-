import { useEffect, useState } from 'react'

function FileIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  )
}

function extractDriveFileId(url: string): string | null {
  const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (m1) return m1[1]
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (m2) return m2[1]
  return null
}

export default function PdfViewerModal({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  const [iframeLoaded, setIframeLoaded] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const sheetMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  const driveOpenUrl = sheetMatch
    ? `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}`
    : url.replace('/preview', '/view')

  const fileId = extractDriveFileId(url)
  const downloadUrl = sheetMatch
    ? `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/export?format=pdf`
    : fileId
      ? `https://drive.google.com/uc?export=download&id=${fileId}`
      : driveOpenUrl

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        backgroundColor: 'rgba(0,0,0,0.78)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px 16px',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 1060,
        display: 'flex', flexDirection: 'column',
        backgroundColor: 'var(--bg)',
        borderRadius: 18,
        overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)',
        maxHeight: '92vh',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--card)', gap: 12, flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <FileIcon color="var(--blue)" size={16} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {name}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {/* Download button */}
            <a
              href={downloadUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              title="Unduh"
              style={{
                width: 32, height: 32, borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg)', color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                textDecoration: 'none', flexShrink: 0,
              }}
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M12 3v13M7 11l5 5 5-5"/>
                <path d="M5 20h14"/>
              </svg>
            </a>
            {/* Buka di Drive */}
            <a
              href={driveOpenUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 12, fontWeight: 600, color: 'var(--blue)',
                backgroundColor: 'rgba(26,111,232,0.08)',
                border: '1px solid rgba(26,111,232,0.18)',
                borderRadius: 7, padding: '5px 11px', textDecoration: 'none',
              }}
            >
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              Buka di Drive
            </a>
            {/* Close */}
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg)', color: 'var(--text-muted)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, lineHeight: 1, fontFamily: 'inherit',
              }}
            >×</button>
          </div>
        </div>
        {/* iframe area */}
        <div style={{
          flex: 1, minHeight: 0,
          backgroundColor: '#dde1e8',
          padding: '14px 16px 16px',
          overflowX: 'hidden', overflowY: 'hidden',
          position: 'relative', display: 'flex', flexDirection: 'column',
        }}>
          {!iframeLoaded && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 12, backgroundColor: '#dde1e8', zIndex: 2,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                border: '3px solid rgba(0,0,0,0.12)', borderTopColor: 'var(--blue)',
                animation: 'spin 0.8s linear infinite',
              }} />
              <span style={{ fontSize: 13, color: '#666' }}>Memuat dokumen...</span>
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
          )}
          <div style={{
            flex: 1, borderRadius: 10, overflow: 'hidden',
            boxShadow: '0 6px 28px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.06)',
            opacity: iframeLoaded ? 1 : 0, transition: 'opacity 0.25s ease',
          }}>
            <iframe
              src={url}
              style={{ width: '100%', height: 'calc(92vh - 112px)', border: 'none', display: 'block' }}
              allow="autoplay"
              title={name}
              onLoad={() => setIframeLoaded(true)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
