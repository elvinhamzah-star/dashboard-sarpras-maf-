/**
 * LaporanAset
 *
 * Admin-only page: Laporan Perolehan Aset
 * Rekap seluruh hasil_rincian dari pekerjaan Selesai,
 * dikelompokkan per pekerjaan, dengan filter kategori dan export.
 */

import { useEffect, useState } from 'react'
import { fetchPrograms } from '../lib/supabase'
import { Program, HasilKategori, HasilRincianItem } from '../lib/supabase'
import { formatRupiah } from '../lib/data'
import { useWindowWidth } from '../lib/useWindowWidth'
import { katFromJenis, rincianMode, RincianMode } from './HasilFormModal'

type KatFilter = 'semua' | HasilKategori

const KAT_LABELS: Record<HasilKategori, string> = {
  fisik:  'Proyek / Fisik',
  barang: 'Pengadaan Barang',
  jasa:   'Operasional / Jasa',
}

const KAT_COLORS: Record<HasilKategori, string> = {
  fisik:  '#1A6FE8',
  barang: '#059669',
  jasa:   '#D97706',
}

const STATUS_CHIP: Record<string, { bg: string; fg: string }> = {
  Selesai:  { bg: 'rgba(5,150,105,0.12)', fg: '#047857' },
  Berjalan: { bg: 'rgba(26,111,232,0.12)', fg: '#1A6FE8' },
  Rencana:  { bg: 'rgba(217,119,6,0.13)', fg: '#B45309' },
}

/** Kolom tabel rincian menyesuaikan mode (fisik→lokasi, barang→item, jasa→divisi/kegiatan). */
interface ReportCol {
  key: 'no' | 'nama' | 'aset' | 'ukuran' | 'satuan' | 'status' | 'biaya'
  label: string
  align: 'left' | 'center' | 'right'
  /** Lebar kolom dalam persen — total harus 100%. */
  pct: string
}

function columnsForMode(mode: RincianMode): ReportCol[] {
  switch (mode) {
    case 'lokasi':
      return [
        { key: 'no', label: 'No', align: 'center', pct: '5%' },
        { key: 'nama', label: 'Lokasi', align: 'left', pct: '22%' },
        { key: 'aset', label: 'Aset', align: 'left', pct: '28%' },
        { key: 'ukuran', label: 'Volume', align: 'right', pct: '12%' },
        { key: 'satuan', label: 'Satuan', align: 'left', pct: '13%' },
        { key: 'biaya', label: 'Nilai', align: 'right', pct: '20%' },
      ]
    case 'item':
      return [
        { key: 'no', label: 'No', align: 'center', pct: '6%' },
        { key: 'nama', label: 'Barang', align: 'left', pct: '39%' },
        { key: 'ukuran', label: 'Jumlah', align: 'right', pct: '15%' },
        { key: 'satuan', label: 'Satuan', align: 'left', pct: '15%' },
        { key: 'biaya', label: 'Nilai', align: 'right', pct: '25%' },
      ]
    case 'divisi':
      return [
        { key: 'no', label: 'No', align: 'center', pct: '7%' },
        { key: 'nama', label: 'Divisi', align: 'left', pct: '43%' },
        { key: 'ukuran', label: 'Personel', align: 'right', pct: '20%' },
        { key: 'biaya', label: 'Nilai', align: 'right', pct: '30%' },
      ]
    case 'kegiatan':
      return [
        { key: 'no', label: 'No', align: 'center', pct: '7%' },
        { key: 'nama', label: 'Kegiatan', align: 'left', pct: '43%' },
        { key: 'status', label: 'Status', align: 'left', pct: '20%' },
        { key: 'biaya', label: 'Nilai', align: 'right', pct: '30%' },
      ]
  }
}

interface ProgramRow {
  program: Program
  rincian: HasilRincianItem[]
  totalBiaya: number
}

export default function LaporanAset() {
  const width = useWindowWidth()
  const isMobile = width < 600

  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<KatFilter>('semua')

  useEffect(() => {
    fetchPrograms().then(({ data }) => {
      if (data) setPrograms(data as Program[])
      setLoading(false)
    })
  }, [])

  // Split: Selesai dengan data vs belum diisi
  const selesai = programs.filter(p => p.status === 'Selesai')
  const withData  = selesai.filter(p => (p.hasil_rincian?.length ?? 0) > 0)
  const noData    = selesai.filter(p => (p.hasil_rincian?.length ?? 0) === 0)

  // Count per kategori
  const counts: Record<KatFilter, number> = {
    semua:  withData.length,
    fisik:  withData.filter(p => p.hasil_kategori === 'fisik').length,
    barang: withData.filter(p => p.hasil_kategori === 'barang').length,
    jasa:   withData.filter(p => p.hasil_kategori === 'jasa').length,
  }

  // Apply filter
  const filtered: ProgramRow[] = withData
    .filter(p => filter === 'semua' || p.hasil_kategori === filter)
    .map(p => {
      const rincian = p.hasil_rincian ?? []
      return {
        program: p,
        rincian,
        totalBiaya: rincian.reduce((s, r) => s + (r.biaya ?? 0), 0),
      }
    })

  // Summary
  const totalNilai   = filtered.reduce((s, r) => s + r.totalBiaya, 0)
  const totalItems   = filtered.reduce((s, r) => s + r.rincian.length, 0)
  const totalProgram = filtered.length

  // ── Export CSV ──────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const rows: string[][] = [
      ['No', 'ID Pekerjaan', 'Nama Pekerjaan', 'Kategori', 'Lokasi / Item', 'Aset / Material', 'Volume', 'Satuan', 'Biaya (Rp)'],
    ]
    let no = 1
    filtered.forEach(({ program: p, rincian }) => {
      rincian.forEach(r => {
        rows.push([
          String(no++),
          p.id,
          p.nama_pekerjaan,
          KAT_LABELS[p.hasil_kategori as HasilKategori] ?? '-',
          r.nama,
          r.aset ?? '-',
          String(r.ukuran ?? ''),
          r.satuan ?? '',
          String(r.biaya ?? 0),
        ])
      })
    })
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `laporan-perolehan-aset-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Export PDF (print) ──────────────────────────────────────────────────────
  const exportPDF = () => window.print()

  // ── Styles ──────────────────────────────────────────────────────────────────
  const ps = isMobile ? '16px 14px' : '28px 28px 48px'

  // Sub-header per group (kolom header di dalam setiap pekerjaan)
  const subThStyle: React.CSSProperties = {
    padding: isMobile ? '6px 8px' : '8px 12px',
    fontSize: isMobile ? 9 : 10.5,
    fontWeight: 700,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.055em',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    borderBottom: '1px solid var(--border)',
    backgroundColor: 'var(--card)',
  }

  const tdStyle: React.CSSProperties = {
    padding: isMobile ? '7px 8px' : '9px 12px',
    fontSize: isMobile ? 12 : 13,
    color: 'var(--text-primary)',
    verticalAlign: 'middle',
    borderBottom: '1px solid var(--border-subtle)',
  }

  const groupHeaderStyle: React.CSSProperties = {
    padding: isMobile ? '9px 10px' : '10px 14px',
    backgroundColor: 'var(--surface-raised)',
    borderBottom: '1px solid var(--border)',
    borderTop: '1px solid var(--border)',
  }

  if (loading) {
    return (
      <div style={{ padding: ps }}>
        <div className="skeleton" style={{ width: 200, height: 28, borderRadius: 8, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: 280, height: 16, borderRadius: 6, marginBottom: 32 }} />
        <div className="skeleton" style={{ width: '100%', height: 220, borderRadius: 12 }} />
      </div>
    )
  }

  return (
    <>
      {/* ── Print styles ──────────────────────────────────────────────────── */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #laporan-aset-print { display: block !important; }
          #laporan-aset-print .no-print { display: none !important; }
          @page { margin: 16mm; size: A4 landscape; }
        }
      `}</style>

      <div id="laporan-aset-print" style={{ padding: ps, width: '100%', boxSizing: 'border-box', animation: 'pageSlideIn 0.2s ease' }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 12 }}>
          <div>
            <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', margin: 0 }}>
              Laporan Perolehan Aset
            </h1>
            <p style={{ fontSize: isMobile ? 12 : 13.5, color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>
              Inventaris aset dan material per kategori pekerjaan
            </p>
          </div>

          {/* Export buttons */}
          <div className="no-print" style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              onClick={exportCSV}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: isMobile ? '7px 11px' : '8px 14px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text-secondary)', fontSize: isMobile ? 11.5 : 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--blue)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--blue)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)' }}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              CSV
            </button>
            <button
              onClick={exportPDF}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: isMobile ? '7px 11px' : '8px 14px', borderRadius: 9, border: '1px solid var(--blue)', background: 'var(--blue)', color: '#fff', fontSize: isMobile ? 11.5 : 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--blue-dark)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--blue)' }}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              PDF
            </button>
          </div>
        </div>

        {/* ── Summary cards ────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isMobile ? 8 : 12, marginBottom: isMobile ? 10 : 12 }}>
          {[
            { label: 'Total Nilai Aset', value: formatRupiah(totalNilai), accent: 'var(--blue)' },
            { label: 'Jumlah Pekerjaan', value: `${totalProgram}`, accent: '#0f766e' },
            { label: 'Jumlah Item', value: `${totalItems}`, accent: '#b45309' },
          ].map((c, i) => (
            <div key={i} style={{ backgroundColor: 'var(--card)', borderRadius: 12, padding: isMobile ? '10px 12px' : '14px 16px', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', textAlign: 'center' }}>
              <div style={{ fontSize: isMobile ? 9 : 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{c.label}</div>
              <div style={{ fontSize: isMobile ? 14 : 18, fontWeight: 800, color: c.accent, letterSpacing: '-0.02em' }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* ── Filter tabs ──────────────────────────────────────────────────── */}
        <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: isMobile ? 6 : 8, marginBottom: 20 }}>
          {(['semua', 'fisik', 'barang', 'jasa'] as KatFilter[]).map(k => {
            const active = filter === k
            const color = k === 'semua' ? 'var(--blue)' : KAT_COLORS[k as HasilKategori]
            const label = k === 'semua' ? 'Semua' : KAT_LABELS[k as HasilKategori]
            return (
              <button
                key={k}
                onClick={() => setFilter(k)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 3, padding: isMobile ? '10px 6px' : '11px 10px',
                  borderRadius: 10,
                  border: `1.5px solid ${active ? color : 'var(--border-subtle)'}`,
                  background: active ? `${color}0f` : 'var(--card)',
                  color: active ? color : 'var(--text-muted)',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                  boxShadow: active ? `0 0 0 3px ${color}15` : '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <span style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color: active ? color : 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  {counts[k]}
                </span>
                <span style={{ fontSize: isMobile ? 9.5 : 10.5, fontWeight: 600, letterSpacing: '0.04em', marginTop: 1, textTransform: 'uppercase' }}>
                  {label}
                </span>
              </button>
            )
          })}
        </div>

        {/* ── Per-pekerjaan floating cards ─────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div style={{ backgroundColor: 'var(--card)', borderRadius: 14, border: '1px solid var(--border-subtle)', padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
            Tidak ada data untuk kategori ini.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 12, marginBottom: 20 }}>
            {(() => {
              let no = 1
              return filtered.map(({ program: p, rincian, totalBiaya }) => {
                const katLabel = p.hasil_kategori ? KAT_LABELS[p.hasil_kategori as HasilKategori] : null
                const kat: HasilKategori = (p.hasil_kategori as HasilKategori) || katFromJenis(p.jenis_pekerjaan)
                const mode = rincianMode(kat, p.jenis_pekerjaan)
                const cols = columnsForMode(mode)
                return (
                  <div key={p.id} style={{ backgroundColor: 'var(--card)', borderRadius: 12, border: '1px solid var(--border-subtle)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>

                    {/* Card header: nama (kiri) + badge status (kanan atas) */}
                    <div style={{ ...groupHeaderStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ fontSize: isMobile ? 12.5 : 13.5, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.nama_pekerjaan}
                      </span>
                      {katLabel && (
                        <span style={{ fontSize: isMobile ? 8 : 9, fontWeight: 600, color: '#5B8FD6', background: 'rgba(91,143,214,0.1)', border: '1px solid rgba(91,143,214,0.2)', borderRadius: 20, padding: isMobile ? '1.5px 6px' : '2px 7px', flexShrink: 0, whiteSpace: 'nowrap', letterSpacing: '0.01em' }}>
                          {katLabel}
                        </span>
                      )}
                    </div>

                    {/* Table inside card — kolom menyesuaikan kategori/mode */}
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                        <colgroup>
                          {cols.map(col => (
                            <col key={col.key} style={{ width: col.pct }} />
                          ))}
                        </colgroup>
                        <thead>
                          <tr>
                            {cols.map(col => (
                              <th key={col.key} style={{ ...subThStyle, textAlign: col.align }}>
                                {col.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rincian.map((r, ri) => {
                            const rowNo = no++
                            return (
                              <tr key={ri} style={{ backgroundColor: ri % 2 === 1 ? 'rgba(15,23,42,0.025)' : 'transparent' }}>
                                {cols.map(col => {
                                  switch (col.key) {
                                    case 'no':
                                      return <td key={col.key} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }}>{rowNo}</td>
                                    case 'nama':
                                      return <td key={col.key} style={{ ...tdStyle, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nama}</td>
                                    case 'aset':
                                      return <td key={col.key} style={{ ...tdStyle, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.aset || '—'}</td>
                                    case 'ukuran':
                                      return (
                                        <td key={col.key} style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                          {(r.ukuran ?? 0).toLocaleString('id-ID')}{mode === 'divisi' ? ' org' : ''}
                                        </td>
                                      )
                                    case 'satuan':
                                      return <td key={col.key} style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: isMobile ? 11 : 12 }}>{r.satuan}</td>
                                    case 'status': {
                                      const chip = STATUS_CHIP[r.status || 'Rencana'] || STATUS_CHIP.Rencana
                                      return (
                                        <td key={col.key} style={tdStyle}>
                                          <span style={{ fontSize: isMobile ? 10 : 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: chip.bg, color: chip.fg, whiteSpace: 'nowrap' }}>
                                            {r.status || 'Rencana'}
                                          </span>
                                        </td>
                                      )
                                    }
                                    case 'biaya':
                                      return <td key={col.key} style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)' }}>{formatRupiah(r.biaya ?? 0)}</td>
                                    default:
                                      return null
                                  }
                                })}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Card footer: subtotal */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: isMobile ? '8px 12px' : '9px 14px', borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-raised)' }}>
                      <span style={{ fontSize: isMobile ? 11 : 11.5, color: 'var(--text-muted)', fontWeight: 500 }}>Total</span>
                      <span style={{ fontSize: isMobile ? 12.5 : 13.5, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(totalBiaya)}</span>
                    </div>

                  </div>
                )
              })
            })()}
          </div>
        )}

        {/* ── Belum diisi section ──────────────────────────────────────────── */}
        {noData.length > 0 && (
          <div style={{ backgroundColor: 'var(--card)', borderRadius: 14, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Belum Diisi</span>
              <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--surface-2)', color: 'var(--text-muted)', borderRadius: 99, padding: '1px 8px' }}>{noData.length}</span>
            </div>
            {noData.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderBottom: i < noData.length - 1 ? '1px solid var(--border-subtle)' : 'none', opacity: 0.55 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)' }}>{p.id}</span>
                  <span style={{ fontSize: isMobile ? 12 : 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{p.nama_pekerjaan}</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>data belum diisi</span>
              </div>
            ))}
          </div>
        )}

      </div>
    </>
  )
}
