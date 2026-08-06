import { useState } from 'react'
import { useEscapeKey } from '../lib/useEscapeKey'
import { adminCreateInventarisItem } from '../lib/adminApi'
import ModalShell from './ModalShell'

interface AddInventarisItemModalProps {
  onClose: () => void
  onSuccess: () => void
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

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-muted)',
  display: 'block',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

export default function AddInventarisItemModal({ onClose, onSuccess }: AddInventarisItemModalProps) {
  useEscapeKey(onClose)
  const [namaBarang, setNamaBarang] = useState('')
  const [spesifikasi, setSpesifikasi] = useState('')
  const [foto, setFoto] = useState('')
  const [jumlahUnit, setJumlahUnit] = useState('1')
  const [tim, setTim] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!namaBarang.trim()) {
      setError('Nama barang wajib diisi')
      return
    }
    const jumlah = parseInt(jumlahUnit, 10)
    if (!jumlah || jumlah < 1) {
      setError('Jumlah unit minimal 1')
      return
    }

    setSaving(true)
    const { data, error: err } = await adminCreateInventarisItem({
      namaBarang: namaBarang.trim(),
      spesifikasi: spesifikasi.trim(),
      foto: foto.trim(),
      jumlahUnit: jumlah,
      tim: tim.trim(),
    })
    setSaving(false)

    if (err || !data) {
      setError('Gagal menambah barang: ' + (err?.message ?? 'Terjadi kesalahan'))
      return
    }

    onSuccess()
    onClose()
  }

  return (
    <ModalShell onClose={onClose} maxWidth={480}>
      {close => (
        <div style={{ padding: '28px' }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Tambah Barang</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Kode QR di-generate otomatis setelah disimpan</div>
          </div>

          {error && (
            <div style={{ marginBottom: 16, padding: 10, borderRadius: 8, backgroundColor: 'rgba(102,0,0,0.1)', color: '#660000', fontSize: 12 }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Nama Barang</label>
            <input
              type="text"
              value={namaBarang}
              onChange={e => setNamaBarang(e.target.value)}
              placeholder="Contoh: Bor Listrik"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Spesifikasi (opsional)</label>
            <textarea
              value={spesifikasi}
              onChange={e => setSpesifikasi(e.target.value)}
              rows={2}
              placeholder="Contoh: Bosch 500W, mata bor set 10pcs"
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Link Foto (opsional)</label>
            <input
              type="url"
              value={foto}
              onChange={e => setFoto(e.target.value)}
              placeholder="https://drive.google.com/..."
              style={inputStyle}
            />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Tempel link Google Drive, sama seperti Galeri Dokumentasi
            </div>
          </div>

          <div style={{ marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Jumlah Unit</label>
              <input
                type="number"
                value={jumlahUnit}
                onChange={e => setJumlahUnit(e.target.value)}
                min="1"
                step="1"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Tim Penanggung Jawab</label>
              <input
                type="text"
                value={tim}
                onChange={e => setTim(e.target.value)}
                placeholder="Contoh: Tim Sarpras"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 24 }}>
            Kondisi tiap unit otomatis diset "Baik", bisa diubah nanti per unit setelah disimpan.
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={close}
              style={{
                padding: '10px 16px', borderRadius: 10,
                border: '1px solid var(--border)',
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
                backgroundColor: 'var(--blue)', color: '#fff',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  )
}
