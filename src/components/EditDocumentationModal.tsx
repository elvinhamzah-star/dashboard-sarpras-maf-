import { useState } from 'react'
import { Documentation, Program } from '../lib/supabase'
import { adminUpdate } from '../lib/adminApi'
import { isValidDriveLink } from '../lib/data'

interface EditDocumentationModalProps {
  doc: Documentation
  programs: Program[]
  onClose: () => void
  onSuccess: () => void
}

export default function EditDocumentationModal({ doc, programs, onClose, onSuccess }: EditDocumentationModalProps) {
  const [fase, setFase] = useState(doc.fase || '')
  const [driveLink, setDriveLink] = useState(doc.drive_link || '')
  const [tanggal, setTanggal] = useState(doc.tanggal)
  const [deskripsi, setDeskripsi] = useState(doc.deskripsi || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    // Validation
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

    const { error: err } = await adminUpdate('documentation', {
      fase,
      drive_link: driveLink,
      deskripsi: deskripsi || null,
      tanggal,
      updated_at: new Date().toISOString(),
    }, doc.id)

    setSaving(false)

    if (err) {
      setError('Gagal mengubah dokumentasi: ' + err.message)
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
          backgroundColor: 'var(--card)',
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
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0D1829' }}>Edit Dokumentasi</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{doc.nama_pekerjaan}</div>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: 10, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)', color: '#E53E3E', fontSize: 12 }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
            Fase
          </label>
          <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
            {['Kondisi Awal', 'Proses Pekerjaan', 'Kondisi Akhir'].map(f => (
              <label key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="radio"
                  value={f}
                  checked={fase === f}
                  onChange={e => setFase(e.target.value as 'Kondisi Awal' | 'Proses Pekerjaan' | 'Kondisi Akhir')}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: 12, color: '#0D1829' }}>{f}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
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
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Paste link share dari Google Drive (harus berisi /d/)
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
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
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
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
