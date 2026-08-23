import { useState, useRef } from 'react'
import { changePin } from '../lib/adminApi'
import ModalShell from './ModalShell'

interface ChangePinModalProps {
  onClose: () => void
}

const fieldStyle = (hasError: boolean): React.CSSProperties => ({
  width: '100%',
  border: `1px solid ${hasError ? 'var(--color-danger)' : 'var(--border)'}`,
  borderRadius: 10,
  padding: '12px',
  textAlign: 'center',
  fontSize: 20,
  letterSpacing: '0.5em',
  fontWeight: 700,
  color: 'var(--text-primary)',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  backgroundColor: 'var(--card)',
})

export default function ChangePinModal({ onClose }: ChangePinModalProps) {
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const confirmRef = useRef<HTMLInputElement>(null)

  const digitsOnly = (v: string) => v.replace(/\D/g, '').slice(0, 4)

  const handleSubmit = async () => {
    if (saving) return
    if (currentPin.length !== 4 || newPin.length !== 4 || confirmPin.length !== 4) return
    if (newPin !== confirmPin) {
      setError('PIN baru tidak sama dengan konfirmasi')
      return
    }
    setSaving(true)
    setError('')
    const { ok, error: rpcError } = await changePin(currentPin, newPin)
    setSaving(false)
    if (ok) {
      setDone(true)
    } else {
      setError((rpcError as { message?: string } | null)?.message || 'Gagal mengganti PIN')
      setCurrentPin('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
  }

  const canSubmit = currentPin.length === 4 && newPin.length === 4 && confirmPin.length === 4 && !saving

  return (
    <ModalShell onClose={onClose} maxWidth={380}>
      {close => (
        <div style={{ padding: '32px 28px 40px', textAlign: 'center' }}>
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
                <circle cx="12" cy="16.5" r="1.5"/>
              </svg>
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
              {done ? 'PIN Berhasil Diganti' : 'Ganti PIN Admin'}
            </div>
            {!done && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                PIN ini dipakai untuk semua aksi tulis (tambah/edit/hapus data)
              </div>
            )}
          </div>

          {done ? (
            <button
              onClick={close}
              style={{
                width: '100%', padding: '11px', marginTop: 16,
                borderRadius: 10, border: 'none',
                backgroundColor: 'var(--blue)', color: '#fff',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Selesai
            </button>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>PIN Lama</div>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={currentPin}
                    onChange={e => { setCurrentPin(digitsOnly(e.target.value)); setError('') }}
                    onKeyDown={handleKeyDown}
                    placeholder="• • • •"
                    style={fieldStyle(!!error)}
                  />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>PIN Baru</div>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={newPin}
                    onChange={e => {
                      const v = digitsOnly(e.target.value)
                      setNewPin(v)
                      setError('')
                      if (v.length === 4) confirmRef.current?.focus()
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="• • • •"
                    style={fieldStyle(!!error)}
                  />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Konfirmasi PIN Baru</div>
                  <input
                    ref={confirmRef}
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={confirmPin}
                    onChange={e => { setConfirmPin(digitsOnly(e.target.value)); setError('') }}
                    onKeyDown={handleKeyDown}
                    placeholder="• • • •"
                    style={fieldStyle(!!error)}
                  />
                </div>
              </div>

              {error && (
                <div style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 12 }}>{error}</div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
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
                    fontFamily: 'inherit',
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
                    fontFamily: 'inherit',
                  }}
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </ModalShell>
  )
}
