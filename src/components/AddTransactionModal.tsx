import { useState, useRef, useCallback } from 'react'
import { adminInsert, adminUploadBukti } from '../lib/adminApi'
import { formatRupiah } from '../lib/data'
import { Z_DROPDOWN_IN_MODAL } from '../lib/zIndex'
import ModalShell from './ModalShell'
import Dropdown from './ui/Dropdown'
import DatePicker from './ui/DatePicker'
import ProgramPicker from './ui/ProgramPicker'

const ACCEPTED = 'application/pdf,image/png,image/jpeg'
const MAX_MB = 10

// Upload goes through a PIN-gated Edge Function (see adminUploadBukti) --
// the bucket has no public write policy, so a direct storage.upload() here
// would just fail with an RLS error now.
async function uploadBukti(file: File): Promise<string> {
  const { url, error } = await adminUploadBukti(file)
  if (error || !url) throw new Error(error || 'Gagal upload file')
  return url
}

interface AddTransactionModalProps {
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

export default function AddTransactionModal({ onClose, onSuccess }: AddTransactionModalProps) {
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0])
  const [programId, setProgramId] = useState<string | null>(null)
  const [pekerjaan, setPekerjaan] = useState('')
  // "Dana PBB" tidak terikat ke satu pekerjaan tertentu — satu-satunya jalur yang
  // sengaja menyimpan program_id = null (lihat catatan produk di laporan tugas ini).
  const [isDanaPBB, setIsDanaPBB] = useState(false)
  const [keterangan, setKeterangan] = useState('')
  const [jenis, setJenis] = useState('Masuk')
  const [nominal, setNominal] = useState('')
  const [sumber, setSumber] = useState('PBB')
  const [bukti, setBukti] = useState('')
  const [buktiFile, setBuktiFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFileChange = (file: File | null) => {
    if (!file) return
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`File terlalu besar (maks ${MAX_MB} MB)`)
      return
    }
    setBuktiFile(file)
    setBukti('')
    setError('')
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileChange(file)
  }, [])

  const handleSave = async () => {
    if (!tanggal || (!isDanaPBB && !programId) || !keterangan.trim() || !nominal) {
      setError('Semua field harus diisi (kecuali Bukti)')
      return
    }

    const nominalNum = parseFloat(nominal)
    if (nominalNum <= 0) {
      setError('Nominal harus lebih dari 0')
      return
    }

    let linkBukti: string | null = bukti.trim() || null

    if (buktiFile) {
      setUploading(true)
      try {
        linkBukti = await uploadBukti(buktiFile)
      } catch (e: unknown) {
        setUploading(false)
        setError('Gagal upload file: ' + (e instanceof Error ? e.message : String(e)))
        return
      }
      setUploading(false)
    }

    setSaving(true)
    const { error: err } = await adminInsert('transactions', {
      tanggal,
      nama_pekerjaan: isDanaPBB ? 'Dana PBB' : pekerjaan,
      program_id: isDanaPBB ? null : programId,
      deskripsi: keterangan,
      jenis_transaksi: jenis,
      nominal: nominalNum,
      sumber,
      link_bukti: linkBukti,
    })
    setSaving(false)

    if (err) {
      setError('Gagal menambah transaksi: ' + err.message)
      return
    }

    onSuccess()
    onClose()
  }

  return (
    <ModalShell onClose={onClose} maxWidth={500}>
      {close => (
      <div style={{ padding: '28px' }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Tambah Transaksi</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Catat transaksi keuangan baru</div>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: 10, borderRadius: 8, backgroundColor: 'rgba(102,0,0,0.1)', color: 'var(--color-danger)', fontSize: 12 }}>
            {error}
          </div>
        )}

        {/* Tanggal */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Tanggal</label>
          <DatePicker value={tanggal} onChange={setTanggal} zIndex={Z_DROPDOWN_IN_MODAL} />
        </div>

        {/* Nama Pekerjaan */}
        <div style={{ marginBottom: 16 }}>
          {/* Dana PBB: satu-satunya transaksi yang boleh tanpa program_id — lihat catatan produk.
              Checkbox ditaruh persis di atas picker karena ini alternatif buat milih pekerjaan,
              bukan properti transaksi yang berdiri sendiri — centang/hilangin langsung
              nampilin/nyembunyiin picker di bawahnya. */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10 }}>
            <input
              type="checkbox"
              checked={isDanaPBB}
              onChange={e => { setIsDanaPBB(e.target.checked); if (e.target.checked) { setProgramId(null); setPekerjaan('Dana PBB') } else { setPekerjaan('') } }}
            />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Dana PBB (bukan terikat pekerjaan tertentu)</span>
          </label>
          {isDanaPBB ? (
            <div>
              <label style={labelStyle}>Pekerjaan</label>
              <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', color: 'var(--text-muted)', backgroundColor: 'var(--surface-subtle)' }}>
                Dana PBB (tidak terikat pekerjaan tertentu)
              </div>
            </div>
          ) : (
            <ProgramPicker
              programId={programId}
              onChangeProgram={(id, nama) => { setProgramId(id); setPekerjaan(nama) }}
              zIndex={Z_DROPDOWN_IN_MODAL}
            />
          )}
        </div>

        {/* Keterangan */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Keterangan</label>
          <textarea
            value={keterangan}
            onChange={e => setKeterangan(e.target.value)}
            rows={3}
            placeholder="Detail transaksi..."
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {/* Jenis Transaksi */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Jenis Transaksi</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['Masuk', 'Keluar', 'Keluar PBB'].map(j => (
              <label
                key={j}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                  padding: '8px 14px', borderRadius: 8,
                  border: `1px solid ${jenis === j ? 'var(--blue)' : 'var(--border)'}`,
                  backgroundColor: jenis === j ? 'rgba(26,111,232,0.07)' : 'var(--card)',
                  transition: 'all 0.12s',
                }}
              >
                <input
                  type="radio"
                  value={j}
                  checked={jenis === j}
                  onChange={e => setJenis(e.target.value)}
                  style={{ display: 'none' }}
                />
                <span style={{ fontSize: 12.5, fontWeight: jenis === j ? 600 : 400, color: jenis === j ? 'var(--blue)' : 'var(--text-secondary)' }}>
                  {j}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Nominal + Sumber */}
        <div style={{ marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Nominal</label>
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
              <div style={{ fontSize: 11, color: 'var(--blue)', marginTop: 4, fontWeight: 500 }}>
                {formatRupiah(parseFloat(nominal))}
              </div>
            )}
          </div>
          <div>
            <label style={labelStyle}>Sumber</label>
            <Dropdown
              value={sumber}
              onChange={setSumber}
              zIndex={Z_DROPDOWN_IN_MODAL}
              options={[
                { value: 'PBB', label: 'PBB' },
                { value: 'Hamzah', label: 'Hamzah' },
                { value: 'Lainnya', label: 'Lainnya' },
              ]}
            />

          </div>
        </div>

        {/* Bukti Transaksi */}
        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Bukti Transaksi (Opsional)</label>

          {/* Drop zone / file picker */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED}
            style={{ display: 'none' }}
            onChange={e => handleFileChange(e.target.files?.[0] ?? null)}
          />

          {!buktiFile ? (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? 'var(--blue)' : 'var(--border)'}`,
                borderRadius: 10,
                padding: '18px 14px',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: dragOver ? 'rgba(26,111,232,0.04)' : 'var(--bg)',
                transition: 'border-color 0.15s, background 0.15s',
                marginBottom: 8,
              }}
            >
              <svg width="24" height="24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" viewBox="0 0 24 24" style={{ margin: '0 auto 8px' }}>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 2 }}>
                Klik atau drag file ke sini
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                PDF, PNG, atau JPG · maks {MAX_MB} MB
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--bg)', marginBottom: 8 }}>
              <svg width="18" height="18" fill="none" stroke="#1B5E2B" strokeWidth="1.75" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {buktiFile.name}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                {(buktiFile.size / 1024 / 1024).toFixed(1)} MB
              </span>
              <button
                onClick={e => { e.stopPropagation(); setBuktiFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, display: 'flex', flexShrink: 0 }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          )}

          {/* Fallback: paste URL */}
          {!buktiFile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border-subtle)' }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>atau tempel link</span>
              <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border-subtle)' }} />
            </div>
          )}
          {!buktiFile && (
            <input
              type="url"
              value={bukti}
              onChange={e => setBukti(e.target.value)}
              placeholder="https://drive.google.com/..."
              style={{ ...inputStyle, marginTop: 8 }}
            />
          )}
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
            disabled={saving || uploading}
            style={{
              padding: '10px 20px', borderRadius: 10, border: 'none',
              backgroundColor: 'var(--blue)', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              opacity: (saving || uploading) ? 0.7 : 1,
            }}
          >
            {uploading ? 'Mengupload...' : saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
      )}
    </ModalShell>
  )
}
