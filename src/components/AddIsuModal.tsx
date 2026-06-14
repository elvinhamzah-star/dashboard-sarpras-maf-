import { useState } from 'react'
import { adminInsert } from '../lib/adminApi'

interface AddIsuModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function AddIsuModal({ onClose, onSuccess }: AddIsuModalProps) {
  const [namaProgram, setNamaProgram] = useState('')
  const [deskripsi, setDeskripsi] = useState('')
  const [status, setStatus] = useState('Proses')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!namaProgram.trim() || !deskripsi.trim()) {
      alert('Nama program dan deskripsi harus diisi')
      return
    }

    setSaving(true)
    const { error } = await adminInsert('issues', {
      nama_pekerjaan: namaProgram,
      isu_kendala: deskripsi,
      status_isu: status,
      program_id: 'P-001',
    })
    setSaving(false)

    if (error) {
      alert('Gagal menambah isu: ' + error.message)
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

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7A99', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Nama Program/Pekerjaan
          </label>
          <input
            type="text"
            value={namaProgram}
            onChange={e => setNamaProgram(e.target.value)}
            placeholder="Contoh: Pengecatan Gedung MAF"
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

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7A99', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Deskripsi Isu
          </label>
          <textarea
            value={deskripsi}
            onChange={e => setDeskripsi(e.target.value)}
            rows={4}
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
