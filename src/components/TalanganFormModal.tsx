import { useState } from 'react'
import { useEscapeKey } from '../lib/useEscapeKey'
import { adminInsert, adminUpdate } from '../lib/adminApi'
import { formatRupiah } from '../lib/data'
import { Talangan } from '../lib/supabase'
import ModalShell from './ModalShell'
import Dropdown from './ui/Dropdown'
import DatePicker from './ui/DatePicker'

interface ProgramLite {
  id: string
  nama_pekerjaan: string
}

interface Props {
  programs: ProgramLite[]
  editing?: Talangan | null
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

export default function TalanganFormModal({ programs, editing, onClose, onSuccess }: Props) {
  useEscapeKey(onClose)
  const [programId, setProgramId] = useState(editing?.program_id ?? '')
  const [nominal, setNominal] = useState(editing ? String(editing.nominal) : '')
  const [tanggal, setTanggal] = useState(editing?.tanggal ?? new Date().toISOString().split('T')[0])
  const [keterangan, setKeterangan] = useState(editing?.keterangan ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    const nominalNum = parseFloat(nominal)
    if (!programId) { setError('Pilih pekerjaan dulu'); return }
    if (!nominal || nominalNum <= 0) { setError('Nominal harus lebih dari 0'); return }
    if (!tanggal) { setError('Tanggal harus diisi'); return }

    // Snapshot nama pekerjaan supaya baris tetap terbaca walau program berubah/hilang.
    const nama = programs.find(p => p.id === programId)?.nama_pekerjaan ?? editing?.nama_pekerjaan ?? null
    const payload = {
      program_id: programId,
      nama_pekerjaan: nama,
      nominal: nominalNum,
      tanggal,
      keterangan: keterangan.trim() || null,
    }

    setSaving(true)
    const { error: err } = editing
      ? await adminUpdate('talangan', payload, editing.id)
      : await adminInsert('talangan', { ...payload, status: 'berjalan' })
    setSaving(false)

    if (err) {
      setError('Gagal menyimpan: ' + ((err as { message?: string })?.message ?? 'coba lagi'))
      return
    }
    onSuccess()
    onClose()
  }

  return (
    <ModalShell onClose={onClose} maxWidth={460}>
      {close => (
        <div style={{ padding: 28 }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
              {editing ? 'Edit Talangan' : 'Catat Talangan'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Pekerjaan yang kamu bayari duluan karena dananya belum cair. Tidak masuk hitungan arus kas.
            </div>
          </div>

          {error && (
            <div style={{ marginBottom: 16, padding: 10, borderRadius: 8, backgroundColor: 'rgba(102,0,0,0.1)', color: '#660000', fontSize: 12 }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Pekerjaan</label>
            <Dropdown
              value={programId}
              onChange={setProgramId}
              zIndex={1300}
              placeholder="Pilih pekerjaan..."
              options={programs.map(p => ({ value: p.id, label: p.nama_pekerjaan }))}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Nominal Talangan</label>
            <input
              type="number"
              value={nominal}
              onChange={e => setNominal(e.target.value)}
              placeholder="0"
              min="0"
              step="1000"
              style={inputStyle}
            />
            {nominal && parseFloat(nominal) > 0 && (
              <div style={{ fontSize: 11, color: '#D97706', marginTop: 4, fontWeight: 500 }}>
                {formatRupiah(parseFloat(nominal))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Tanggal</label>
            <DatePicker value={tanggal} onChange={setTanggal} zIndex={1300} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Keterangan (opsional)</label>
            <textarea
              value={keterangan}
              onChange={e => setKeterangan(e.target.value)}
              rows={3}
              placeholder="mis. nombok tambah volume galian, dana talangan dari kas umum"
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={close}
              style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding: '10px 20px', borderRadius: 10, border: 'none', backgroundColor: 'var(--blue)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  )
}
