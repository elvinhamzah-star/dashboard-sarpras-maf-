import { useState } from 'react'
import { Issue } from '../lib/supabase'
import { adminUpdate, adminDelete } from '../lib/adminApi'

interface EditIsuModalProps {
  issue: Issue
  onClose: () => void
  onSuccess: () => void
}

export default function EditIsuModal({ issue, onClose, onSuccess }: EditIsuModalProps) {
  const [deskripsi, setDeskripsi] = useState(issue.isu_kendala)
  const [status, setStatus] = useState(issue.status_isu)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const { error } = await adminUpdate('issues', { isu_kendala: deskripsi, status_isu: status }, issue.id)
    setSaving(false)
    if (error) { alert('Gagal menyimpan: ' + error.message); return }
    onSuccess()
    onClose()
  }

  const handleDelete = async () => {
    if (!confirm(`Hapus isu "${issue.isu_kendala.substring(0, 40)}..."?`)) return
    setDeleting(true)
    const { error } = await adminDelete('issues', issue.id)
    setDeleting(false)
    if (error) { alert('Gagal menghapus: ' + error.message); return }
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
          backgroundColor: 'var(--card)',
          borderRadius: 16,
          padding: '28px',
          width: '100%',
          maxWidth: 480,
          boxShadow: '0 20px 60px rgba(13,24,41,0.2)',
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0D1829' }}>Edit Isu Lapangan</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{issue.nama_pekerjaan}</div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Program
          </label>
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              backgroundColor: 'var(--surface-raised)',
              fontSize: 13,
              color: 'var(--text-muted)',
              border: '1px solid rgba(26,43,94,0.07)',
            }}
          >
            {issue.nama_pekerjaan}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Deskripsi Isu
          </label>
          <textarea
            value={deskripsi}
            onChange={e => setDeskripsi(e.target.value)}
            rows={4}
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

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Status Isu
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
              backgroundColor: 'var(--card)',
              outline: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <option>Proses</option>
            <option>Selesai</option>
            <option>Menunggu</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              flex: '0 0 auto',
              padding: '10px 16px',
              borderRadius: 10,
              border: 'none',
              backgroundColor: '#EF4444',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              opacity: deleting ? 0.7 : 1,
            }}
          >
            {deleting ? 'Menghapus...' : 'Hapus'}
          </button>
          <div style={{ flex: 1 }} />
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
