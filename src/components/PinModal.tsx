import { useState, useRef, useEffect } from 'react'
import { useEscapeKey } from '../lib/useEscapeKey'
import { verifyPin, setAdminPin } from '../lib/adminApi'
import ModalShell from './ModalShell'

interface PinModalProps {
  onSuccess: () => void
  onClose: () => void
}

export default function PinModal({ onSuccess, onClose }: PinModalProps) {
  useEscapeKey(onClose)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus only on desktop to prevent iOS viewport zoom
  useEffect(() => {
    if (!window.matchMedia('(max-width: 768px)').matches) {
      inputRef.current?.focus()
    }
  }, [])

  const handleSubmit = async () => {
    if (checking) return
    setChecking(true)
    setError('')
    const ok = await verifyPin(pin)
    setChecking(false)
    if (ok) {
      setAdminPin(pin)
      onSuccess()
    } else {
      setError('PIN salah. Coba lagi.')
      setPin('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
  }

  const canSubmit = pin.length === 4 && !checking

  return (
    <ModalShell onClose={onClose} maxWidth={380}>
      {close => (
      <div
        style={{
          padding: '32px 28px 40px',
          textAlign: 'center',
        }}
      >
        <div style={{ marginBottom: 8 }}>
          <div
            style={{
              width: 48, height: 48, borderRadius: 12,
              backgroundColor: 'rgba(26,111,232,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
              color: 'var(--blue)',
            }}
          >
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Masuk Mode Admin</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            Masukkan PIN 4 digit untuk mengakses fitur admin
          </div>
        </div>

        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          value={pin}
          onChange={e => {
            setPin(e.target.value.replace(/\D/g, ''))
            setError('')
          }}
          onKeyDown={handleKeyDown}
          placeholder="• • • •"
          style={{
            width: '100%',
            border: `1px solid ${error ? '#660000' : 'var(--border)'}`,
            borderRadius: 10,
            padding: '14px',
            textAlign: 'center',
            fontSize: 24,
            letterSpacing: '0.5em',
            fontWeight: 700,
            color: 'var(--text-primary)',
            outline: 'none',
            marginTop: 20,
            marginBottom: 8,
            boxSizing: 'border-box',
            fontFamily: 'inherit',
            backgroundColor: 'var(--card)',
          }}
        />

        {error && (
          <div style={{ color: '#660000', fontSize: 12, marginBottom: 8 }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button
            onClick={close}
            style={{
              flex: 1, padding: '11px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--card)',
              color: 'var(--text-muted)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              flex: 1, padding: '11px',
              borderRadius: 10,
              border: 'none',
              backgroundColor: canSubmit ? 'var(--blue)' : 'var(--border)',
              color: canSubmit ? '#fff' : 'var(--text-muted)',
              fontSize: 13,
              fontWeight: 600,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
            }}
          >
            {checking ? 'Memeriksa...' : 'Masuk'}
          </button>
        </div>
      </div>
      )}
    </ModalShell>
  )
}
