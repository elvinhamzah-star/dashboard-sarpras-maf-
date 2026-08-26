import { useState, useRef, useEffect } from 'react'
import { verifyPin, setAdminPin } from '../lib/adminApi'
import { MOBILE_BREAKPOINT } from '../lib/breakpoint'
import { Z_ALERT_OVERLAY } from '../lib/zIndex'
import ModalShell from './ModalShell'

interface Props {
  onClose: () => void
  onUnlock: () => void
}

export default function ManPowerGateModal({ onClose, onUnlock }: Props) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches) {
      inputRef.current?.focus()
    }
  }, [])

  const handleSubmit = async () => {
    if (checking || pin.length !== 4) return
    setChecking(true)
    setError('')
    const ok = await verifyPin(pin)
    setChecking(false)
    if (ok) {
      setAdminPin(pin)
      onUnlock()
      onClose()
    } else {
      setError('PIN salah. Coba lagi.')
      setPin('')
    }
  }

  const canSubmit = pin.length === 4 && !checking

  return (
    <ModalShell onClose={onClose} maxWidth={380} zIndex={Z_ALERT_OVERLAY}>
      {close => (
        <div style={{ padding: '32px 28px 36px', textAlign: 'center' }}>
          {/* Icon */}
          <div style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(102,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#660000' }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          </div>

          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Butuh Akses Admin</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Data Man Power hanya bisa diakses oleh admin.<br />Masukkan PIN untuk membuka akses.
          </div>

          {/* PIN input */}
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={pin}
            onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError('') }}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
            placeholder="• • • •"
            style={{ width: '100%', border: `1px solid ${error ? 'var(--color-danger)' : 'var(--border)'}`, borderRadius: 10, padding: '14px', textAlign: 'center', fontSize: 24, letterSpacing: '0.5em', fontWeight: 700, color: 'var(--text-primary)', outline: 'none', marginTop: 20, marginBottom: 6, boxSizing: 'border-box', fontFamily: 'inherit', backgroundColor: 'var(--card)' }}
          />

          {error && <div style={{ color: 'var(--color-danger)', fontSize: 12, marginBottom: 4 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={close} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Batal
            </button>
            <button onClick={handleSubmit} disabled={!canSubmit} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', backgroundColor: canSubmit ? 'var(--blue)' : 'var(--border)', color: canSubmit ? '#fff' : 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: canSubmit ? 'pointer' : 'not-allowed', transition: 'all 0.15s', fontFamily: 'inherit' }}>
              {checking ? 'Memeriksa...' : 'Buka Akses'}
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  )
}
