import { useState } from 'react'
import { verifyPin, setAdminPin } from '../lib/adminApi'

interface Props {
  /** Dipanggil setelah PIN admin benar — App.tsx set isAdmin=true */
  onAdminAccess?: () => void
}

export default function MaintenanceScreen({ onAdminAccess }: Props) {
  const [showPin, setShowPin]   = useState(false)
  const [pin, setPin]           = useState('')
  const [error, setError]       = useState('')
  const [checking, setChecking] = useState(false)

  const handleSubmit = async () => {
    if (checking || pin.length !== 4) return
    setChecking(true)
    setError('')
    const ok = await verifyPin(pin)
    setChecking(false)
    if (ok) {
      setAdminPin(pin)
      onAdminAccess?.()
    } else {
      setError('PIN salah. Coba lagi.')
      setPin('')
    }
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
      position: 'relative',
    }}>
      {/* ── Konten utama ── */}
      <div style={{ textAlign: 'center', maxWidth: 420, width: '100%' }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          backgroundColor: 'rgba(26,111,232,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <svg width="32" height="32" fill="none" stroke="var(--blue)" strokeWidth="1.6" viewBox="0 0 24 24">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
        </div>

        <h1 style={{
          fontSize: 22, fontWeight: 700, color: 'var(--text-primary)',
          letterSpacing: '-0.03em', margin: '0 0 12px', lineHeight: 1.25,
        }}>
          Sistem Sedang Diperbarui
        </h1>

        <p style={{
          fontSize: 14.5, color: 'var(--text-secondary)',
          lineHeight: 1.65, margin: '0 0 28px',
        }}>
          Dashboard sementara tidak dapat diakses untuk keperluan pemeliharaan.
          Silakan coba kembali dalam beberapa menit.
        </p>

        <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '0 0 20px' }} />

        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
          Dashboard Sarpras — Madrasah Al Fatih
        </p>
      </div>

      {/* ── Tombol admin — pojok kanan bawah ── */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 50 }}>
        {!showPin ? (
          <button
            onClick={() => setShowPin(true)}
            title="Admin"
            style={{
              width: 40, height: 40, borderRadius: 12,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--card)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-muted)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(26,111,232,0.4)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          </button>
        ) : (
          <div style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: '18px 18px 16px',
            width: 220,
            boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, textAlign: 'center' }}>
              PIN Admin
            </div>

            <input
              autoFocus
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={pin}
              onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="• • • •"
              style={{
                width: '100%', boxSizing: 'border-box',
                border: `1.5px solid ${error ? '#cc0000' : 'var(--border)'}`,
                borderRadius: 8, padding: '10px',
                textAlign: 'center', fontSize: 22, letterSpacing: '0.5em',
                fontWeight: 700, color: 'var(--text-primary)',
                outline: 'none', marginBottom: 6,
                fontFamily: 'inherit', backgroundColor: 'var(--bg)',
              }}
            />

            {error && (
              <div style={{ color: '#cc0000', fontSize: 11, marginBottom: 6, textAlign: 'center' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button
                onClick={() => { setShowPin(false); setPin(''); setError('') }}
                style={{
                  flex: 1, padding: '8px 0',
                  borderRadius: 8, border: '1px solid var(--border)',
                  backgroundColor: 'transparent', color: 'var(--text-muted)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={pin.length !== 4 || checking}
                style={{
                  flex: 1, padding: '8px 0',
                  borderRadius: 8, border: 'none',
                  backgroundColor: pin.length === 4 && !checking ? 'var(--blue)' : 'var(--border)',
                  color: pin.length === 4 && !checking ? '#fff' : 'var(--text-muted)',
                  fontSize: 12, fontWeight: 600,
                  cursor: pin.length === 4 && !checking ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit', transition: 'background-color 0.15s',
                }}
              >
                {checking ? '...' : 'Masuk'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
