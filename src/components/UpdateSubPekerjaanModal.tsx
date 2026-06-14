import { useState } from 'react'
import { supabase, SubProgram } from '../lib/supabase'
import { formatRupiah } from '../lib/data'

interface UpdateSubPekerjaanModalProps {
  subProgram: SubProgram
  onClose: () => void
  onSuccess: () => void
}

export default function UpdateSubPekerjaanModal({ subProgram, onClose, onSuccess }: UpdateSubPekerjaanModalProps) {
  const [progress, setProgress] = useState(subProgram.progress_percent || 0)
  const [anggaran, setAnggaran] = useState(subProgram.total_anggaran || 0)
  const [realisasi, setRealisasi] = useState(subProgram.realisasi_terkini || 0)
  const [status, setStatus] = useState(subProgram.status)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (progress < 0 || progress > 100) {
      setError('Progress harus antara 0-100')
      return
    }

    setSaving(true)
    const sisa = anggaran - realisasi
    const { error: err } = await supabase
      .from('sub_programs')
      .update({
        progress_percent: progress,
        total_anggaran: anggaran,
        realisasi_terkini: realisasi,
        sisa_anggaran: sisa,
        status,
      })
      .eq('id', subProgram.id)

    setSaving(false)

    if (err) {
      setError('Gagal memperbarui: ' + err.message)
      return
    }

    onSuccess()
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        backgroundColor: 'rgba(13,24,41,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 16,
          padding: '28px',
          width: '100%',
          maxWidth: 480,
          boxShadow: '0 20px 60px rgba(13,24,41,0.2)',
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0D1829' }}>Update Progress</div>
          <div style={{ fontSize: 12, color: '#6B7A99', marginTop: 4 }}>{subProgram.nama_gedung}</div>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: 10, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)', color: '#991b1b', fontSize: 12 }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7A99', display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>
            Progress: {progress}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={e => setProgress(parseInt(e.target.value))}
            style={{ width: '100%', cursor: 'pointer' }}
          />
        </div>

        <div style={{ marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7A99', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
              Total Anggaran
            </label>
            <input
              type="number"
              value={anggaran}
              onChange={e => setAnggaran(parseFloat(e.target.value) || 0)}
              min="0"
              step="100000"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid rgba(26,43,94,0.15)',
                fontSize: 13,
                color: '#0D1829',
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ fontSize: 11, color: '#6B7A99', marginTop: 4 }}>{formatRupiah(anggaran)}</div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7A99', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
              Realisasi
            </label>
            <input
              type="number"
              value={realisasi}
              onChange={e => setRealisasi(parseFloat(e.target.value) || 0)}
              min="0"
              step="100000"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid rgba(26,43,94,0.15)',
                fontSize: 13,
                color: '#0D1829',
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ fontSize: 11, color: '#1B5E2B', marginTop: 4 }}>{formatRupiah(realisasi)}</div>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7A99', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
            Status
          </label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid rgba(26,43,94,0.15)',
              fontSize: 13,
              color: '#0D1829',
              backgroundColor: '#fff',
              outline: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <option>Perencanaan</option>
            <option>On Going</option>
            <option>Selesai</option>
            <option>On Hold</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              border: '1px solid rgba(26,43,94,0.15)',
              backgroundColor: '#fff',
              color: '#6B7A99',
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
              backgroundColor: '#0858b0',
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
    </div>
  )
}
