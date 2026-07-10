import { useRef } from 'react'

interface Props {
  /** Dipanggil setelah klik ikon 3× cepat — membuka login page untuk admin */
  onAdminAccess?: () => void
}

export default function MaintenanceScreen({ onAdminAccess }: Props) {
  const tapCount = useRef(0)
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleIconClick = () => {
    tapCount.current += 1
    if (tapTimer.current) clearTimeout(tapTimer.current)

    if (tapCount.current >= 3) {
      tapCount.current = 0
      onAdminAccess?.()
      return
    }

    // Reset counter kalau tidak ada tap lagi dalam 1.5 detik
    tapTimer.current = setTimeout(() => { tapCount.current = 0 }, 1500)
  }

  return (
    <div style={{
      minHeight: '100dvh',
      backgroundColor: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
      fontFamily: 'inherit',
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: 420,
        width: '100%',
      }}>
        {/* Icon — klik 3× untuk akses admin */}
        <div
          onClick={handleIconClick}
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            backgroundColor: 'rgba(26,111,232,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            cursor: 'default',
            userSelect: 'none',
          }}
        >
          <svg width="32" height="32" fill="none" stroke="var(--blue)" strokeWidth="1.6" viewBox="0 0 24 24">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
        </div>

        {/* Heading */}
        <h1 style={{
          fontSize: 22,
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.03em',
          margin: '0 0 12px',
          lineHeight: 1.25,
        }}>
          Sistem Sedang Diperbarui
        </h1>

        {/* Body */}
        <p style={{
          fontSize: 14.5,
          color: 'var(--text-secondary)',
          lineHeight: 1.65,
          margin: '0 0 28px',
        }}>
          Dashboard sementara tidak dapat diakses untuk keperluan pemeliharaan.
          Silakan coba kembali dalam beberapa menit.
        </p>

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '0 0 20px' }} />

        {/* Footer note */}
        <p style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          margin: 0,
        }}>
          Dashboard Sarpras — Madrasah Al Fatih
        </p>
      </div>
    </div>
  )
}
