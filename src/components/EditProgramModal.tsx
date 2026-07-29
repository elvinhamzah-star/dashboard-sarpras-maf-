import { useState } from 'react'
import { useEscapeKey } from '../lib/useEscapeKey'
import { adminUpdate } from '../lib/adminApi'
import { Program } from '../lib/supabase'
import ModalShell from './ModalShell'
import Dropdown from './ui/Dropdown'
import DatePicker from './ui/DatePicker'

interface Props {
  program: Program
  onClose: () => void
  onSuccess: () => void
}

const STATUS_OPTIONS = ['On Going', 'On Hold', 'Selesai', 'Perencanaan']
// "Proyek" & "Program" ditambahkan karena itu nilai asli yang beneran dipakai
// programs.jenis_pekerjaan di data (bukan cuma "Konstruksi"/"Operasional") —
// kalau gak ada di daftar ini, dropdown nampilin "Lainnya" yang membingungkan.
const JENIS_OPTIONS = ['Proyek', 'Pengadaan', 'Konstruksi', 'Operasional', 'Pemeliharaan', 'Program', 'Lainnya']

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 9,
  border: '1px solid var(--border)',
  backgroundColor: 'var(--bg)',
  color: 'var(--text-primary)',
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
}

export default function EditProgramModal({ program, onClose, onSuccess }: Props) {
  useEscapeKey(onClose)

  const [nama, setNama] = useState(program.nama_pekerjaan)
  const [kategori, setKategori] = useState(program.program)
  const [jenis, setJenis] = useState(program.jenis_pekerjaan)
  const [jenisCustom, setJenisCustom] = useState(!JENIS_OPTIONS.includes(program.jenis_pekerjaan) ? program.jenis_pekerjaan : '')
  const [status, setStatus] = useState(program.status)
  const [vendor, setVendor] = useState(program.vendor || '')
  const [anggaran, setAnggaran] = useState(String(program.total_anggaran || ''))
  const [tanggalMulai, setTanggalMulai] = useState(program.tanggal_mulai || '')
  const [tanggalSelesai, setTanggalSelesai] = useState(program.tanggal_selesai || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Field custom (Lainnya) ditampilin & dipakai di kondisi yang sama: jenis
  // literal 'Lainnya', ATAU jenis lama yang gak ada di daftar preset (mis.
  // data lawas). Sebelumnya effectiveJenis cuma ngecek 'Lainnya' doang, jadi
  // kalau jenis-nya nilai lawas yang gak dikenal, ubahan di field custom itu
  // kepakai buat NAMPILIN tapi kePISKAN pas SIMPAN — silently reverted.
  const jenisNeedsCustomField = jenis === 'Lainnya' || !JENIS_OPTIONS.includes(jenis)
  const effectiveJenis = jenisNeedsCustomField ? jenisCustom : jenis

  const handleSave = async () => {
    if (!nama.trim()) { setError('Nama pekerjaan tidak boleh kosong'); return }
    const anggaranNum = Number(anggaran.replace(/\D/g, ''))
    if (isNaN(anggaranNum) || anggaranNum < 0) { setError('Total anggaran tidak valid'); return }

    setSaving(true)
    setError('')
    const { error: err } = await adminUpdate('programs', {
      nama_pekerjaan: nama.trim(),
      program: kategori.trim(),
      jenis_pekerjaan: effectiveJenis.trim(),
      status,
      vendor: vendor.trim() || null,
      total_anggaran: anggaranNum,
      tanggal_mulai: tanggalMulai || null,
      tanggal_selesai: tanggalSelesai || null,
    }, program.id)
    setSaving(false)
    if (err) {
      setError(err.message || 'Gagal menyimpan')
    } else {
      onSuccess()
    }
  }

  return (
    <ModalShell onClose={onClose} maxWidth={540} zIndex={300} backdropColor="rgba(13,24,41,0.6)">
      {close => (
      <div style={{ padding: '28px' }}>
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Edit Program</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{program.id}</div>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: '9px 12px', borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.08)', color: '#E53E3E', fontSize: 12 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          <Field label="Nama Pekerjaan">
            <input value={nama} onChange={e => setNama(e.target.value)} style={inputStyle} placeholder="Nama pekerjaan..." />
          </Field>

          <Field label="Kategori Program">
            <input value={kategori} onChange={e => setKategori(e.target.value)} style={inputStyle} placeholder="Misal: Warehouse & Office" />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Status">
              <Dropdown value={status} onChange={setStatus} zIndex={1300}
                options={STATUS_OPTIONS.map(s => ({ value: s, label: s }))} />
            </Field>

            <Field label="Jenis Pekerjaan">
              <Dropdown
                value={JENIS_OPTIONS.includes(jenis) ? jenis : 'Lainnya'}
                onChange={setJenis}
                zIndex={1300}
                options={JENIS_OPTIONS.map(j => ({ value: j, label: j }))}
              />
            </Field>
          </div>

          {jenisNeedsCustomField && (
            <Field label="Jenis Pekerjaan (Lainnya)">
              <input value={jenisCustom} onChange={e => setJenisCustom(e.target.value)} style={inputStyle} placeholder="Masukkan jenis pekerjaan..." />
            </Field>
          )}

          <Field label="Vendor">
            <input value={vendor} onChange={e => setVendor(e.target.value)} style={inputStyle} placeholder="Nama vendor..." />
          </Field>

          <Field label="Total Anggaran (Rp)">
            <input
              value={anggaran}
              onChange={e => setAnggaran(e.target.value.replace(/\D/g, ''))}
              style={{ ...inputStyle, fontVariantNumeric: 'tabular-nums' }}
              placeholder="0"
              inputMode="numeric"
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Tanggal Mulai">
              <DatePicker value={tanggalMulai} onChange={setTanggalMulai} zIndex={1300} />
            </Field>
            <Field label="Tanggal Selesai">
              <DatePicker value={tanggalSelesai} onChange={setTanggalSelesai} zIndex={1300} />
            </Field>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={close}
            style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: '10px 20px', borderRadius: 10, border: 'none', backgroundColor: 'var(--blue)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}
          >
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
      )}
    </ModalShell>
  )
}
