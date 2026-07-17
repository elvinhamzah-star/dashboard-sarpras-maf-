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

  const thStyle: React.CSSProperties = {
    padding: isMobile ? '7px 8px' : '9px 12px',
    fontSize: isMobile ? 9.5 : 11,
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    borderBottom: '2px solid var(--border)',
    backgroundColor: 'var(--surface-raised)',
  }

  const tdStyle: React.CSSProperties = {
    padding: isMobile ? '7px 8px' : '9px 12px',
    fontSize: isMobile ? 12 : 13,
    color: 'var(--text-primary)',
    verticalAlign: 'middle',
    borderBottom: '1px solid var(--border-subtle)',
  }

  const groupHeaderStyle: React.CSSProperties = {
    padding: isMobile ? '7px 8px' : '8px 12px',
    backgroundColor: 'rgba(15,23,42,0.04)',
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

        {/* ── Filter tabs ──────────────────────────────────────────────────── */}
        <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {(['semua', 'fisik', 'barang', 'jasa'] as KatFilter[]).map(k => {
            const active = filter === k
            const color = k === 'semua' ? 'var(--blue)' : KAT_COLORS[k as HasilKategori]
            return (
              <button
                key={k}
                onClick={() => setFilter(k)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 99,
                  border: `1.5px solid ${active ? color : 'var(--border)'}`,
                  background: active ? `${color}12` : 'var(--card)',
                  color: active ? color : 'var(--text-secondary)',
                  fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit', transition: 'all 0.15s',
                }}
              >
                {k === 'semua' ? 'Semua' : KAT_LABELS[k as HasilKategori]}
                <span style={{ fontSize: 11, fontWeight: 700, background: active ? color : 'var(--surface-2)', color: active ? '#fff' : 'var(--text-muted)', borderRadius: 99, padding: '1px 7px', minWidth: 20, textAlign: 'center' }}>
                  {counts[k]}
                </span>
              </button>
            )
          })}
        </div>

        {/* ── Summary cards ────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isMobile ? 8 : 12, marginBottom: 20 }}>
          {[
            { label: 'Total Nilai Aset', value: formatRupiah(totalNilai), accent: 'var(--blue)' },
            { label: 'Jumlah Pekerjaan', value: `${totalProgram}`, accent: '#059669' },
            { label: 'Jumlah Item', value: `${totalItems}`, accent: '#D97706' },
          ].map((c, i) => (
            <div key={i} style={{ backgroundColor: 'var(--card)', borderRadius: 12, padding: isMobile ? '10px 12px' : '14px 18px', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', textAlign: 'center' }}>
              <div style={{ fontSize: isMobile ? 9 : 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{c.label}</div>
              <div style={{ fontSize: isMobile ? 14 : 18, fontWeight: 700, color: c.accent, letterSpacing: '-0.03em' }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* ── Table ────────────────────────────────────────────────────────── */}
        <div style={{ backgroundColor: 'var(--card)', borderRadius: 14, border: '1px solid var(--border-subtle)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden', marginBottom: 20 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Tidak ada data untuk kategori ini.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: 36, textAlign: 'center' }}>No</th>
                    <th style={thStyle}>Lokasi / Item</th>
                    <th style={thStyle}>Aset / Material</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Volume</th>
                    <th style={thStyle}>Satuan</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Biaya</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let no = 1
                    return filtered.flatMap(({ program: p, rincian, totalBiaya }) => {
                      const katColor = KAT_COLORS[p.hasil_kategori as HasilKategori] ?? 'var(--blue)'
                      return [
                        // Group header row
                        <tr key={`gh-${p.id}`}>
                          <td colSpan={6} style={groupHeaderStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>{p.id}</span>
                                <span style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: 'var(--text-primary)' }}>{p.nama_pekerjaan}</span>
                                {p.hasil_kategori && (
                                  <span style={{ fontSize: 10, fontWeight: 700, color: katColor, background: `${katColor}12`, border: `1px solid ${katColor}30`, borderRadius: 99, padding: '1px 8px' }}>
                                    {KAT_LABELS[p.hasil_kategori]}
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: isMobile ? 11 : 12, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                {formatRupiah(totalBiaya)}
                              </span>
                            </div>
                          </td>
                        </tr>,
                        // Rincian rows
                        ...rincian.map((r, ri) => (
                          <tr key={`${p.id}-${ri}`} style={{ backgroundColor: ri % 2 === 1 ? 'rgba(15,23,42,0.015)' : 'transparent' }}>
                            <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }}>{no++}</td>
                            <td style={{ ...tdStyle, fontWeight: 500 }}>{r.nama}</td>
                            <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{r.aset || '—'}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{(r.ukuran ?? 0).toLocaleString('id-ID')}</td>
                            <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: isMobile ? 11 : 12 }}>{r.satuan}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)' }}>{formatRupiah(r.biaya ?? 0)}</td>
                          </tr>
                        )),
                      ]
                    })
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>

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
