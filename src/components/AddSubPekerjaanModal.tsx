import { useState } from 'react'
import { useEscapeKey } from '../lib/useEscapeKey'
import { adminInsert } from '../lib/adminApi'
import { formatRupiah } from '../lib/data'
import ModalShell from './ModalShell'

interface AddSubPekerjaanModalProps {
  programId: string
  onClose: () => void
  onSuccess: () => void
}

const STATUS_OPTIONS = ['Perencanaan', 'On Going', 'Selesai', 'On Hold']

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid var(--border)',
  fontSize: 13,
  color: 'var(--text-primary)',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
  backgroundColor: 'var(--card)',
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

export default function AddSubPekerjaanModal({ programId, onClose, onSuccess }: AddSubPekerjaanModalProps) {
  useEscapeKey(onClose)
  const [namaGedung, setNamaGedung] = useState('')
  const [vendor, setVendor] = useState('')
  const [progress, setProgress] = useState(0)
  const [anggaran, setAnggaran] = useState(0)
  const [realisasi, setRealisasi] = useState(0)
  const [status, setStatus] = useState('Perencanaan')
  const [linkDokumentasi, setLinkDokumentasi] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!namaGedung.trim()) {
      setError('Nama gedung / lokasi wajib diisi')
      return
    }
    if (progress < 0 || progress > 100) {
      setError('Progress harus antara 0–100')
      return
    }

    setSaving(true)
    setError('')
    const sisa = anggaran - realisasi
    const { error: err } = await adminInsert('sub_programs', {
      id: crypto.randomUUID(),
      program_id: programId,
      nama_gedung: namaGedung.trim(),
      vendor: vendor.trim() || null,
      progress_percent: progress,
      total_anggaran: anggaran,
      realisasi_terkini: realisasi,
      sisa_anggaran: sisa,
      status,
      link_dokumentasi: linkDokumentasi.trim() || null,
    })
    setSaving(false)

    if (err) {
      setError('Gagal menyimpan: ' + err.message)
      return
    }

    onSuccess()
  }

  return (
    <ModalShell onClose={onClose} maxWidth={480}>
      <div style={{ padding: '28px' }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Tambah Sub Pekerjaan</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Item progress baru untuk pekerjaan ini</div>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: 10, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.08)', color: '#E53E3E', fontSize: 12 }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Nama Gedung / Lokasi <span style={{ color: '#E53E3E' }}>*</span></label>
          <input
            type="text"
            value={namaGedung}
            onChange={e => setNamaGedung(e.target.value)}
            placeholder='Contoh: "Gedung A", "Titik 1"'
            style={inputStyle}
            autoFocus
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Vendor <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opsional)</span></label>
          <input
            type="text"
            value={vendor}
            onChange={e => setVendor(e.target.value)}
            placeholder="Nama vendor / kontraktor"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Progress: {progress}%</label>
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
            <label style={labelStyle}>Total Anggaran</label>
            <input
              type="number"
              value={anggaran || ''}
              onChange={e => setAnggaran(parseFloat(e.target.value) || 0)}
              min="0"
              step="100000"
              placeholder="0"
              style={inputStyle}
            />
            {anggaran > 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{formatRupiah(anggaran)}</div>
            )}
          </div>
          <div>
            <label style={labelStyle}>Realisasi</label>
            <input
              type="number"
              value={realisasi || ''}
              onChange={e => setRealisasi(parseFloat(e.target.value) || 0)}
              min="0"
              step="100000"
              placeholder="0"
              style={inputStyle}
            />
            {realisasi > 0 && (
              <div style={{ fontSize: 11, color: '#059669', marginTop: 4 }}>{formatRupiah(realisasi)}</div>
            )}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Status</label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Link Dokumentasi <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opsional)</span></label>
          <input
            type="url"
            value={linkDokumentasi}
            onChange={e => setLinkDokumentasi(e.target.value)}
            placeholder="https://drive.google.com/..."
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.5 : 1, fontFamily: 'inherit' }}
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: '10px 20px', borderRadius: 10, border: 'none', backgroundColor: 'var(--blue)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}
          >
            {saving ? 'Menyimpan...' : 'Tambah'}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
