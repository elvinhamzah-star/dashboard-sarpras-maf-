import { useState } from 'react'
import { SubProgramTask } from '../lib/supabase'
import { adminInsert, adminUpdate, adminDelete } from '../lib/adminApi'
import { formatRupiah } from '../lib/data'
import ModalShell from './ModalShell'

interface ChecklistItemModalProps {
  /** sub_programs.id (gedung) item baru ini mau ditaruh. Diabaikan saat edit. */
  subProgramId: string
  /** Item yang diedit. Kosong = mode tambah item baru. */
  task?: SubProgramTask
  onClose: () => void
  onSuccess: () => void
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-muted)',
  display: 'block',
  marginBottom: 6,
  textTransform: 'uppercase',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid var(--border)',
  fontSize: 14,
  color: 'var(--text-primary)',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
}

/**
 * Tambah / edit / hapus satu item checklist (sub_program_tasks) — nama item
 * dan nilainya. Status item (Belum Mulai/On Progress/Selesai) SENGAJA gak
 * ada di sini — itu tetap diubah lewat klik pill status di panel checklist
 * (cycleTaskStatus di PekerjaanDetail), biar gak ada dua jalur yang bisa
 * nimpa status item secara gak sengaja.
 */
export default function ChecklistItemModal({ subProgramId, task, onClose, onSuccess }: ChecklistItemModalProps) {
  const isEdit = !!task
  const [item, setItem] = useState(task?.item || '')
  const [nilai, setNilai] = useState(task?.nilai || 0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!item.trim()) {
      setError('Nama item tidak boleh kosong')
      return
    }
    setSaving(true)
    setError('')
    const { error: err } = isEdit
      ? await adminUpdate('sub_program_tasks', { item: item.trim(), nilai }, task.id)
      : await adminInsert('sub_program_tasks', {
          sub_program_id: subProgramId,
          item: item.trim(),
          nilai,
          status: 'Belum Mulai',
        })
    setSaving(false)
    if (err) {
      setError('Gagal menyimpan: ' + err.message)
      return
    }
    onSuccess()
    onClose()
  }

  const handleDelete = async () => {
    if (!task) return
    if (!confirm(`Hapus item "${task.item}"? Tindakan ini tidak bisa dibatalkan.`)) return
    setSaving(true)
    setError('')
    const { error: err } = await adminDelete('sub_program_tasks', task.id)
    setSaving(false)
    if (err) {
      setError('Gagal menghapus: ' + err.message)
      return
    }
    onSuccess()
    onClose()
  }

  return (
    <ModalShell onClose={onClose} maxWidth={420}>
      {close => (
        <div style={{ padding: '28px' }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
              {isEdit ? 'Edit Item Checklist' : 'Tambah Item Checklist'}
            </div>
          </div>

          {error && (
            <div style={{ marginBottom: 16, padding: 10, borderRadius: 8, backgroundColor: 'rgba(102,0,0,0.08)', color: 'var(--color-danger)', fontSize: 12 }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Nama Item</label>
            <input
              type="text"
              value={item}
              onChange={e => setItem(e.target.value)}
              placeholder="Contoh: Pengecatan dinding luar"
              style={inputStyle}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Nilai (Rp)</label>
            <input
              type="number"
              value={nilai || ''}
              onChange={e => setNilai(parseFloat(e.target.value) || 0)}
              min="0"
              step="100000"
              placeholder="0"
              style={inputStyle}
            />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{formatRupiah(nilai)}</div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: isEdit ? 'space-between' : 'flex-end' }}>
            {isEdit && (
              <button
                onClick={handleDelete}
                disabled={saving}
                style={{
                  padding: '10px 16px',
                  borderRadius: 10,
                  border: '1px solid rgba(220,38,38,0.3)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-danger)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                Hapus
              </button>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={close}
                disabled={saving}
                style={{
                  padding: '10px 16px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--card)',
                  color: 'var(--text-muted)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
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
                  fontFamily: 'inherit',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalShell>
  )
}
