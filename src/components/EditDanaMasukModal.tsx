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

type Mode = 'set' | 'delta'
type Sign = '+' | '-'

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
  const [mode, setMode] = useState<Mode>('set')
  const [nilai, setNilai] = useState(String(currentValue || ''))
  const [deltaStr, setDeltaStr] = useState('')
  const [sign, setSign] = useState<Sign>('+')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Ganti mode harus mereset input — nilai absolut (Set Langsung) dan delta
  // (Tambah/Kurang) adalah konsep yang beda, jangan sampai kebawa nyasar.
  const handleModeChange = (m: Mode) => {
    if (m === mode) return
    setMode(m)
    setNilai(String(currentValue || ''))
    setDeltaStr('')
    setSign('+')
    setError('')
  }

  const setNilaiNum = parseInt(nilai.replace(/\D/g, ''), 10) || 0
  const deltaNum = parseInt(deltaStr.replace(/\D/g, ''), 10) || 0
  const newValue = mode === 'set' ? setNilaiNum : (sign === '+' ? currentValue + deltaNum : currentValue - deltaNum)

  const wouldBeNegative = mode === 'delta' && newValue < 0
  const hasInput = mode === 'set' ? nilai.trim() !== '' : deltaStr.trim() !== ''
  const canSave = !saving && hasInput && !wouldBeNegative

  const handleSave = async () => {
    if (!canSave) return
    const confirmed = window.confirm(
      `Ubah Dana Masuk "${namaPekerjaan}"?\n\nSemula: ${formatRupiah(currentValue)}\nMenjadi: ${formatRupiah(newValue)}`
    )
    if (!confirmed) return
    setSaving(true)
    setError('')
    const { error: err } = await adminUpdate('programs', { dana_masuk: newValue }, programId)
    setSaving(false)
    if (err) {
      setError('Gagal menyimpan: ' + (err instanceof Error ? err.message : String(err)))
      return
    }
    onSuccess(newValue)
    onClose()
  }

  return (
    <ModalShell onClose={onClose} maxWidth={420}>
      {close => (
        <div style={{ padding: '26px 28px' }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Edit Dana Masuk</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>{namaPekerjaan}</div>
          </div>

          {error && (
            <div style={{ marginBottom: 14, padding: 10, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)', color: '#E53E3E', fontSize: 12 }}>
              {error}
            </div>
          )}

          {/* Saldo saat ini (referensi) */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Saldo Saat Ini</label>
            <div style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--surface-2)', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
              {currentValue > 0 ? formatRupiah(currentValue) : 'Rp 0'}
            </div>
          </div>

          {/* Mode: Set Langsung vs Tambah/Kurang */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Mode Edit</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['set', 'delta'] as const).map(m => (
                <label
                  key={m}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer',
                    padding: '8px 14px', borderRadius: 8, flex: 1,
                    border: `1px solid ${mode === m ? 'var(--blue)' : 'var(--border)'}`,
                    backgroundColor: mode === m ? 'rgba(26,111,232,0.07)' : 'var(--card)',
                    transition: 'all 0.12s',
                  }}
                >
                  <input
                    type="radio"
                    checked={mode === m}
                    onChange={() => handleModeChange(m)}
                    style={{ display: 'none' }}
                  />
                  <span style={{ fontSize: 12.5, fontWeight: mode === m ? 600 : 400, color: mode === m ? 'var(--blue)' : 'var(--text-secondary)' }}>
                    {m === 'set' ? 'Set Langsung' : 'Tambah/Kurang'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {mode === 'set' ? (
            /* Nilai baru — di-set langsung, bukan ditambahkan */
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Dana Masuk (Rp)</label>
              <input
                type="number"
                value={nilai}
                onChange={e => { setNilai(e.target.value); setError('') }}
                onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
                placeholder="0"
                min={0}
                autoFocus
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: `1.5px solid ${newValue !== currentValue ? 'var(--blue)' : 'var(--border)'}`,
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
          ) : (
            /* Delta — ditambah atau dikurangi dari saldo saat ini */
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Tambah / Kurang (Rp)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {(['+', '-'] as const).map(s => (
                    <label
                      key={s}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        minWidth: 40, padding: '0 12px', borderRadius: 10,
                        border: `1.5px solid ${sign === s ? 'var(--blue)' : 'var(--border)'}`,
                        backgroundColor: sign === s ? 'rgba(26,111,232,0.07)' : 'var(--card)',
                        transition: 'all 0.12s',
                      }}
                    >
                      <input
                        type="radio"
                        checked={sign === s}
                        onChange={() => { setSign(s); setError('') }}
                        style={{ display: 'none' }}
                      />
                      <span style={{ fontSize: 16, fontWeight: 700, color: sign === s ? 'var(--blue)' : 'var(--text-secondary)' }}>
                        {s === '+' ? '+' : '−'}
                      </span>
                    </label>
                  ))}
                </div>
                <input
                  type="number"
                  value={deltaStr}
                  onChange={e => { setDeltaStr(e.target.value); setError('') }}
                  onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
                  placeholder="0"
                  min={0}
                  autoFocus
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: `1.5px solid ${wouldBeNegative ? '#E53E3E' : (deltaNum !== 0 ? 'var(--blue)' : 'var(--border)')}`,
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
              {wouldBeNegative && (
                <div style={{ fontSize: 11, color: '#E53E3E', marginTop: 6, fontWeight: 500 }}>
                  Dana Masuk tidak boleh menjadi negatif
                </div>
              )}
            </div>
          )}

          {/* Preview nilai yang akan disimpan */}
          <div style={{
            padding: '12px 14px',
            borderRadius: 10,
            backgroundColor: newValue !== currentValue ? 'rgba(26,111,232,0.06)' : 'var(--surface-2)',
            border: `1px solid ${newValue !== currentValue ? 'rgba(26,111,232,0.2)' : 'var(--border)'}`,
            marginBottom: 22,
            transition: 'all 0.15s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Dana Masuk Baru
              </span>
              <span style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: wouldBeNegative ? '#E53E3E' : (newValue !== currentValue ? 'var(--blue)' : 'var(--text-muted)'), transition: 'color 0.15s' }}>
                {formatRupiah(newValue)}
              </span>
            </div>
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
