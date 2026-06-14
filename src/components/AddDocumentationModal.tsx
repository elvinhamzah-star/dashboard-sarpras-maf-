import { useState } from 'react'
import { Program } from '../lib/supabase'
import { adminInsert } from '../lib/adminApi'
import { isValidDriveLink } from '../lib/data'

interface AddDocumentationModalProps {
  programs: Program[]
  onClose: () => void
  onSuccess: () => void
}

export default function AddDocumentationModal({ programs, onClose, onSuccess }: AddDocumentationModalProps) {
  const [programId, setProgramId] = useState('')
  const [fase, setFase] = useState('Kondisi Awal')
  const [driveLink, setDriveLink] = useState('')
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0])
  const [deskripsi, setDeskripsi] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    // Validation
    if (!programId.trim()) {
      setError('Program harus dipilih')
      return
    }
    if (!fase.trim()) {
      setError('Fase harus dipilih')
      return
    }
    if (!driveLink.trim()) {
      setError('Google Drive Link harus diisi')
      return
    }
    if (!isValidDriveLink(driveLink)) {
      setError('Format Google Drive Link tidak valid. Gunakan format: https://drive.google.com/file/d/FILE_ID/view?usp=sharing')
      return
    }
    if (!tanggal.trim()) {
      setError('Tanggal harus diisi')
      return
    }

    setSaving(true)
    setError('')

    const program = programs.find(p => p.id === programId)
    const { error: err } = await adminInsert('documentation', {
      id: crypto.randomUUID(),
      program_id: programId,
      nama_pekerjaan: program?.nama_pekerjaan,
      fase,
      link_foto: driveLink,
      caption: deskripsi || null,
      tanggal,
    })

    setSaving(false)

    if (err) {
      setError('Gagal menambah dokumentasi: ' + err.message)
      return
    }

    onSuccess()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(13,24,41,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 16,
          padding: '28px',
          width: '100%',
          maxWidth: 500,
          boxShadow: '0 20px 60px rgba(13,24,41,0.2)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0D1829' }}>Tambah Dokumentasi</div>
          <div style={{ fontSize: 12, color: '#6B7A99', marginTop: 4 }}>Upload dokumentasi pekerjaan dari Google Drive</div>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: 10, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)', color: '#991b1b', fontSize: 12 }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7A99', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
            Program
          </label>
          <select
            value={programId}
            onChange={e => setProgramId(e.target.value)}
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
            <option value="">-- Pilih Program --</option>
            {programs.map(p => (
              <option key={p.id} value={p.id}>
                {p.nama_pekerjaan}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7A99', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
            Fase
          </label>
          <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
            {['Kondisi Awal', 'Proses Pekerjaan', 'Kondisi Akhir'].map(f => (
              <label key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="radio"
                  value={f}
                  checked={fase === f}
                  onChange={e => setFase(e.target.value)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: 12, color: '#0D1829' }}>{f}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7A99', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
            Google Drive Link
          </label>
          <input
            type="url"
            value={driveLink}
            onChange={e => setDriveLink(e.target.value)}
            placeholder="https://drive.google.com/file/d/FILE_ID/view?usp=sharing"
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
          <div style={{ fontSize: 11, color: '#6B7A99', marginTop: 4 }}>
            Paste link share dari Google Drive (harus berisi /d/)
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7A99', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
            Tanggal
          </label>
          <input
            type="date"
            value={tanggal}
            onChange={e => setTanggal(e.target.value)}
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
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7A99', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
            Deskripsi (Opsional)
          </label>
          <textarea
            value={deskripsi}
            onChange={e => setDeskripsi(e.target.value)}
            rows={3}
            placeholder="Catatan tambahan tentang foto/video..."
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid rgba(26,43,94,0.15)',
              fontSize: 13,
              color: '#0D1829',
              resize: 'vertical',
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
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
              backgroundColor: '#1A6FE8',
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
