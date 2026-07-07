import { useState } from 'react'
import { useEscapeKey } from '../lib/useEscapeKey'
import ModalShell from './ModalShell'
import { Program } from '../lib/supabase'
import { adminUpdate, adminInsert } from '../lib/adminApi'
import { formatRupiah } from '../lib/data'

interface UpdateProgressModalProps {
  program: Program
  onClose: () => void
  onUpdated: () => void
}

const STATUS_OPTIONS = ['Perencanaan', 'On Going', 'Selesai', 'On Hold']

export default function UpdateProgressModal({ program, onClose, onUpdated }: UpdateProgressModalProps) {
  useEscapeKey(onClose)
  const [progress, setProgress] = useState(program.progress_percent?.toString() || '0')
  const [realisasi, setRealisasi] = useState(program.realisasi_terkini?.toString() || '0')
  const [status, setStatus] = useState(program.status || 'On Going')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const progressNum = parseFloat(progress) || 0
    const realisasiNum = parseFloat(realisasi) || 0
    const sisa = (program.total_anggaran || 0) - realisasiNum
    const { error: err } = await adminUpdate('programs', {
      progress_percent: progressNum,
      realisasi_terkini: realisasiNum,
      sisa_anggaran: sisa,
      status,
      updated_at: new Date().toISOString(),
    }, program.id)

    if (err) {
      setSaving(false)
      setError(err.message)
      return
    }

    // Append a history snapshot (non-destructive). Best-effort: the program update
    // is the source of truth, so a snapshot failure should not block the save.
    const { error: snapErr } = await adminInsert('program_snapshots', {
      program_id: program.id,
      snapshot_date: new Date().toISOString().split('T')[0],
      progress_percent: progressNum,
      realisasi_terkini: realisasiNum,
      sisa_anggaran: sisa,
      total_anggaran: program.total_anggaran || 0,
      status,
    })
    if (snapErr) console.warn('Gagal menyimpan snapshot riwayat:', snapErr.message)

    setSaving(false)
    onUpdated()
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid rgba(26,43,94,0.15)',
    fontSize: 14,
    color: '#0D1829',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box' as const,
  }

  return (
    <ModalShell onClose={onClose} maxWidth={480}>
      {close => (
      <div style={{ padding: '28px' }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0D1829' }}>Update Progress</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{program.nama_pekerjaan}</div>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: 10, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)', color: '#E53E3E', fontSize: 12 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Progress: {progress}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={e => setProgress(e.target.value)}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Realisasi Terkini (Rp)
            </label>
            <input
              type="number"
              min="0"
              step="100000"
              value={realisasi}
              onChange={e => setRealisasi(e.target.value)}
              style={inputStyle}
            />
            <div style={{ fontSize: 11, color: '#1B5E2B', marginTop: 4 }}>{formatRupiah(parseFloat(realisasi) || 0)}</div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Status
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              style={{ ...inputStyle, backgroundColor: 'var(--card)', cursor: 'pointer' }}
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 24 }}>
          <button
            onClick={close}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              border: '1px solid rgba(26,43,94,0.15)',
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
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              border: 'none',
              backgroundColor: 'var(--blue)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
      )}
    </ModalShell>
  )
}
