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
  Selesai: { bg: 'rgba(27,94,43,0.12)', fg: '#047857' },
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

  // Mode "item" (Pengadaan Barang): biaya tersimpan = harga satuan, subtotal baris = biaya × ukuran.
  const rowSubtotal = (r: HasilRincianItem) =>
    mcfg.biayaPerUnit ? (Number(r.biaya) || 0) * (Number(r.ukuran) || 0) : (Number(r.biaya) || 0)
  const totBiaya = rincian.reduce((s, r) => s + rowSubtotal(r), 0)
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

  // ── Tabel seragam (mobile-tuned; auto membesar di iPad/desktop) ──
  // Hierarki tebal: hanya judul (head) & label total yang bold; data & angka
  // rincian non-bold seragam. Total dibedakan lewat strip abu + label uppercase.
  const sectionTitle = (mt: number): React.CSSProperties => ({
    fontSize: isMobile ? 11 : 11.5, fontWeight: 800, textTransform: 'uppercase',
    letterSpacing: '0.05em', color: 'var(--text-secondary)', margin: `${mt}px 2px 8px`,
  })
  const tblHead: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: '#dbe0e8', borderRadius: '9px 9px 0 0',
    padding: isMobile ? '8px 13px' : '9px 14px',
    fontSize: isMobile ? 12 : 13, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-primary)',
  }
  const tblHeadCount: React.CSSProperties = {
    fontSize: isMobile ? 10.5 : 11, fontWeight: 600, color: 'var(--text-secondary)',
  }
  const tblBody: React.CSSProperties = {
    border: '1px solid var(--border-subtle)', borderTop: 'none',
    borderRadius: '0 0 9px 9px', overflow: 'hidden',
  }
  const tblRow = (first: boolean): React.CSSProperties => ({
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10,
    padding: isMobile ? '9px 13px' : '11px 14px',
    background: 'var(--surface-raised)',
    borderTop: first ? 'none' : '1px solid var(--border-subtle)',
  })
  const tblName: React.CSSProperties = {
    fontSize: isMobile ? 12 : 13, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.35,
  }
  const tblSub: React.CSSProperties = {
    display: 'block', fontSize: isMobile ? 10 : 10.5, color: 'var(--text-muted)', marginTop: 2, fontWeight: 400,
  }
  const tblVal: React.CSSProperties = {
    fontSize: isMobile ? 12 : 13, fontWeight: 500, color: 'var(--text-primary)',
    fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
  }
  const tblFoot: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: isMobile ? '14px 13px' : '15px 14px',
    background: 'var(--surface-2)', borderTop: '1px solid var(--border-subtle)',
  }
  const tblFootLabel: React.CSSProperties = {
    fontSize: isMobile ? 10.5 : 11, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.04em', color: 'var(--text-secondary)',
  }
  const tblFootVal: React.CSSProperties = {
    fontSize: isMobile ? 12 : 13, fontWeight: 500, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums',
  }

  return (
    <div style={cardStyle}>
      {/* Header — tanpa aksen garis (dibedakan lewat tebal font saja) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '4px 2px 4px' }}>
        <h2 style={{ fontSize: isMobile ? 13.5 : 14.5, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: 'var(--text-primary)' }}>{mcfg.header}</h2>
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
                <>
                  <div style={sectionTitle(0)}>Ringkasan per Aset</div>
                  <div>
                    <div style={tblHead}>
                      <span>Per Jenis Aset</span>
                      <span style={tblHeadCount}>{asetRollup.length} aset</span>
                    </div>
                    <div style={tblBody}>
                      {asetRollup.map((a, i) => (
                        <div key={i} style={tblRow(i === 0)}>
                          <div style={{ minWidth: 0 }}>
                            <div style={tblName}>{a.aset}</div>
                            <span style={tblSub}>{a.ukuran.toLocaleString('id-ID')} {a.satuan}</span>
                          </div>
                          <div style={tblVal}>{formatRupiah(a.biaya)}</div>
                        </div>
                      ))}
                      <div style={tblFoot}>
                        <span style={tblFootLabel}>Total Keseluruhan</span>
                        <span style={tblFootVal}>{formatRupiah(totBiaya)}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {locGroups.length > 1 && (
                <div style={sectionTitle(showRingkasan ? 24 : 0)}>Rincian per Lokasi</div>
              )}
              {locGroups.map((g, gi) => (
                <div key={gi} style={{ marginTop: gi === 0 ? 0 : 12 }}>
                  <div style={tblHead}>
                    <span>{g.nama || '—'}</span>
                  </div>
                  <div style={tblBody}>
                    {g.rows.map((r, ri) => {
                      const hasAset = (r.aset || '').trim()
                      return (
                        <div key={ri} style={tblRow(ri === 0)}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ ...tblName, color: hasAset ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: hasAset ? 'normal' : 'italic' }}>
                              {hasAset || '— tanpa nama aset'}
                            </div>
                            <span style={tblSub}>{(Number(r.ukuran) || 0).toLocaleString('id-ID')} {r.satuan}</span>
                          </div>
                          <div style={tblVal}>{formatRupiah(r.biaya)}</div>
                        </div>
                      )
                    })}
                    <div style={tblFoot}>
                      <span style={tblFootLabel}>Nilai Total</span>
                      <span style={tblFootVal}>{formatRupiah(g.total)}</span>
                    </div>
                  </div>
                </div>
              ))}

              {!showRingkasan && locGroups.length > 1 && (
                <div style={{ ...tblFoot, border: '1px solid var(--border-subtle)', borderRadius: 9, marginTop: 12 }}>
                  <span style={tblFootLabel}>Total Keseluruhan</span>
                  <span style={tblFootVal}>{formatRupiah(totBiaya)}</span>
                </div>
              )}
            </>
          ) : (
            /* ── Mode ITEM / DIVISI / KEGIATAN: tabel seragam ── */
            <div>
              <div style={tblHead}>
                <span>{mode === 'item' ? 'Daftar Barang' : mode === 'divisi' ? 'Daftar Divisi' : 'Daftar Kegiatan'}</span>
              </div>
              <div style={tblBody}>
                {rincian.map((r, i) => {
                  const statusKey = (r.status || 'Rencana') as keyof typeof STATUS_CHIP
                  const chip = STATUS_CHIP[statusKey] || STATUS_CHIP.Rencana
                  return (
                    <div key={i} style={tblRow(i === 0)}>
                      <div style={{ minWidth: 0 }}>
                        <div style={tblName}>{r.nama || '-'}</div>
                        {mode === 'kegiatan' ? (
                          <span style={{ display: 'inline-block', marginTop: 4, fontSize: isMobile ? 10 : 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: chip.bg, color: chip.fg }}>{r.status || 'Rencana'}</span>
                        ) : (
                          <span style={tblSub}>
                            {(Number(r.ukuran) || 0).toLocaleString('id-ID')} {mode === 'divisi' ? 'orang' : r.satuan}
                            {mode === 'item' && ` · ${formatRupiah(Number(r.biaya) || 0)}/${r.satuan}`}
                          </span>
                        )}
                      </div>
                      <div style={tblVal}>{formatRupiah(rowSubtotal(r))}</div>
                    </div>
                  )
                })}
                <div style={tblFoot}>
                  <span style={tblFootLabel}>{mcfg.totalLabel}</span>
                  <span style={tblFootVal}>{formatRupiah(totBiaya)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
