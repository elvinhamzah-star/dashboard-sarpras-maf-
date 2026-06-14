import { useState, useEffect } from 'react'
import { adminInsert } from '../lib/adminApi'
import { fetchPrograms, Program } from '../lib/supabase'

interface AddIsuModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function AddIsuModal({ onClose, onSuccess }: AddIsuModalProps) {
  const [programs, setPrograms] = useState<Program[]>([])
  const [programId, setProgramId] = useState('')
  const [deskripsi, setDeskripsi] = useState('')
  const [tindakLanjut, setTindakLanjut] = useState('')
  const [status, setStatus] = useState('Proses')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPrograms().then(({ data }) => {
      if (data) setPrograms(data)
    })
  }, [])

  const handleSave = async () => {
    if (!programId) {
      setError('Pilih program terlebih dahulu')
      return
    }
    if (!deskripsi.trim()) {
      setError('Deskripsi isu harus diisi')
      return
    }

    setSaving(true)
    setError('')
    const program = programs.find(p => p.id === programId)
    const { error: err } = await adminInsert('issues', {
      nama_pekerjaan: program?.nama_pekerjaan || '',
      isu_kendala: deskripsi,
      status_isu: status,
      tindak_lanjut: tindakLanjut || null,
      program_id: programId,
    })
    setSaving(false)

    if (err) {
      setError('Gagal menambah isu: ' + err.message)
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
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0D1829' }}>Tambah Isu Lapangan</div>
          <div style={{ fontSize: 12, color: '#6B7A99', marginTop: 4 }}>Tambahkan isu baru untuk dilacak</div>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: 10, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)', color: '#991b1b', fontSize: 12 }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7A99', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Program / Pekerjaan
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
              <option key={p.id} value={p.id}>{p.nama_pekerjaan}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7A99', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Deskripsi Isu
          </label>
          <textarea
            value={deskripsi}
            onChange={e => setDeskripsi(e.target.value)}
            rows={3}
            placeholder="Jelaskan isu atau kendala yang dihadapi..."
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

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7A99', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Tindak Lanjut (Opsional)
          </label>
          <input
            type="text"
            value={tindakLanjut}
            onChange={e => setTindakLanjut(e.target.value)}
            placeholder="Rencana penyelesaian..."
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
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7A99', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Status Awal
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
            <option>Proses</option>
            <option>Selesai</option>
            <option>Menunggu</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
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
