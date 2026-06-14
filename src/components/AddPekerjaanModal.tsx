import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface AddPekerjaanModalProps {
  onClose: () => void
  onAdded: () => void
}

const STATUS_OPTIONS = ['Perencanaan', 'On Going', 'Selesai', 'On Hold']

export default function AddPekerjaanModal({ onClose, onAdded }: AddPekerjaanModalProps) {
  const [form, setForm] = useState({
    program: '',
    nama_pekerjaan: '',
    jenis_pekerjaan: '',
    status: 'Perencanaan',
    progress_percent: '0',
    total_anggaran: '',
    realisasi_terkini: '0',
    vendor: '',
    isu_utama: '',
    link_rab_detail: '',
    link_dokumentasi: '',
    link_bukti_transaksi: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const update = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  const handleSave = async () => {
    if (!form.nama_pekerjaan.trim()) {
      setError('Nama pekerjaan wajib diisi.')
      return
    }
    setSaving(true)
    setError('')
    const totalAnggaran = parseFloat(form.total_anggaran) || 0
    const realisasi = parseFloat(form.realisasi_terkini) || 0
    const { error: err } = await supabase.from('programs').insert({
      program: form.program,
      nama_pekerjaan: form.nama_pekerjaan,
      jenis_pekerjaan: form.jenis_pekerjaan,
      status: form.status,
      progress_percent: parseFloat(form.progress_percent) || 0,
      total_anggaran: totalAnggaran,
      realisasi_terkini: realisasi,
      sisa_anggaran: totalAnggaran - realisasi,
      vendor: form.vendor,
      isu_utama: form.isu_utama,
      link_rab_detail: form.link_rab_detail || null,
      link_dokumentasi: form.link_dokumentasi || null,
      link_bukti_transaksi: form.link_bukti_transaksi || null,
    })
    setSaving(false)
    if (err) {
      setError(err.message)
    } else {
      onAdded()
    }
  }

  const inputStyle = {
    width: '100%',
    border: '1px solid rgba(26,43,94,0.15)',
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 13,
    color: '#0D1829',
    outline: 'none',
    backgroundColor: '#fff',
  }

  const labelStyle = {
    fontSize: 11,
    fontWeight: 600 as const,
    color: '#6B7A99',
    display: 'block' as const,
    marginBottom: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
  }

  const fields: { key: string; label: string; type?: string; options?: string[] }[] = [
    { key: 'program', label: 'Program' },
    { key: 'nama_pekerjaan', label: 'Nama Pekerjaan' },
    { key: 'jenis_pekerjaan', label: 'Jenis Pekerjaan' },
    { key: 'status', label: 'Status', options: STATUS_OPTIONS },
    { key: 'progress_percent', label: 'Progress (%)', type: 'number' },
    { key: 'total_anggaran', label: 'Total Anggaran (Rp)', type: 'number' },
    { key: 'realisasi_terkini', label: 'Realisasi Terkini (Rp)', type: 'number' },
    { key: 'vendor', label: 'Vendor' },
    { key: 'isu_utama', label: 'Isu Utama' },
    { key: 'link_rab_detail', label: 'Link RAB Detail (opsional)' },
    { key: 'link_dokumentasi', label: 'Link Dokumentasi (opsional)' },
    { key: 'link_bukti_transaksi', label: 'Link Bukti Transaksi (opsional)' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 16,
          padding: 28,
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          overflowY: 'auto',
          margin: 16,
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0D1829', margin: 0 }}>Tambah Pekerjaan</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7A99' }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {fields.map(f => (
            <div key={f.key} style={{ gridColumn: ['program','nama_pekerjaan','isu_utama','link_rab_detail','link_dokumentasi','link_bukti_transaksi'].includes(f.key) ? 'span 2' : 'span 1' }}>
              <label style={labelStyle}>{f.label}</label>
              {f.options ? (
                <select
                  value={form[f.key as keyof typeof form]}
                  onChange={e => update(f.key, e.target.value)}
                  style={inputStyle}
                >
                  {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input
                  type={f.type || 'text'}
                  value={form[f.key as keyof typeof form]}
                  onChange={e => update(f.key, e.target.value)}
                  style={inputStyle}
                />
              )}
            </div>
          ))}
        </div>

        {error && (
          <p style={{ color: '#ef4444', fontSize: 13, marginTop: 12 }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: 12, borderRadius: 10,
              border: '1px solid rgba(26,43,94,0.15)',
              background: 'transparent', color: '#6B7A99',
              fontWeight: 600, cursor: 'pointer', fontSize: 14,
            }}
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1, padding: 12, borderRadius: 10,
              border: 'none',
              backgroundColor: '#0858b0', color: '#fff',
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: 14,
            }}
          >
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}
