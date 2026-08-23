import { useState, useEffect } from 'react'
import { adminInsert } from '../lib/adminApi'
import { fetchPrograms } from '../lib/supabase'
import { Z_DROPDOWN_IN_MODAL } from '../lib/zIndex'
import ModalShell from './ModalShell'
import Dropdown from './ui/Dropdown'

interface AddPekerjaanModalProps {
  onClose: () => void
  onAdded: () => void
}

const STATUS_OPTIONS = ['Perencanaan', 'On Going', 'Selesai', 'On Hold']

/** Next unused "P-XXX" id, zero-padded to match the widest existing id. */
function suggestNextId(existingIds: string[]): string {
  const numbered = existingIds
    .map(id => id.match(/^P-(\d+)$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map(m => ({ num: parseInt(m[1], 10), width: m[1].length }))
  if (numbered.length === 0) return 'P-001'
  const maxWidth = Math.max(...numbered.map(n => n.width))
  const nextNum = Math.max(...numbered.map(n => n.num)) + 1
  return `P-${String(nextNum).padStart(maxWidth, '0')}`
}

export default function AddPekerjaanModal({ onClose, onAdded }: AddPekerjaanModalProps) {
  const [existingIds, setExistingIds] = useState<Set<string>>(new Set())
  const [form, setForm] = useState({
    id: '',
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

  // Pre-fill with the next free "P-XXX" id and load existing ids for the
  // duplicate check on save — the id is the primary key, so a collision
  // would otherwise only surface as a raw DB error after Simpan is clicked.
  useEffect(() => {
    fetchPrograms().then(({ data }) => {
      if (!data) return
      const ids = new Set(data.map(p => p.id))
      setExistingIds(ids)
      setForm(f => f.id ? f : { ...f, id: suggestNextId(Array.from(ids)) })
    })
  }, [])

  const update = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  const handleSave = async () => {
    if (!form.id.trim()) {
      setError('ID wajib diisi.')
      return
    }
    if (existingIds.has(form.id.trim())) {
      setError(`ID ${form.id.trim()} sudah dipakai program lain — pilih ID yang berbeda.`)
      return
    }
    if (!form.nama_pekerjaan.trim()) {
      setError('Nama pekerjaan wajib diisi.')
      return
    }
    setSaving(true)
    setError('')
    const totalAnggaran = parseFloat(form.total_anggaran) || 0
    const realisasi = parseFloat(form.realisasi_terkini) || 0
    const { error: err } = await adminInsert('programs', {
      id: form.id,
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
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 14,
    color: 'var(--text-primary)',
    outline: 'none',
    backgroundColor: 'var(--card)',
  }

  const labelStyle = {
    fontSize: 11,
    fontWeight: 600 as const,
    color: 'var(--text-muted)',
    display: 'block' as const,
    marginBottom: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
  }

  const fields: { key: string; label: string; type?: string; options?: string[] }[] = [
    { key: 'id', label: 'ID (e.g., P-001)' },
    { key: 'program', label: 'Program' },
    { key: 'nama_pekerjaan', label: 'Nama Pekerjaan' },
    { key: 'jenis_pekerjaan', label: 'Jenis Pekerjaan' },
    { key: 'status', label: 'Status', options: STATUS_OPTIONS },
    { key: 'progress_percent', label: 'Progress (%)', type: 'number' },
    { key: 'total_anggaran', label: 'Total Anggaran (Rp)', type: 'number' },
    { key: 'realisasi_terkini', label: 'Realisasi Terkini (Rp)', type: 'number' },
    { key: 'vendor', label: 'Vendor' },
    { key: 'isu_utama', label: 'Isu Utama' },
    { key: 'link_rab_detail', label: 'Link RAB (opsional)' },
    { key: 'link_dokumentasi', label: 'Link Dokumentasi (opsional)' },
    { key: 'link_bukti_transaksi', label: 'Link Bukti Transaksi (opsional)' },
  ]

  return (
    <ModalShell onClose={onClose} maxWidth={560}>
      {close => (
      <div style={{ padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Tambah Pekerjaan</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Tambahkan program pekerjaan baru</div>
          </div>
          <button
            onClick={close}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: 10, borderRadius: 8, backgroundColor: 'rgba(102,0,0,0.08)', color: 'var(--color-danger)', fontSize: 12 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {fields.map(f => (
            <div key={f.key} style={{ gridColumn: ['program','nama_pekerjaan','isu_utama','link_rab_detail','link_dokumentasi','link_bukti_transaksi'].includes(f.key) ? 'span 2' : f.key === 'id' ? 'span 1' : 'span 1' }}>
              <label style={labelStyle}>{f.label}</label>
              {f.options ? (
                <Dropdown
                  value={form[f.key as keyof typeof form]}
                  onChange={v => update(f.key, v)}
                  zIndex={Z_DROPDOWN_IN_MODAL}
                  options={f.options.map(o => ({ value: o, label: o }))}
                />
              ) : (
                <input
                  type={f.type || 'text'}
                  value={form[f.key as keyof typeof form]}
                  onChange={e => update(f.key, e.target.value)}
                  style={{ ...inputStyle, boxSizing: 'border-box', ...(f.key === 'id' && existingIds.has(form.id.trim()) ? { borderColor: 'var(--color-danger)' } : {}) }}
                />
              )}
              {f.key === 'id' && existingIds.has(form.id.trim()) && (
                <div style={{ fontSize: 11, color: 'var(--color-danger)', marginTop: 4 }}>
                  ID ini sudah dipakai program lain.
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 24 }}>
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
