/**
 * LaporanAset
 *
 * Admin-only page: Perolehan Aset & Realisasi
 * Rekap seluruh hasil_rincian dari pekerjaan Selesai,
 * dikelompokkan per pekerjaan, dengan filter kategori dan export.
 */

import { useEffect, useState } from 'react'
import ExcelJS from 'exceljs'
import { fetchPrograms } from '../lib/supabase'
import { Program, HasilKategori, HasilRincianItem } from '../lib/supabase'
import { formatRupiah } from '../lib/data'
import { useWindowWidth } from '../lib/useWindowWidth'
import { MOBILE_BREAKPOINT } from '../lib/breakpoint'
import { isRestrictedForRole } from '../lib/access'
import { katFromJenis, rincianMode, RincianMode } from './HasilFormModal'

type KatFilter = 'semua' | HasilKategori

const KAT_LABELS: Record<HasilKategori, string> = {
  fisik:  'Proyek / Fisik',
  barang: 'Pengadaan Barang',
  jasa:   'Operasional / Jasa',
}

const KAT_COLORS: Record<HasilKategori, string> = {
  fisik:  '#1A6FE8',
  barang: '#1B5E2B',
  jasa:   '#B45309',
}

const STATUS_CHIP: Record<string, { bg: string; fg: string }> = {
  Selesai:  { bg: 'rgba(27,94,43,0.12)', fg: '#047857' },
  Berjalan: { bg: 'rgba(26,111,232,0.12)', fg: '#1A6FE8' },
  Rencana:  { bg: 'rgba(217,119,6,0.13)', fg: '#B45309' },
}

/** Mode "item" (Pengadaan Barang): biaya tersimpan = harga satuan, subtotal baris = biaya × ukuran. */
function rowSubtotal(r: HasilRincianItem, kat: HasilKategori | null | undefined, jenis: string): number {
  const isItem = (kat || katFromJenis(jenis)) === 'barang'
  return isItem ? (Number(r.biaya) || 0) * (Number(r.ukuran) || 0) : (Number(r.biaya) || 0)
}

/** Kolom tabel rincian menyesuaikan mode (fisik→lokasi, barang→item, jasa→divisi/kegiatan). */
interface ReportCol {
  key: 'no' | 'nama' | 'aset' | 'ukuran' | 'satuan' | 'biaya'
  label: string
  align: 'left' | 'center' | 'right'
  /** Lebar kolom dalam persen — total harus 100%. */
  pct: string
}

// Lebar kolom TETAP per key, sama untuk semua mode — supaya kolom (terutama
// Satuan & Nilai) selalu jatuh di posisi horizontal yang sama antar kategori,
// tidak geser cuma karena satu program pakai kolom Aset dan yang lain tidak.
const COL_PCT: Record<ReportCol['key'], string> = {
  no: '5%', nama: '22%', aset: '25%', ukuran: '12%', satuan: '13%', biaya: '23%',
}

function columnsForMode(mode: RincianMode): ReportCol[] {
  const col = (key: ReportCol['key'], label: string, align: ReportCol['align']): ReportCol =>
    ({ key, label, align, pct: COL_PCT[key] })
  switch (mode) {
    case 'lokasi':
      return [
        col('no', 'No', 'center'),
        col('nama', 'Lokasi', 'left'),
        col('aset', 'Aset', 'left'),
        col('ukuran', 'Volume', 'right'),
        col('satuan', 'Satuan', 'left'),
        col('biaya', 'Nilai', 'right'),
      ]
    case 'item':
      return [
        col('no', 'No', 'center'),
        col('nama', 'Barang', 'left'),
        col('aset', '', 'left'),
        col('ukuran', 'Jumlah', 'right'),
        col('satuan', 'Satuan', 'left'),
        col('biaya', 'Nilai', 'right'),
      ]
    case 'divisi':
      return [
        col('no', 'No', 'center'),
        col('nama', 'Divisi', 'left'),
        col('aset', '', 'left'),
        col('ukuran', 'Personel', 'right'),
        col('satuan', '', 'left'),
        col('biaya', 'Nilai', 'right'),
      ]
    case 'kegiatan':
      return [
        col('no', 'No', 'center'),
        col('nama', 'Kegiatan', 'left'),
        col('aset', '', 'left'),
        col('ukuran', '', 'right'),
        col('satuan', 'Status', 'left'),
        col('biaya', 'Nilai', 'right'),
      ]
  }
}

interface ProgramRow {
  program: Program
  rincian: HasilRincianItem[]
  totalBiaya: number
}

export default function LaporanAset({ role }: { role?: 'pbb' | 'maf' | null }) {
  const width = useWindowWidth()
  const isMobile = width < MOBILE_BREAKPOINT

  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<KatFilter>('semua')

  useEffect(() => {
    fetchPrograms().then(({ data }) => {
      if (data) setPrograms(data as Program[])
      setLoading(false)
    })
  }, [])

  // Split: Selesai dengan data vs belum diisi (Man Power disembunyikan untuk MAF)
  const selesai = programs.filter(p =>
    p.status === 'Selesai' && !isRestrictedForRole(p, role)
  )
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
        totalBiaya: rincian.reduce((s, r) => s + rowSubtotal(r, p.hasil_kategori, p.jenis_pekerjaan), 0),
      }
    })

  // Summary
  const totalNilai   = filtered.reduce((s, r) => s + r.totalBiaya, 0)
  const totalItems   = filtered.reduce((s, r) => s + r.rincian.length, 0)
  const totalProgram = filtered.length

  // ── Export Excel ─────────────────────────────────────────────────────────────
  // Gaya warna netral disamain sama tampilan halaman (bukan warna-warni) --
  // section per pekerjaan cuma background abu muda + badge kategori kecil,
  // header kolom abu, subtotal per pekerjaan, total keseluruhan di baris akhir.
  const COLOR = {
    text: 'FF0F172A', muted: 'FF64748B', border: 'FFD1D5DB', rowBorder: 'FFEEF1F5',
    headerBg: 'FFF8FAFC', sectionBg: 'FFF1F5F9', zebra: 'FFFAFBFC',
    badge: 'FF5B8FD6',
  }
  const exportExcel = async () => {
    const wb = new ExcelJS.Workbook()
    wb.creator = 'Dashboard Sarpras MAF'
    wb.created = new Date()
    const ws = wb.addWorksheet('Perolehan Aset', { pageSetup: { orientation: 'landscape', fitToPage: true } })
    ws.columns = [
      { width: 6 }, { width: 30 }, { width: 28 }, { width: 10 }, { width: 10 }, { width: 18 },
    ]

    const tanggal = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    ws.mergeCells('A1:F1')
    ws.getCell('A1').value = 'Laporan Perolehan Aset & Realisasi'
    ws.getCell('A1').font = { bold: true, size: 14, color: { argb: COLOR.text } }

    ws.mergeCells('A2:F2')
    ws.getCell('A2').value = `Sarpras MAF · Diekspor ${tanggal} · Total ${formatRupiah(totalNilai)} · ${totalProgram} Pekerjaan · ${totalItems} Item`
    ws.getCell('A2').font = { size: 10, color: { argb: COLOR.muted } }
    ws.addRow([])

    const header = ws.addRow(['No', 'Lokasi / Barang', 'Aset / Material', 'Volume', 'Satuan', 'Biaya (Rp)'])
    header.eachCell(cell => {
      cell.font = { bold: true, size: 9, color: { argb: COLOR.muted } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.headerBg } }
      cell.border = { bottom: { style: 'thin', color: { argb: COLOR.border } } }
    })
    header.getCell(1).alignment = { horizontal: 'center' }
    header.getCell(4).alignment = { horizontal: 'right' }
    header.getCell(6).alignment = { horizontal: 'right' }

    let no = 1
    filtered.forEach(({ program: p, rincian, totalBiaya }) => {
      const katLabel = p.hasil_kategori ? KAT_LABELS[p.hasil_kategori as HasilKategori] : null

      const secRow = ws.addRow([p.nama_pekerjaan])
      ws.mergeCells(`A${secRow.number}:F${secRow.number}`)
      const secCell = secRow.getCell(1)
      secCell.value = katLabel
        ? { richText: [
            { font: { bold: true, size: 11.5, color: { argb: COLOR.text } }, text: p.nama_pekerjaan },
            { font: { size: 9, color: { argb: COLOR.badge } }, text: `   ${katLabel}` },
          ] }
        : p.nama_pekerjaan
      secRow.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.sectionBg } } })

      rincian.forEach((r, ri) => {
        const row = ws.addRow([
          no++,
          r.nama,
          r.aset || '',
          r.ukuran ?? '',
          r.satuan || '',
          rowSubtotal(r, p.hasil_kategori, p.jenis_pekerjaan),
        ])
        if (ri % 2 === 1) row.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.zebra } } })
        row.eachCell(cell => { cell.border = { bottom: { style: 'thin', color: { argb: COLOR.rowBorder } } } })
        row.getCell(1).alignment = { horizontal: 'center' }
        row.getCell(1).font = { size: 9, color: { argb: COLOR.muted } }
        row.getCell(4).alignment = { horizontal: 'right' }
        row.getCell(6).alignment = { horizontal: 'right' }
        row.getCell(6).numFmt = '#,##0'
      })

      const subRow = ws.addRow(['', '', '', '', 'Subtotal', totalBiaya])
      ws.mergeCells(`A${subRow.number}:E${subRow.number}`)
      subRow.getCell(5).alignment = { horizontal: 'right' }
      subRow.getCell(6).alignment = { horizontal: 'right' }
      subRow.getCell(6).numFmt = '#,##0'
      subRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: COLOR.text } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.headerBg } }
        cell.border = { top: { style: 'thin', color: { argb: COLOR.border } } }
      })
    })

    const totalRow = ws.addRow(['', '', '', '', 'TOTAL KESELURUHAN', totalNilai])
    ws.mergeCells(`A${totalRow.number}:E${totalRow.number}`)
    totalRow.getCell(5).alignment = { horizontal: 'right' }
    totalRow.getCell(6).alignment = { horizontal: 'right' }
    totalRow.getCell(6).numFmt = '#,##0'
    totalRow.eachCell(cell => {
      cell.font = { bold: true, size: 11, color: { argb: COLOR.text } }
      cell.border = { top: { style: 'medium', color: { argb: COLOR.text } } }
    })

    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `laporan-perolehan-aset-${new Date().toISOString().slice(0, 10)}.xlsx`
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
          body * { visibility: hidden; }
          #laporan-aset-print, #laporan-aset-print * { visibility: visible; }
          /* position:absolute (bukan fixed) -- fixed mengunci elemen ke satu
             "jendela" halaman cetak, jadi konten yang lebih panjang dari 1
             halaman kepotong/hilang. Absolute tetap ngeluarin elemen dari
             layout normal tapi kontennya bisa mengalir ke halaman berikutnya. */
          #laporan-aset-print { position: absolute; left: 0; top: 0; width: 100%; }
          #laporan-aset-print .no-print { display: none !important; visibility: hidden; }
          #laporan-aset-print .aset-group { break-inside: avoid; page-break-inside: avoid; }
          @page { margin: 16mm; size: A4 portrait; }
        }
      `}</style>

      <div id="laporan-aset-print" style={{ padding: ps, width: '100%', boxSizing: 'border-box', animation: 'pageSlideIn 0.2s ease' }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        {/* Desktop: judul + tombol sejajar. Mobile: judul disembunyikan, tombol tetap
            tampil — export cuma soal siapa boleh lihat laporan ini, bukan soal device. */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: isMobile ? 'flex-end' : 'space-between', marginBottom: isMobile ? 14 : 24, gap: 12 }}>
          {!isMobile && (
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', margin: 0 }}>
                Perolehan Aset & Realisasi
              </h1>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>
                Inventaris aset dan material per kategori pekerjaan
              </p>
            </div>
          )}

          {/* Export buttons */}
          <div className="no-print" style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              onClick={exportExcel}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: isMobile ? '8px' : '8px 14px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text-secondary)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--blue)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--blue)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)' }}
              title="Export Excel"
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              {!isMobile && 'Excel'}
            </button>
            <button
              onClick={exportPDF}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: isMobile ? '8px' : '8px 14px', borderRadius: 9, border: '1px solid var(--blue)', background: 'var(--blue)', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--blue-dark)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--blue)' }}
              title="Export PDF"
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              {!isMobile && 'PDF'}
            </button>
          </div>
        </div>

        {/* ── Summary cards ────────────────────────────────────────────────── */}
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {/* Card 1: Total Nilai — full width, center stacked */}
            <div style={{ backgroundColor: 'var(--card)', borderRadius: 12, padding: '10px 14px', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', textAlign: 'center' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Total Nilai Aset</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--blue)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(totalNilai)}</div>
            </div>
            {/* Card 2+3: Pekerjaan + Item — berdampingan */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Jumlah Pekerjaan', value: `${totalProgram}`, accent: 'var(--text-primary)' },
                { label: 'Jumlah Item', value: `${totalItems}`, accent: 'var(--text-primary)' },
              ].map((c, i) => (
                <div key={i} style={{ backgroundColor: 'var(--card)', borderRadius: 12, padding: '9px 12px', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{c.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: c.accent, letterSpacing: '-0.02em' }}>{c.value}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
            {[
              { label: 'Total Nilai Aset', value: formatRupiah(totalNilai), accent: 'var(--blue)' },
              { label: 'Jumlah Pekerjaan', value: `${totalProgram}`, accent: '#0f766e' },
              { label: 'Jumlah Item', value: `${totalItems}`, accent: '#b45309' },
            ].map((c, i) => (
              <div key={i} style={{ backgroundColor: 'var(--card)', borderRadius: 12, padding: '14px 16px', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{c.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: c.accent, letterSpacing: '-0.02em' }}>{c.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Filter tabs — card style ─────────────────────────────────────── */}
        <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: isMobile ? 6 : 8, marginBottom: 16 }}>
          {([
            { k: 'semua',  label: 'Semua',    icon: (
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            )},
            { k: 'fisik',  label: 'Fisik',    icon: (
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            )},
            { k: 'barang', label: 'Barang',   icon: (
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>
            )},
            { k: 'jasa',   label: 'Jasa',     icon: (
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            )},
          ] as { k: KatFilter; label: string; icon: JSX.Element }[]).map(({ k, label, icon }) => {
            const active = filter === k
            const color = k === 'semua' ? '#1A6FE8' : KAT_COLORS[k as HasilKategori]
            return (
              <button
                key={k}
                onClick={() => setFilter(k)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: isMobile ? '10px 6px' : '12px 8px',
                  borderRadius: isMobile ? 12 : 14,
                  border: active ? `1.5px solid ${color}` : '1px solid var(--border-subtle)',
                  background: active ? `${color}10` : 'var(--card)',
                  color: active ? color : 'var(--text-muted)',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                  boxShadow: active ? `0 0 0 3px ${color}15` : '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                {/* Icon + angka berdampingan */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isMobile ? 4 : 5, marginBottom: isMobile ? 4 : 5 }}>
                  <div style={{
                    width: isMobile ? 18 : 22, height: isMobile ? 18 : 22, borderRadius: 6,
                    backgroundColor: active ? `${color}22` : 'rgba(0,0,0,0.05)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {icon}
                  </div>
                  <span style={{ fontSize: isMobile ? 15 : 18, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>
                    {counts[k]}
                  </span>
                </div>
                {/* Label */}
                <span style={{ fontSize: isMobile ? 9 : 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1 }}>
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
                  <div key={p.id} className="aset-group" style={{ backgroundColor: 'var(--card)', borderRadius: 12, border: '1px solid var(--border-subtle)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>

                    {/* Card header: nama (kiri) + badge status (kanan atas) */}
                    <div style={{ ...groupHeaderStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <span title={p.nama_pekerjaan} style={{ fontSize: isMobile ? 12.5 : 13.5, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.nama_pekerjaan}
                      </span>
                      {katLabel && (
                        <span style={{ fontSize: 9, fontWeight: 600, color: '#5B8FD6', background: 'rgba(91,143,214,0.1)', border: '1px solid rgba(91,143,214,0.2)', borderRadius: 20, padding: isMobile ? '1.5px 6px' : '2px 7px', flexShrink: 0, whiteSpace: 'nowrap', letterSpacing: '0.01em' }}>
                          {katLabel}
                        </span>
                      )}
                    </div>

                    {/* Rincian — table di desktop, card list di mobile */}
                    {isMobile ? (
                      <div>
                        {rincian.map((r, ri) => {
                          const rowNo = no++
                          const chip = STATUS_CHIP[r.status || 'Rencana'] || STATUS_CHIP.Rencana
                          return (
                            <div key={ri} style={{
                              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                              gap: 10, padding: '10px 14px',
                              borderBottom: ri < rincian.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                              backgroundColor: ri % 2 === 1 ? 'rgba(15,23,42,0.025)' : 'transparent',
                            }}>
                              {/* Kiri: nomor + nama + detail */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
                                  <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0, minWidth: 20, display: 'inline-block' }}>{rowNo}.</span>
                                  <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)', lineHeight: 1.35 }}>{r.nama}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', paddingLeft: 26 }}>
                                  {r.aset && (
                                    <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{r.aset}</span>
                                  )}
                                  {r.ukuran != null && (
                                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                                      {(r.ukuran).toLocaleString('id-ID')}{r.satuan ? ` ${r.satuan}` : ''}{mode === 'divisi' ? ' org' : ''}
                                    </span>
                                  )}
                                  {mode === 'kegiatan' && r.status && (
                                    <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 5, background: chip.bg, color: chip.fg }}>
                                      {r.status}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {/* Kanan: nilai */}
                              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                                <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                                  {formatRupiah(rowSubtotal(r, kat, p.jenis_pekerjaan))}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
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
                                        // Wrap (bukan potong-ellipsis) — nama lokasi/barang/divisi/
                                        // kegiatan gak boleh kepotong walau kolomnya sama-ratakan
                                        // di semua kategori.
                                        return <td key={col.key} style={{ ...tdStyle, fontWeight: 500, wordBreak: 'break-word' }}>{r.nama}</td>
                                      case 'aset':
                                        // Kolom Aset cuma dipakai mode lokasi — mode lain tetap
                                        // render sel kosong (bukan "—") supaya lebar tetap sama
                                        // tapi gak menyiratkan ada data yang hilang.
                                        return <td key={col.key} style={{ ...tdStyle, color: 'var(--text-secondary)', wordBreak: 'break-word' }}>{mode === 'lokasi' ? (r.aset || '—') : ''}</td>
                                      case 'ukuran':
                                        return (
                                          <td key={col.key} style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                            {mode === 'kegiatan' ? '' : `${(r.ukuran ?? 0).toLocaleString('id-ID')}${mode === 'divisi' ? ' org' : ''}`}
                                          </td>
                                        )
                                      case 'satuan':
                                        // Slot ini dipakai buat badge Status di mode kegiatan
                                        // (posisinya tetap sama, cuma isinya beda per mode).
                                        if (mode === 'kegiatan') {
                                          const chip = STATUS_CHIP[r.status || 'Rencana'] || STATUS_CHIP.Rencana
                                          return (
                                            <td key={col.key} style={tdStyle}>
                                              <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: chip.bg, color: chip.fg, whiteSpace: 'nowrap' }}>
                                                {r.status || 'Rencana'}
                                              </span>
                                            </td>
                                          )
                                        }
                                        return <td key={col.key} style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: 12 }}>{mode === 'divisi' ? '' : r.satuan}</td>
                                      case 'biaya':
                                        return <td key={col.key} style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)' }}>{formatRupiah(rowSubtotal(r, kat, p.jenis_pekerjaan))}</td>
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
                    )}

                    {/* Card footer: subtotal */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: isMobile ? '8px 12px' : '9px 14px', borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-raised)' }}>
                      <span style={{ fontSize: isMobile ? 10.5 : 11.5, color: 'var(--text-muted)', fontWeight: 500 }}>Total</span>
                      <span style={{ fontSize: isMobile ? 11 : 13.5, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(totalBiaya)}</span>
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
