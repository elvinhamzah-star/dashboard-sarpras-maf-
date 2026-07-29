import { useState } from 'react'
import { useEscapeKey } from '../lib/useEscapeKey'
import { adminUpdate } from '../lib/adminApi'
import { formatRupiah } from '../lib/data'
import ModalShell from './ModalShell'

interface EditDanaMasukModalProps {
  programId: string
  namaPekerjaan: string
  currentValue: number
  onClose: () => void
  onSuccess: (newValue: number) => void
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 10,
  border: '1.5px solid var(--blue)',
  fontSize: 15,
  color: 'var(--text-primary)',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-muted)',
  display: 'block',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

const btnCancel: React.CSSProperties = {
  padding: '10px 16px', borderRadius: 10,
  border: '1px solid var(--border)',
  backgroundColor: 'var(--card)', color: 'var(--text-muted)',
  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
}

export default function EditDanaMasukModal({ programId, namaPekerjaan, currentValue, onClose, onSuccess }: EditDanaMasukModalProps) {
  useEscapeKey(onClose)
  const [value, setValue] = useState(currentValue > 0 ? String(currentValue) : '')
  const [step, setStep] = useState<'form' | 'confirm'>('form')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const nominal = parseInt(value.replace(/\D/g, ''), 10) || 0

  const handleNext = () => {
    // Nilai tidak berubah — tak perlu konfirmasi, langsung tutup.
    if (nominal === currentValue) { onClose(); return }
    setError('')
    setStep('confirm')
  }

  const handleConfirm = async () => {
    setSaving(true)
    const { error: err } = await adminUpdate('programs', { dana_masuk: nominal }, programId)
    setSaving(false)

    if (err) {
      setError('Gagal menyimpan: ' + (err instanceof Error ? err.message : String(err)))
      setStep('form')
      return
    }

    onSuccess(nominal)
    onClose()
  }

  return (
    <ModalShell onClose={onClose} maxWidth={420}>
      {close => (
        <div style={{ padding: '26px' }}>
          {step === 'form' ? (
            <>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Ubah Dana Masuk</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{namaPekerjaan}</div>
              </div>

              {error && (
                <div style={{ marginBottom: 16, padding: 10, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)', color: '#E53E3E', fontSize: 12 }}>
                  {error}
                </div>
              )}

              <div style={{ marginBottom: 22 }}>
                <label style={labelStyle}>Nominal (Rp)</label>
                <input
                  type="number"
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  placeholder="0"
                  style={inputStyle}
                  autoFocus
                />
                {nominal > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--blue)', marginTop: 4, fontWeight: 500, textAlign: 'right' }}>
                    {formatRupiah(nominal)}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={close} style={btnCancel}>Batal</button>
                <button
                  onClick={handleNext}
                  style={{ padding: '10px 20px', borderRadius: 10, border: 'none', backgroundColor: 'var(--blue)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Simpan
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Konfirmasi Perubahan</div>
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 22 }}>
                Ubah Dana Masuk <strong style={{ color: 'var(--text-primary)' }}>{namaPekerjaan}</strong> dari{' '}
                <span style={{ color: 'var(--text-muted)' }}>{currentValue > 0 ? formatRupiah(currentValue) : 'Rp 0'}</span>{' '}
                menjadi <strong style={{ color: 'var(--text-primary)' }}>{formatRupiah(nominal)}</strong>?
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setStep('form')} disabled={saving} style={btnCancel}>Batal</button>
                <button
                  onClick={handleConfirm}
                  disabled={saving}
                  style={{ padding: '10px 20px', borderRadius: 10, border: 'none', backgroundColor: '#D97706', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}
                >
                  {saving ? 'Menyimpan...' : 'Ya, Simpan'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </ModalShell>
  )
}
