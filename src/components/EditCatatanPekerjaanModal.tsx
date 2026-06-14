import { useState } from 'react'
import { adminUpdate } from '../lib/adminApi'

interface EditCatatanPekerjaanModalProps {
  programId: string
  currentNotes: string
  onClose: () => void
  onSuccess: () => void
}

export default function EditCatatanPekerjaanModal({ programId, currentNotes, onClose, onSuccess }: EditCatatanPekerjaanModalProps) {
  const [notes, setNotes] = useState(currentNotes || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const { error: err } = await adminUpdate('programs', {
      isu_utama: notes.trim() || null,
    }, programId)
    setSaving(false)
    if (err) {
      setError(err.message || 'Gagal menyimpan')
    } else {
      onSuccess()
    }
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
          maxWidth: 500,
          boxShadow: '0 20px 60px rgba(13,24,41,0.2)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0D1829' }}>Edit Catatan Pekerjaan</div>
          <div style={{ fontSize: 12, color: '#6B7A99', marginTop: 4 }}>Catatan atau isu yang perlu diperhatikan untuk pekerjaan ini</div>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: 10, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)', color: '#991b1b', fontSize: 12 }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7A99', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Catatan Pekerjaan
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Masukkan catatan atau isu penting untuk pekerjaan ini..."
            rows={4}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid rgba(26,43,94,0.15)',
              fontSize: 13,
              color: '#0D1829',
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
          />
          <div style={{ fontSize: 11, color: '#9CAABB', marginTop: 6 }}>
            Kosongkan untuk menghapus catatan
          </div>
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
