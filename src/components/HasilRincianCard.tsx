import { useState } from 'react'
import { Program, HasilKategori, HasilRincianItem } from '../lib/supabase'
import { formatRupiah } from '../lib/data'
import { katFromJenis, rincianMode, MODE_CONFIG } from './HasilFormModal'

interface Props {
  program: Program
  isMobile: boolean
  /** Buka detail secara default (mis. saat dipakai di tampilan cetak/laporan). */
  defaultOpen?: boolean
}

/** Group rincian rows (mode lokasi) by location name → [{ nama, rows, total }]. */
function groupByLocation(items: HasilRincianItem[]) {
  const map = new Map<string, { nama: string; rows: HasilRincianItem[]; total: number }>()
  items.forEach(r => {
    const key = (r.nama || '').trim() || '—'
    if (!map.has(key)) map.set(key, { nama: r.nama || '', rows: [], total: 0 })
    const g = map.get(key)!
    g.rows.push(r)
    g.total += Number(r.biaya) || 0
  })
  return Array.from(map.values())
}

/** Roll rincian rows up by aset/material → [{ aset, ukuran, satuan, biaya }]. */
function rollupByAset(items: HasilRincianItem[]) {
  const map = new Map<string, { aset: string; ukuran: number; satuan: string; biaya: number }>()
  items.forEach(r => {
    const key = (r.aset || '').trim() || '—'
    if (!map.has(key)) map.set(key, { aset: r.aset || '—', ukuran: 0, satuan: r.satuan || '', biaya: 0 })
    const g = map.get(key)!
    g.ukuran += Number(r.ukuran) || 0
    g.biaya += Number(r.biaya) || 0
    if (!g.satuan && r.satuan) g.satuan = r.satuan
  })
  return Array.from(map.values())
}

/** Count kegiatan rows by status. */
function countStatus(items: HasilRincianItem[]) {
  let selesai = 0, berjalan = 0, rencana = 0
  items.forEach(r => {
    const s = (r.status || 'Rencana').toLowerCase()
    if (s === 'selesai') selesai++
    else if (s === 'berjalan') berjalan++
    else rencana++
  })
  return { selesai, berjalan, rencana }
}

const STATUS_CHIP: Record<string, { bg: string; fg: string }> = {
  Selesai: { bg: 'rgba(5,150,105,0.12)', fg: '#047857' },
  Berjalan: { bg: 'rgba(26,111,232,0.12)', fg: '#1A6FE8' },
  Rencana: { bg: 'rgba(217,119,6,0.13)', fg: '#B45309' },
}

/**
 * Kartu "Rincian Realisasi Pekerjaan" — tertutup secara default agar ringkas.
 * Menampilkan hanya judul + total + tombol "Tampilkan detail"; rincian per
 * lokasi/item/divisi/kegiatan baru muncul saat detail dibuka.
 */
export default function HasilRincianCard({ program, isMobile, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  const kat: HasilKategori = program.hasil_kategori || katFromJenis(program.jenis_pekerjaan)
  const rincian = program.hasil_rincian ?? []
  const mode = rincianMode(kat, program.jenis_pekerjaan)
  const mcfg = MODE_CONFIG[mode]

  const totBiaya = rincian.reduce((s, r) => s + (Number(r.biaya) || 0), 0)
  const totUkuran = rincian.reduce((s, r) => s + (Number(r.ukuran) || 0), 0)

  const locGroups = mode === 'lokasi' ? groupByLocation(rincian) : []
  const asetRollup = mode === 'lokasi' ? rollupByAset(rincian) : []
  const distinctAset = new Set(rincian.map(r => (r.aset || '').trim()).filter(Boolean))
  const showRingkasan = mode === 'lokasi' && distinctAset.size >= 2
  const statusCounts = mode === 'kegiatan' ? countStatus(rincian) : { selesai: 0, berjalan: 0, rencana: 0 }

  if (rincian.length === 0) return null

  const count =
    mode === 'lokasi' ? `${locGroups.length} lokasi`
    : mode === 'item' ? `${rincian.length} item`
    : mode === 'divisi' ? `${rincian.length} divisi`
    : `${rincian.length} kegiatan`

  const cardStyle: React.CSSProperties = {
    background: 'var(--card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 14,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    padding: isMobile ? '15px 16px' : '20px 22px',
    marginBottom: isMobile ? 11 : 14,
  }

  return (
    <div style={cardStyle}>
      {/* Header banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '4px 2px 4px' }}>
        <span style={{ width: 4, height: 17, borderRadius: 2, background: 'var(--green)' }} />
        <h2 style={{ fontSize: isMobile ? 13 : 14.5, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: 'var(--text-primary)' }}>{mcfg.header}</h2>
        <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>{count}</span>
      </div>

      {/* Toggle "Tampilkan detail" — hanya saat card collapsible (bukan sub-halaman) */}
      {!defaultOpen && (
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            width: '100%',
            marginTop: 8,
            padding: isMobile ? '9px 12px' : '10px 14px',
            borderRadius: 10,
            border: '1px solid var(--border-subtle)',
            background: open ? 'var(--surface-2)' : 'var(--surface-raised)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'background 0.15s',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--blue)' }}>
              {open ? 'Sembunyikan detail' : 'Tampilkan detail'}
            </span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
              · Total {formatRupiah(totBiaya)}
            </span>
          </span>
          <svg
            width="15" height="15" fill="none" stroke="var(--blue)" strokeWidth="2.4" viewBox="0 0 24 24"
            style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}

      {/* Body — muncul saat detail dibuka atau sub-halaman */}
      {(open || defaultOpen) && (
        <div style={{ marginTop: 13 }}>
          {/* Sub-summary chips per mode */}
          {mode === 'divisi' && (
            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', fontWeight: 600, margin: '0 2px 11px' }}>
              Total personel <b style={{ color: 'var(--text-primary)' }}>{totUkuran.toLocaleString('id-ID')}</b> orang
            </div>
          )}
          {mode === 'kegiatan' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '0 2px 11px' }}>
              {statusCounts.selesai > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 7, background: STATUS_CHIP.Selesai.bg, color: STATUS_CHIP.Selesai.fg }}>{statusCounts.selesai} selesai</span>}
              {statusCounts.berjalan > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 7, background: STATUS_CHIP.Berjalan.bg, color: STATUS_CHIP.Berjalan.fg }}>{statusCounts.berjalan} berjalan</span>}
              {statusCounts.rencana > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 7, background: STATUS_CHIP.Rencana.bg, color: STATUS_CHIP.Rencana.fg }}>{statusCounts.rencana} rencana</span>}
            </div>
          )}

          {/* ── Mode LOKASI: ringkasan per-aset (opsional) + detail per lokasi ── */}
          {mode === 'lokasi' ? (
            <>
              {showRingkasan && (
                <div style={{ borderRadius: 11, background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.15)', padding: isMobile ? '11px 13px' : '13px 15px', marginBottom: 12 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--green)', marginBottom: 9 }}>Ringkasan per Aset</div>
                  {asetRollup.map((a, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, padding: '5px 0', borderTop: i === 0 ? 'none' : '1px solid rgba(5,150,105,0.12)' }}>
                      <span style={{ fontSize: isMobile ? 12 : 13, fontWeight: 600, color: 'var(--text-primary)' }}>{a.aset}</span>
                      <span style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {a.ukuran.toLocaleString('id-ID')} {a.satuan} · {formatRupiah(a.biaya)}
                      </span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginTop: 8, paddingTop: 8, borderTop: '1.5px solid rgba(5,150,105,0.25)' }}>
                    <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>Total Keseluruhan</span>
                    <span style={{ fontSize: isMobile ? 14 : 15, fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(totBiaya)}</span>
                  </div>
                </div>
              )}

              {locGroups.map((g, gi) => (
                <div key={gi} style={{ marginTop: gi === 0 ? 0 : 14 }}>
                  <div style={{ background: '#dbe0e8', borderRadius: '9px 9px 0 0', padding: isMobile ? '8px 12px' : '9px 14px', fontSize: isMobile ? 12 : 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                    {g.nama || '—'}
                  </div>
                  <div style={{ border: '1px solid var(--border-subtle)', borderTop: 'none', borderRadius: '0 0 9px 9px', overflow: 'hidden' }}>
                    {g.rows.map((r, ri) => (
                      <div key={ri} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, padding: isMobile ? '9px 12px' : '11px 14px', background: 'var(--surface-raised)', borderTop: ri === 0 ? 'none' : '1px solid var(--border-subtle)' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 600, color: (r.aset || '').trim() ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: (r.aset || '').trim() ? 'normal' : 'italic' }}>
                            {(r.aset || '').trim() || '— tanpa nama aset'}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            {(Number(r.ukuran) || 0).toLocaleString('id-ID')} {r.satuan}
                          </div>
                        </div>
                        <div style={{ fontSize: isMobile ? 12.5 : 13.5, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{formatRupiah(r.biaya)}</div>
                      </div>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '8px 12px' : '9px 14px', background: 'var(--surface-2)', borderTop: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>Nilai Total</span>
                      <span style={{ fontSize: isMobile ? 12.5 : 13.5, fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(g.total)}</span>
                    </div>
                  </div>
                </div>
              ))}

              {!showRingkasan && locGroups.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '11px 13px' : '12px 15px', borderRadius: 11, background: 'rgba(5,150,105,0.07)', border: '1px solid rgba(5,150,105,0.15)', marginTop: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>Total Keseluruhan</span>
                  <span style={{ fontSize: isMobile ? 15 : 16, fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(totBiaya)}</span>
                </div>
              )}
            </>
          ) : (
            /* ── Mode ITEM / DIVISI / KEGIATAN: daftar datar ── */
            <>
              {rincian.map((r, i) => {
                const statusKey = (r.status || 'Rencana') as keyof typeof STATUS_CHIP
                const chip = STATUS_CHIP[statusKey] || STATUS_CHIP.Rencana
                return (
                  <div key={i} style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)', borderRadius: 11, padding: isMobile ? '11px 13px' : '13px 15px', marginBottom: 9 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ fontSize: isMobile ? 12.5 : 13.5, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', minWidth: 0 }}>{r.nama || '-'}</div>
                      <div style={{ fontSize: isMobile ? 12.5 : 13.5, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(r.biaya)}</div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 9 }}>
                      {mode === 'kegiatan' ? (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 7, background: chip.bg, color: chip.fg }}>{r.status || 'Rencana'}</span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--surface-2)', padding: '3px 9px', borderRadius: 7 }}>
                          {mcfg.midLabel} <b style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{(Number(r.ukuran) || 0).toLocaleString('id-ID')}</b>
                          {mcfg.showSatuan && <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: 10.5 }}>{r.satuan}</span>}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '11px 13px' : '12px 15px', borderRadius: 11, background: 'rgba(5,150,105,0.07)', border: '1px solid rgba(5,150,105,0.15)', marginTop: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>{mcfg.totalLabel}</span>
                <span style={{ fontSize: isMobile ? 15 : 16, fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(totBiaya)}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
