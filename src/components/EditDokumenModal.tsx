import { useState } from 'react'
import { adminUpdate } from '../lib/adminApi'

interface EditDokumenModalProps {
  programId: string
  links: {
    rabDetail: string | null
    dokumentasi: string | null
    buktiTransaksi: string | null
  }
  onClose: () => void
  onSuccess: () => void
}

export default function EditDokumenModal({ programId, links, onClose, onSuccess }: EditDokumenModalProps) {
  const [rabDetail, setRabDetail] = useState(links.rabDetail || '')
  const [dokumentasi, setDokumentasi] = useState(links.dokumentasi || '')
  const [buktiTransaksi, setBuktiTransaksi] = useState(links.buktiTransaksi || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const { error: err } = await adminUpdate('programs', {
      link_rab_detail: rabDetail.trim() || null,
      link_dokumentasi: dokumentasi.trim() || null,
      link_bukti_transaksi: buktiTransaksi.trim() || null,
    }, programId)
    setSaving(false)
    if (err) {
      setError(err.message || 'Gagal menyimpan')
    } else {
      onSuccess()
    }
  }

  const fields = [
    { label: 'Link RAB Detail', value: rabDetail, onChange: setRabDetail, placeholder: 'https://drive.google.com/...' },
    { label: 'Link Dokumentasi', value: dokumentasi, onChange: setDokumentasi, placeholder: 'https://drive.google.com/...' },
    { label: 'Link Bukti Transaksi', value: buktiTransaksi, onChange: setBuktiTransaksi, placeholder: 'https://drive.google.com/...' },
  ]

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
          maxWidth: 550,
          boxShadow: '0 20px 60px rgba(13,24,41,0.2)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0D1829' }}>Edit Dokumen & Link</div>
          <div style={{ fontSize: 12, color: '#6B7A99', marginTop: 4 }}>Perbarui link dokumen, RAB, dan bukti transaksi</div>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: 10, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)', color: '#991b1b', fontSize: 12 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
          {fields.map(f => (
            <div key={f.label}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7A99', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {f.label}
              </label>
              <input
                type="url"
                value={f.value}
                onChange={e => f.onChange(e.target.value)}
                placeholder={f.placeholder}
                style={{
                  width: '100%',
                  padding: '10px 12px',
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
          ))}
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
