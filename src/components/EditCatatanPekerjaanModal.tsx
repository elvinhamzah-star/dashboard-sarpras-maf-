import { useState } from 'react'
import { useEscapeKey } from '../lib/useEscapeKey'
import { adminUpdate } from '../lib/adminApi'
import BulletInput from './BulletInput'

interface EditCatatanPekerjaanModalProps {
  programId: string
  currentNotes: string
  onClose: () => void
  onSuccess: () => void
}

export default function EditCatatanPekerjaanModal({ programId, currentNotes, onClose, onSuccess }: EditCatatanPekerjaanModalProps) {
  useEscapeKey(onClose)
  const toItems = (text: string) => text ? text.split('\n').filter(l => l.trim()) : []
  const [items, setItems] = useState<string[]>(toItems(currentNotes))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const value = items.filter(i => i.trim()).join('\n') || null
    const { error: err } = await adminUpdate('programs', {
      isu_utama: value,
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
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Edit Catatan Pekerjaan</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Catatan atau isu yang perlu diperhatikan untuk pekerjaan ini</div>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: 10, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)', color: '#E53E3E', fontSize: 12 }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Catatan Pekerjaan
          </label>
          <BulletInput items={items} onChange={setItems} placeholder="Masukkan catatan atau isu penting..." />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            Kosongkan semua poin untuk menghapus catatan
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              border: '1px solid var(--border)',
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
    </div>
  )
}
