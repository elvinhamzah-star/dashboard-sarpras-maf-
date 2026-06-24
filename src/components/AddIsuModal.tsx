import { useState, useEffect } from 'react'
import { adminInsert } from '../lib/adminApi'
import { fetchPrograms, Program } from '../lib/supabase'
import BulletInput from './BulletInput'

interface AddIsuModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function AddIsuModal({ onClose, onSuccess }: AddIsuModalProps) {
  const [programs, setPrograms] = useState<Program[]>([])
  const [programId, setProgramId] = useState('')
  const [deskripsi, setDeskripsi] = useState<string[]>([])
  const [tindakLanjut, setTindakLanjut] = useState<string[]>([])
  const [status, setStatus] = useState('Proses')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPrograms().then(({ data }) => {
      if (data) setPrograms(data)
    })
  }, [])

  const handleSave = async () => {
    if (!programId) { setError('Pilih program terlebih dahulu'); return }
    const deskripsiText = deskripsi.filter(d => d.trim()).join('\n')
    if (!deskripsiText) { setError('Deskripsi isu harus diisi'); return }

    setSaving(true)
    setError('')
    const program = programs.find(p => p.id === programId)
    const { error: err } = await adminInsert('issues', {
      nama_pekerjaan: program?.nama_pekerjaan || '',
      isu_kendala: deskripsiText,
      status_isu: status,
      tindak_lanjut: tindakLanjut.filter(t => t.trim()).join('\n') || null,
      program_id: programId,
    })
    setSaving(false)

    if (err) { setError('Gagal menambah isu: ' + err.message); return }
    onSuccess()
    onClose()
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
    display: 'block', marginBottom: 8,
    textTransform: 'uppercase', letterSpacing: '0.04em',
  }

  const selectStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: '1px solid rgba(26,43,94,0.15)', fontSize: 13,
    color: '#0D1829', backgroundColor: 'var(--card)',
    outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
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
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0D1829' }}>Tambah Isu Lapangan</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Tambahkan isu baru untuk dilacak</div>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: 10, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.08)', color: '#E53E3E', fontSize: 12 }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Program / Pekerjaan</label>
          <select value={programId} onChange={e => setProgramId(e.target.value)} style={selectStyle}>
            <option value="">-- Pilih Program --</option>
            {programs.map(p => (
              <option key={p.id} value={p.id}>{p.nama_pekerjaan}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Deskripsi Isu</label>
          <BulletInput
            items={deskripsi}
            onChange={setDeskripsi}
            placeholder="Jelaskan isu atau kendala yang dihadapi..."
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Tindak Lanjut <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opsional)</span></label>
          <BulletInput
            items={tindakLanjut}
            onChange={setTindakLanjut}
            placeholder="Rencana penyelesaian..."
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Status Awal</label>
          <select value={status} onChange={e => setStatus(e.target.value)} style={selectStyle}>
            <option>Proses</option>
            <option>Selesai</option>
            <option>Menunggu</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 16px', borderRadius: 10,
              border: '1px solid rgba(26,43,94,0.15)',
              backgroundColor: 'var(--card)', color: 'var(--text-muted)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 20px', borderRadius: 10, border: 'none',
              backgroundColor: '#1A6FE8', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
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
