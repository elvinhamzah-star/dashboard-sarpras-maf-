import { useState } from 'react'
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

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--text-muted)',
  display: 'block',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

export default function EditDanaMasukModal({ programId, namaPekerjaan, currentValue, onClose, onSuccess }: EditDanaMasukModalProps) {
  const [tambah, setTambah] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const increment = parseInt(tambah.replace(/\D/g, ''), 10) || 0
  const newTotal = currentValue + increment
  const canSave = increment > 0 && !saving

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError('')
    const { error: err } = await adminUpdate('programs', { dana_masuk: newTotal }, programId)
    setSaving(false)
    if (err) {
      setError('Gagal menyimpan: ' + (err instanceof Error ? err.message : String(err)))
      return
    }
    onSuccess(newTotal)
    onClose()
  }

  return (
    <ModalShell onClose={onClose} maxWidth={420}>
      {close => (
        <div style={{ padding: '26px 28px' }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Tambah Dana Masuk</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>{namaPekerjaan}</div>
          </div>

          {error && (
            <div style={{ marginBottom: 14, padding: 10, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)', color: '#E53E3E', fontSize: 12 }}>
              {error}
            </div>
          )}

          {/* Current → + Tambah */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 28px 1fr', gap: 8, alignItems: 'end', marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Saldo Saat Ini</label>
              <div style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--surface-2)', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                {currentValue > 0 ? formatRupiah(currentValue) : 'Rp 0'}
              </div>
            </div>

            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--blue)', textAlign: 'center', paddingBottom: 10 }}>+</div>

            <div>
              <label style={labelStyle}>Tambah Dana (Rp)</label>
              <input
                type="number"
                value={tambah}
                onChange={e => { setTambah(e.target.value); setError('') }}
                onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
                placeholder="0"
                min={0}
                autoFocus
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: `1.5px solid ${increment > 0 ? 'var(--blue)' : 'var(--border)'}`,
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box',
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                  backgroundColor: 'var(--card)',
                  transition: 'border-color 0.15s',
                }}
              />
            </div>
          </div>

          {/* New total preview */}
          <div style={{
            padding: '12px 14px',
            borderRadius: 10,
            backgroundColor: increment > 0 ? 'rgba(26,111,232,0.06)' : 'var(--surface-2)',
            border: `1px solid ${increment > 0 ? 'rgba(26,111,232,0.2)' : 'var(--border)'}`,
            marginBottom: 22,
            transition: 'all 0.15s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Dana Masuk Baru
              </span>
              <span style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: increment > 0 ? 'var(--blue)' : 'var(--text-muted)', transition: 'color 0.15s' }}>
                {formatRupiah(newTotal)}
              </span>
            </div>
            {increment > 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                +{formatRupiah(increment)} ditambahkan ke {currentValue > 0 ? formatRupiah(currentValue) : 'Rp 0'}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={close}
              style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              style={{ padding: '10px 20px', borderRadius: 10, border: 'none', backgroundColor: canSave ? 'var(--blue)' : 'var(--border)', color: canSave ? '#fff' : 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: canSave ? 'pointer' : 'not-allowed', opacity: saving ? 0.7 : 1, fontFamily: 'inherit', transition: 'all 0.15s' }}
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  )
}
