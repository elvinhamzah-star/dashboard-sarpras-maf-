import { useState } from 'react'
import { useEscapeKey } from '../lib/useEscapeKey'
import { adminUpdate } from '../lib/adminApi'
import { Program, HasilKategori, HasilRincianItem } from '../lib/supabase'
import { formatRupiah } from '../lib/data'
import ModalShell from './ModalShell'

interface Props {
  program: Program
  onClose: () => void
  onSuccess: () => void
}

/** Auto-pilih kategori dari jenis_pekerjaan (admin masih bisa ubah manual). */
export function katFromJenis(jenis: string): HasilKategori {
  if (jenis === 'Pengadaan') return 'barang'
  if (jenis === 'Operasional' || jenis === 'Program' || jenis === 'Pemeliharaan') return 'jasa'
  return 'fisik' // Proyek, Konstruksi, dan default
}

interface KatConfig {
  nilaiLabel: string
  nilaiHint: (realisasi: number) => string
  rincian: boolean
  rincianLabel: string
  addLabel: string
  colUkuran: string
  satuan: string
  totalLabel: string
  namaPlaceholder: string
}

const KAT_CONFIG: Record<HasilKategori, KatConfig> = {
  fisik: {
    nilaiLabel: 'Nilai Aset (Rp)',
    nilaiHint: r => `Otomatis mengikuti total realisasi (${formatRupiah(r)}). Ubah bila nilai perolehan aset berbeda.`,
    rincian: true,
    rincianLabel: 'Rincian Hasil per Lokasi',
    addLabel: 'Tambah lokasi',
    colUkuran: 'Luas',
    satuan: 'm²',
    totalLabel: 'Total Keseluruhan',
    namaPlaceholder: 'Nama lokasi...',
  },
  barang: {
    nilaiLabel: 'Nilai Pengadaan (Rp)',
    nilaiHint: () => 'Total nilai barang yang diadakan. Otomatis mengikuti total realisasi, dapat diubah.',
    rincian: true,
    rincianLabel: 'Rincian Pengadaan per Item',
    addLabel: 'Tambah item',
    colUkuran: 'Jumlah',
    satuan: 'unit',
    totalLabel: 'Total Pengadaan',
    namaPlaceholder: 'Nama item...',
  },
  jasa: {
    nilaiLabel: 'Total Realisasi (Rp)',
    nilaiHint: () => 'Total realisasi biaya operasional. Tidak menghasilkan aset fisik.',
    rincian: false,
    rincianLabel: '',
    addLabel: '',
    colUkuran: '',
    satuan: '',
    totalLabel: '',
    namaPlaceholder: '',
  },
}

// ─── Rupiah helpers ───────────────────────────────────────────────────────
const digitsToNumber = (s: string) => Number(String(s).replace(/\D/g, '')) || 0
const formatDigits = (s: string | number) => {
  const n = digitsToNumber(String(s))
  return n ? n.toLocaleString('id-ID') : ''
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

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-muted)',
  display: 'block',
  marginBottom: 7,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

const capStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: 4,
  display: 'block',
}

export default function HasilFormModal({ program, onClose, onSuccess }: Props) {
  useEscapeKey(onClose)

  const initialKat: HasilKategori = program.hasil_kategori || katFromJenis(program.jenis_pekerjaan)
  const [kat, setKat] = useState<HasilKategori>(initialKat)
  const [nilai, setNilai] = useState<string>(
    formatDigits(program.hasil_nilai_aset ?? program.realisasi_terkini ?? 0),
  )
  const [dampak, setDampak] = useState<string[]>(
    program.hasil_dampak && program.hasil_dampak.length > 0 ? program.hasil_dampak : [''],
  )
  const [rincian, setRincian] = useState<HasilRincianItem[]>(() => {
    if (program.hasil_rincian && program.hasil_rincian.length > 0) return program.hasil_rincian
    const c = KAT_CONFIG[initialKat]
    return c.rincian ? [{ nama: '', ukuran: 0, satuan: c.satuan, biaya: 0 }] : []
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const cfg = KAT_CONFIG[kat]

  const changeKat = (k: HasilKategori) => {
    setKat(k)
    const c = KAT_CONFIG[k]
    // Isi ulang satuan default + pastikan minimal 1 baris rincian saat pindah ke fisik/barang
    setRincian(prev => {
      if (!c.rincian) return prev
      const rows = prev.length > 0 ? prev : [{ nama: '', ukuran: 0, satuan: c.satuan, biaya: 0 }]
      return rows.map(r => ({ ...r, satuan: r.satuan || c.satuan }))
    })
  }

  // Dampak handlers
  const setDampakAt = (i: number, v: string) => setDampak(d => d.map((x, idx) => (idx === i ? v : x)))
  const addDampak = () => setDampak(d => [...d, ''])
  const delDampak = (i: number) => setDampak(d => (d.length > 1 ? d.filter((_, idx) => idx !== i) : d))

  // Rincian handlers
  const setRincianAt = (i: number, patch: Partial<HasilRincianItem>) =>
    setRincian(r => r.map((x, idx) => (idx === i ? { ...x, ...patch } : x)))
  const addRincian = () => setRincian(r => [...r, { nama: '', ukuran: 0, satuan: cfg.satuan, biaya: 0 }])
  const delRincian = (i: number) => setRincian(r => r.filter((_, idx) => idx !== i))

  // Live total
  const totUkuran = rincian.reduce((s, r) => s + (Number(r.ukuran) || 0), 0)
  const totBiaya = rincian.reduce((s, r) => s + (Number(r.biaya) || 0), 0)
  const perUnit = totUkuran > 0 ? Math.round(totBiaya / totUkuran) : 0

  const handleSave = async () => {
    const nilaiNum = digitsToNumber(nilai)
    const cleanDampak = dampak.map(d => d.trim()).filter(Boolean)
    const cleanRincian = cfg.rincian
      ? rincian
          .filter(r => r.nama.trim() || r.ukuran || r.biaya)
          .map(r => ({
            nama: r.nama.trim(),
            ukuran: Number(r.ukuran) || 0,
            satuan: r.satuan.trim() || cfg.satuan,
            biaya: Number(r.biaya) || 0,
          }))
      : []

    setSaving(true)
    setError('')
    const { error: err } = await adminUpdate(
      'programs',
      {
        hasil_kategori: kat,
        hasil_nilai_aset: nilaiNum,
        hasil_dampak: cleanDampak,
        hasil_rincian: cleanRincian,
        hasil_filled_at: new Date().toISOString(),
      },
      program.id,
    )
    setSaving(false)
    if (err) setError(err.message || 'Gagal menyimpan data hasil')
    else onSuccess()
  }

  return (
    <ModalShell onClose={onClose} maxWidth={560} zIndex={320} backdropColor="rgba(13,24,41,0.6)">
      {close => (
        <div>
          {/* Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '13px 20px',
              background: 'rgba(26,111,232,0.06)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <svg width="18" height="18" fill="none" stroke="var(--blue)" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 1 }}>
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <circle cx="12" cy="12" r="9" />
            </svg>
            <div>
              <b style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                Pekerjaan ditandai Selesai — lengkapi data hasil
              </b>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.45 }}>
                Data ini tampil sebagai laporan hasil pekerjaan untuk presentasi.
              </p>
            </div>
          </div>

          {/* Head */}
          <div style={{ padding: '20px 24px 0' }}>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              Data Hasil Pekerjaan
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              {program.id} · {program.nama_pekerjaan}
            </div>
          </div>

          {error && (
            <div style={{ margin: '14px 24px 0', padding: '9px 12px', borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.08)', color: '#E53E3E', fontSize: 12 }}>
              {error}
            </div>
          )}

          {/* Form */}
          <div style={{ padding: '18px 24px 4px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Kategori */}
            <div>
              <label style={labelStyle}>Kategori Hasil</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {([
                  ['fisik', 'Proyek / Fisik', 'Bangunan, paving, taman'],
                  ['barang', 'Pengadaan Barang', 'Alat, perlengkapan, seragam'],
                  ['jasa', 'Operasional / Jasa', 'Man power, kebersihan'],
                ] as [HasilKategori, string, string][]).map(([k, t, d]) => {
                  const active = kat === k
                  return (
                    <button
                      key={k}
                      onClick={() => changeKat(k)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: 3,
                        padding: '11px 12px',
                        borderRadius: 11,
                        cursor: 'pointer',
                        border: `1.5px solid ${active ? 'var(--blue)' : 'var(--border)'}`,
                        background: active ? 'var(--blue-light)' : 'var(--surface-raised)',
                        textAlign: 'left',
                        transition: 'all .15s',
                        fontFamily: 'inherit',
                      }}
                    >
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: active ? 'var(--blue-dark)' : 'var(--text-primary)' }}>{t}</span>
                      <span style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.3 }}>{d}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Nilai */}
            <div>
              <label style={labelStyle}>{cfg.nilaiLabel}</label>
              <input
                value={nilai}
                onChange={e => setNilai(formatDigits(e.target.value))}
                inputMode="numeric"
                style={{ ...inputStyle, fontVariantNumeric: 'tabular-nums' }}
                placeholder="0"
              />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5, lineHeight: 1.4 }}>
                {cfg.nilaiHint(program.realisasi_terkini ?? 0)}
              </div>
            </div>

            {/* Dampak & Manfaat */}
            <div>
              <label style={labelStyle}>Dampak &amp; Manfaat</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {dampak.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
                    <input
                      value={d}
                      onChange={e => setDampakAt(i, e.target.value)}
                      placeholder="Poin dampak / manfaat..."
                      style={inputStyle}
                    />
                    <button onClick={() => delDampak(i)} style={delBtnStyle} aria-label="Hapus poin">✕</button>
                  </div>
                ))}
              </div>
              <button onClick={addDampak} style={addBtnStyle}>＋ Tambah poin</button>
            </div>

            {/* Rincian (fisik/barang) */}
            {cfg.rincian && (
              <div>
                <label style={labelStyle}>{cfg.rincianLabel}</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {rincian.map((r, i) => (
                    <div
                      key={i}
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        padding: 12,
                        background: 'var(--surface-raised)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 9,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          value={r.nama}
                          onChange={e => setRincianAt(i, { nama: e.target.value })}
                          placeholder={cfg.namaPlaceholder}
                          style={{ ...inputStyle, fontWeight: 600 }}
                        />
                        <button onClick={() => delRincian(i)} style={delBtnStyle} aria-label="Hapus baris">✕</button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 1.3fr', gap: 8 }}>
                        <div>
                          <span style={capStyle}>{cfg.colUkuran}</span>
                          <input
                            type="number"
                            value={r.ukuran || ''}
                            onChange={e => setRincianAt(i, { ukuran: Number(e.target.value) || 0 })}
                            placeholder="0"
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <span style={capStyle}>Satuan</span>
                          <input
                            value={r.satuan}
                            onChange={e => setRincianAt(i, { satuan: e.target.value })}
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <span style={capStyle}>Biaya (Rp)</span>
                          <input
                            value={r.biaya ? r.biaya.toLocaleString('id-ID') : ''}
                            onChange={e => setRincianAt(i, { biaya: digitsToNumber(e.target.value) })}
                            inputMode="numeric"
                            placeholder="0"
                            style={{ ...inputStyle, fontVariantNumeric: 'tabular-nums' }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={addRincian} style={addBtnStyle}>＋ {cfg.addLabel}</button>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    padding: '11px 13px',
                    borderRadius: 10,
                    background: 'rgba(5,150,105,0.07)',
                    marginTop: 10,
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {cfg.totalLabel}
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                    {kat === 'fisik' ? (
                      <>
                        {totUkuran.toLocaleString('id-ID')} {cfg.satuan}
                        <small style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--green)' }}>
                          ≈ Rp {perUnit.toLocaleString('id-ID')} / {cfg.satuan}
                        </small>
                      </>
                    ) : (
                      <>
                        {rincian.length} item
                        <small style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--green)' }}>
                          Rp {totBiaya.toLocaleString('id-ID')}
                        </small>
                      </>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '16px 24px 22px', marginTop: 6 }}>
            <button
              onClick={close}
              style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Nanti Saja
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: 'var(--blue)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}
            >
              {saving ? 'Menyimpan...' : 'Simpan Data Hasil'}
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  )
}

const delBtnStyle: React.CSSProperties = {
  flexShrink: 0,
  width: 34,
  height: 34,
  borderRadius: 9,
  cursor: 'pointer',
  border: '1px solid var(--border)',
  background: 'var(--card)',
  color: 'var(--text-muted)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 13,
  fontFamily: 'inherit',
}

const addBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  alignSelf: 'flex-start',
  padding: '7px 12px',
  borderRadius: 9,
  cursor: 'pointer',
  fontFamily: 'inherit',
  border: '1px dashed var(--border)',
  background: 'var(--card)',
  color: 'var(--blue)',
  fontSize: 12.5,
  fontWeight: 600,
  marginTop: 9,
}
