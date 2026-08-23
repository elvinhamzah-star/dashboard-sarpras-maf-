import { useState } from 'react'
import { SubProgram } from '../lib/supabase'
import { adminUpdate } from '../lib/adminApi'
import { formatRupiah } from '../lib/data'
import { Z_DROPDOWN_IN_MODAL } from '../lib/zIndex'
import ModalShell from './ModalShell'
import Dropdown from './ui/Dropdown'

interface UpdateSubPekerjaanModalProps {
  subProgram: SubProgram
  onClose: () => void
  onSuccess: () => void
}

export default function UpdateSubPekerjaanModal({ subProgram, onClose, onSuccess }: UpdateSubPekerjaanModalProps) {
  const [progress, setProgress] = useState(subProgram.progress_percent || 0)
  const [anggaran, setAnggaran] = useState(subProgram.total_anggaran || 0)
  const [realisasi, setRealisasi] = useState(subProgram.realisasi_terkini || 0)
  const [status, setStatus] = useState(subProgram.status)
  const [vendor, setVendor] = useState(subProgram.vendor || '')
  const [linkDokumentasi, setLinkDokumentasi] = useState(subProgram.link_dokumentasi || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (progress < 0 || progress > 100) {
      setError('Progress harus antara 0-100')
      return
    }

    setSaving(true)
    const sisa = anggaran - realisasi
    const { error: err } = await adminUpdate('sub_programs', {
      progress_percent: progress,
      total_anggaran: anggaran,
      realisasi_terkini: realisasi,
      sisa_anggaran: sisa,
      status,
      vendor,
      link_dokumentasi: linkDokumentasi || null,
    }, subProgram.id)

    setSaving(false)

    if (err) {
      setError('Gagal memperbarui: ' + err.message)
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
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Update Progress</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{subProgram.nama_gedung}</div>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: 10, borderRadius: 8, backgroundColor: 'rgba(102,0,0,0.08)', color: 'var(--color-danger)', fontSize: 12 }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
            Vendor
          </label>
          <input
            type="text"
            value={vendor}
            onChange={e => setVendor(e.target.value)}
            placeholder="Nama vendor"
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              fontSize: 14,
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>
            Progress: {progress}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={e => setProgress(parseInt(e.target.value))}
            style={{ width: '100%', cursor: 'pointer' }}
          />
        </div>

        <div style={{ marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
              Total Anggaran
            </label>
            <input
              type="number"
              value={anggaran}
              onChange={e => setAnggaran(parseFloat(e.target.value) || 0)}
              min="0"
              step="100000"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                fontSize: 14,
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{formatRupiah(anggaran)}</div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
              Realisasi
            </label>
            <input
              type="number"
              value={realisasi}
              onChange={e => setRealisasi(parseFloat(e.target.value) || 0)}
              min="0"
              step="100000"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                fontSize: 14,
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ fontSize: 11, color: '#1B5E2B', marginTop: 4 }}>{formatRupiah(realisasi)}</div>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
            Status
          </label>
          <Dropdown value={status} onChange={setStatus} zIndex={Z_DROPDOWN_IN_MODAL}
            options={['Perencanaan', 'On Going', 'Selesai', 'On Hold'].map(s => ({ value: s, label: s }))} />

        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
            Link Dokumentasi (Google Drive)
          </label>
          <input
            type="text"
            value={linkDokumentasi}
            onChange={e => setLinkDokumentasi(e.target.value)}
            placeholder="https://drive.google.com/..."
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              fontSize: 14,
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={close}
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
      )}
    </ModalShell>
  )
}
