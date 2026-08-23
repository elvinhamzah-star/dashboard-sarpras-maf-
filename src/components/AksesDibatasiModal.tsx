import { Z_ALERT_OVERLAY } from '../lib/zIndex'

interface Props {
  onClose: () => void
}

/** Shown when a restricted role (MAF) clicks into an Operasional program. */
export default function AksesDibatasiModal({ onClose }: Props) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,22,40,0.5)', backdropFilter: 'blur(6px)', zIndex: Z_ALERT_OVERLAY, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ backgroundColor: 'var(--card)', borderRadius: 16, padding: '32px 28px', maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(10,22,40,0.2)' }}
      >
        <div style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(102,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <svg width="24" height="24" fill="none" stroke="var(--color-danger)" strokeWidth="1.75" viewBox="0 0 24 24">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.02em' }}>
          Akses Dibatasi
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 24 }}>
          Butuh akses admin untuk melihat data ini.
        </div>
        <button
          onClick={onClose}
          style={{ backgroundColor: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Oke
        </button>
      </div>
    </div>
  )
}
