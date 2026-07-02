import { useState, useEffect, useCallback } from 'react'
import { pdf } from '@react-pdf/renderer'
import MonthSelector from './MonthSelector'
import LaporanBulananPDF from './LaporanBulananPDF'
import {
  fetchPrograms, fetchTransactions, fetchSnapshots,
  fetchMonthlyReport,
  Program, Transaction, ProgramSnapshot, MonthlyReport,
} from '../lib/supabase'
import { upsertMonthlyReport } from '../lib/adminApi'
import { formatRupiah, monthLabelFromYM, monthsFromDates, STATUS_COLORS, getTodayFormatted } from '../lib/data'
import { useWindowWidth } from '../lib/useWindowWidth'

interface LaporanBulananProps {
  isAdmin: boolean
}

function prevMonthYM(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function txsForMonth(txs: Transaction[], ym: string): Transaction[] {
  return txs.filter(t => t.tanggal?.startsWith(ym))
}

function progressInMonth(snapshots: ProgramSnapshot[], programId: string, ym: string): number | null {
  const inMonth = snapshots
    .filter(s => s.program_id === programId && s.snapshot_date?.startsWith(ym))
    .sort((a, b) => b.snapshot_date.localeCompare(a.snapshot_date))
  return inMonth[0]?.progress_percent ?? null
}

function nextMonthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m, 1)
  return monthLabelFromYM(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
}

export default function LaporanBulanan({ isAdmin }: LaporanBulananProps) {
  const [programs, setPrograms] = useState<Program[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [snapshots, setSnapshots] = useState<ProgramSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [catatan, setCatatan] = useState('')
  const [rencana, setRencana] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [exporting, setExporting] = useState(false)
  const width = useWindowWidth()
  const isMobile = width < 600
  const isNarrow = width < 1100

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchPrograms(), fetchTransactions(), fetchSnapshots()])
      .then(([pRes, tRes, sRes]) => {
        setPrograms((pRes.data ?? []).filter((p: Program) => p.id !== 'P-024'))
        setTransactions(tRes.data ?? [])
        setSnapshots((sRes.data ?? []) as ProgramSnapshot[])
      })
      .finally(() => setLoading(false))
  }, [])

  const allMonths = monthsFromDates(transactions.map(t => t.tanggal))
  const bulan = selectedMonth ?? allMonths[0] ?? ''
  const prevBulan = bulan ? prevMonthYM(bulan) : ''

  useEffect(() => {
    if (!bulan) return
    fetchMonthlyReport(bulan).then(({ data }: { data: MonthlyReport | null }) => {
      setCatatan(data?.catatan_evaluasi ?? '')
      setRencana(data?.rencana ?? '')
    })
  }, [bulan])

  const handleSave = useCallback(async () => {
    if (!isAdmin || !bulan) return
    setSaving(true)
    setSaveMsg('')
    const { ok } = await upsertMonthlyReport(bulan, catatan, rencana)
    setSaving(false)
    setSaveMsg(ok ? 'Tersimpan' : 'Gagal menyimpan')
    setTimeout(() => setSaveMsg(''), 2500)
  }, [isAdmin, bulan, catatan, rencana])

  const handleExportPDF = async () => {
    if (!bulan) return
    setExporting(true)
    try {
      const txsBulanIni = txsForMonth(transactions, bulan)
      const txsBulanLalu = txsForMonth(transactions, prevBulan)
      const progressByProgram: Record<string, number> = {}
      const prevProgressByProgram: Record<string, number> = {}
      programs.forEach(p => {
        progressByProgram[p.id] = progressInMonth(snapshots, p.id, bulan) ?? p.progress_percent ?? 0
        prevProgressByProgram[p.id] = progressInMonth(snapshots, p.id, prevBulan) ?? 0
      })
      const blob = await pdf(
        <LaporanBulananPDF
          bulan={bulan}
          prevBulan={prevBulan}
          programs={programs}
          transactions={txsBulanIni}
          prevTransactions={txsBulanLalu}
          progressByProgram={progressByProgram}
          prevProgressByProgram={prevProgressByProgram}
          catatanEvaluasi={catatan}
          rencana={rencana}
          generatedAt={getTodayFormatted()}
        />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Laporan-Bulanan-Sarpras-MAF-${bulan}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
        Memuat data...
      </div>
    )
  }

  if (!bulan) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
        Belum ada data transaksi.
      </div>
    )
  }

  // Compute derived data
  const txsBulanIni = txsForMonth(transactions, bulan)
  const txsBulanLalu = txsForMonth(transactions, prevBulan)
  const masukIni = txsBulanIni.filter(t => t.jenis_transaksi === 'Masuk').reduce((s, t) => s + (t.nominal || 0), 0)
  const keluarIni = txsBulanIni.filter(t => t.jenis_transaksi.startsWith('Keluar')).reduce((s, t) => s + (t.nominal || 0), 0)
  const masukPrev = txsBulanLalu.filter(t => t.jenis_transaksi === 'Masuk').reduce((s, t) => s + (t.nominal || 0), 0)
  const keluarPrev = txsBulanLalu.filter(t => t.jenis_transaksi.startsWith('Keluar')).reduce((s, t) => s + (t.nominal || 0), 0)

  const progressByProgram: Record<string, number> = {}
  const prevProgressByProgram: Record<string, number> = {}
  programs.forEach(p => {
    progressByProgram[p.id] = progressInMonth(snapshots, p.id, bulan) ?? p.progress_percent ?? 0
    prevProgressByProgram[p.id] = progressInMonth(snapshots, p.id, prevBulan) ?? 0
  })
  const avgProgress = programs.length > 0
    ? programs.reduce((s, p) => s + (progressByProgram[p.id] ?? 0), 0) / programs.length : 0
  const avgProgressPrev = programs.length > 0
    ? programs.reduce((s, p) => s + (prevProgressByProgram[p.id] ?? 0), 0) / programs.length : 0

  const totalAnggaran = programs.reduce((s, p) => s + (p.total_anggaran || 0), 0)
  const realisasiKumulatif = programs.reduce((s, p) => s + (p.realisasi_terkini || 0), 0)
  const sisaAnggaran = totalAnggaran - realisasiKumulatif
  const penyerapanPct = totalAnggaran > 0 ? (realisasiKumulatif / totalAnggaran) * 100 : 0

  const overBudget = programs.filter(p => (p.realisasi_terkini || 0) > (p.total_anggaran || 0) && (p.total_anggaran || 0) > 0)
  const isAtRisk = overBudget.length > 0

  const statusCount: Record<string, number> = {}
  programs.forEach(p => { statusCount[p.status] = (statusCount[p.status] || 0) + 1 })

  const deltaText = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? '+100%' : '—'
    const p = ((curr - prev) / prev) * 100
    return (p >= 0 ? '↑ +' : '↓ ') + Math.abs(p).toFixed(1) + '%'
  }
  const dColor = (curr: number, prev: number) => curr >= prev ? '#059669' : '#DC2626'

  const SectionTitle = ({ children, sub }: { children: string; sub?: string }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{children}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  )

  const Card = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <div style={{
      backgroundColor: 'var(--card)',
      borderRadius: 14,
      border: '1px solid var(--border-subtle)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      padding: '18px 20px',
      marginBottom: 14,
      ...style,
    }}>
      {children}
    </div>
  )

  return (
    <div style={{ padding: isMobile ? '14px 12px 60px' : '20px 20px 60px', maxWidth: 900, margin: '0 auto' }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Laporan Bulanan
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
            {monthLabelFromYM(bulan)} · Evaluasi, status & rencana eksekusi
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <MonthSelector value={selectedMonth} onChange={setSelectedMonth} months={allMonths} allLabel="Pilih Bulan" />
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            style={{
              height: 34, padding: '0 16px', borderRadius: 8,
              backgroundColor: exporting ? 'var(--border-subtle)' : '#1A6FE8',
              color: exporting ? 'var(--text-muted)' : '#fff',
              border: 'none', cursor: exporting ? 'default' : 'pointer',
              fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'opacity 0.15s',
            }}
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {exporting ? 'Generating...' : 'Export PDF (5 Slide)'}
          </button>
        </div>
      </div>

      {/* ── AT-RISK BANNER ── */}
      {isAtRisk && (
        <div style={{
          backgroundColor: '#FFFBEB', border: '1px solid #FCD34D',
          borderLeft: '4px solid #D97706',
          borderRadius: 10, padding: '12px 16px', marginBottom: 14,
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <div style={{ fontSize: 16 }}>⚠️</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>
              {overBudget.length} pekerjaan melebihi RAB
            </div>
            <div style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>
              {overBudget.map(p => p.nama_pekerjaan).join(', ')} — perlu keputusan tindak lanjut
            </div>
          </div>
        </div>
      )}

      {/* ── STATUS OVERVIEW ── */}
      <Card>
        <SectionTitle sub={`Kondisi keseluruhan per ${monthLabelFromYM(bulan)}`}>Status Proyek</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 10 }}>
          {/* Penyerapan */}
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Anggaran Terserap</div>
            <div style={{ fontSize: isMobile ? 18 : 26, fontWeight: 800, color: '#1A6FE8', letterSpacing: '-0.04em', lineHeight: 1 }}>{penyerapanPct.toFixed(1)}%</div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 6 }}>{formatRupiah(realisasiKumulatif)}</div>
            {/* Progress bar */}
            <div style={{ marginTop: 8, height: 4, background: '#BFDBFE', borderRadius: 2 }}>
              <div style={{ height: 4, width: `${Math.min(penyerapanPct, 100)}%`, background: '#1A6FE8', borderRadius: 2 }} />
            </div>
          </div>
          {/* Progress fisik */}
          <div style={{ background: '#F0FDF4', border: '1px solid #A7F3D0', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Progress Fisik</div>
            <div style={{ fontSize: isMobile ? 18 : 26, fontWeight: 800, color: '#059669', letterSpacing: '-0.04em', lineHeight: 1 }}>{avgProgress.toFixed(1)}%</div>
            <div style={{ fontSize: 11, color: dColor(avgProgress, avgProgressPrev), marginTop: 6, fontWeight: 600 }}>
              {deltaText(avgProgress, avgProgressPrev)} vs {monthLabelFromYM(prevBulan)}
            </div>
            <div style={{ marginTop: 8, height: 4, background: '#A7F3D0', borderRadius: 2 }}>
              <div style={{ height: 4, width: `${Math.min(avgProgress, 100)}%`, background: '#059669', borderRadius: 2 }} />
            </div>
          </div>
          {/* Sisa Anggaran */}
          <div style={{ background: 'var(--surface-min)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Sisa Anggaran</div>
            <div style={{ fontSize: isMobile ? 14 : 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>{formatRupiah(sisaAnggaran)}</div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 6 }}>dari {formatRupiah(totalAnggaran)}</div>
          </div>
          {/* Bermasalah */}
          <div style={{
            background: isAtRisk ? '#FFFBEB' : '#F0FDF4',
            border: `1px solid ${isAtRisk ? '#FCD34D' : '#A7F3D0'}`,
            borderRadius: 10, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Bermasalah</div>
            <div style={{ fontSize: isMobile ? 18 : 26, fontWeight: 800, color: isAtRisk ? '#D97706' : '#059669', letterSpacing: '-0.04em', lineHeight: 1 }}>{overBudget.length}</div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 6 }}>{isAtRisk ? 'pekerjaan over budget' : 'semua dalam batas'}</div>
          </div>
        </div>

        {/* Status counts */}
        <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 8, marginTop: 12 }}>
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} style={{
              borderLeft: `3px solid ${color}`,
              background: 'var(--surface-min)',
              borderRadius: '0 6px 6px 0',
              padding: '8px 12px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{status}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>pekerjaan</div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{statusCount[status] || 0}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── KEUANGAN ── */}
      <Card>
        <SectionTitle sub={`Transaksi ${monthLabelFromYM(bulan)} + anggaran kumulatif`}>Keuangan</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '1fr 1fr', gap: 12 }}>
          {/* Left: monthly */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Pengeluaran {monthLabelFromYM(bulan)}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#DC2626', letterSpacing: '-0.03em' }}>{formatRupiah(keluarIni)}</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: dColor(keluarPrev, keluarIni) }}>{deltaText(keluarIni, keluarPrev)}</div>
            </div>
            <div style={{ background: '#F0FDF4', border: '1px solid #A7F3D0', borderRadius: 10, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Pemasukan {monthLabelFromYM(bulan)}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#059669', letterSpacing: '-0.03em' }}>{formatRupiah(masukIni)}</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: dColor(masukIni, masukPrev) }}>{deltaText(masukIni, masukPrev)}</div>
            </div>
            <div style={{
              background: masukIni >= keluarIni ? '#F0FDF4' : '#FEF2F2',
              border: `1px solid ${masukIni >= keluarIni ? '#A7F3D0' : '#FECACA'}`,
              borderRadius: 10, padding: '12px 14px',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Net Bulan Ini</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: masukIni >= keluarIni ? '#059669' : '#DC2626', letterSpacing: '-0.03em' }}>
                {masukIni >= keluarIni ? '+' : '-'}{formatRupiah(Math.abs(masukIni - keluarIni))}
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{masukIni >= keluarIni ? 'Surplus' : 'Defisit'} bulan ini</div>
            </div>
          </div>

          {/* Right: cumulative */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ background: 'var(--surface-min)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Anggaran Kumulatif</div>
              {/* Budget bar */}
              <div style={{ height: 10, background: '#E2E8F0', borderRadius: 5, marginBottom: 8, overflow: 'hidden' }}>
                <div style={{ height: 10, width: `${Math.min(penyerapanPct, 100)}%`, background: '#1A6FE8', borderRadius: 5, transition: 'width 0.3s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748B', marginBottom: 12 }}>
                <span>Terpakai {penyerapanPct.toFixed(1)}%</span>
                <span>Sisa {(100 - penyerapanPct).toFixed(1)}%</span>
              </div>
              {[
                { label: 'Total anggaran', val: formatRupiah(totalAnggaran), color: 'var(--text-primary)' },
                { label: 'Sudah terpakai', val: formatRupiah(realisasiKumulatif), color: '#1A6FE8' },
                { label: 'Sisa anggaran', val: formatRupiah(sisaAnggaran), color: '#059669' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 6, borderBottom: '1px solid var(--border-subtle)', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: '#64748B' }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: row.color }}>{row.val}</span>
                </div>
              ))}
            </div>

            {/* Burn rate note */}
            {keluarIni > 0 && (
              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#1D4ED8' }}>
                Dengan pengeluaran {formatRupiah(keluarIni)}/bln, sisa anggaran cukup untuk ±{Math.floor(sisaAnggaran / keluarIni)} bulan ke depan.
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ── TABEL PEKERJAAN ── */}
      <Card>
        <SectionTitle sub={`Progress dan anggaran per pekerjaan — ${monthLabelFromYM(bulan)}`}>Status Pekerjaan</SectionTitle>
        {isNarrow ? (
          /* Card list for narrow screens */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {programs.map((p) => {
              const prog = progressByProgram[p.id] ?? 0
              const prevProg = prevProgressByProgram[p.id] ?? 0
              const diff = prog - prevProg
              const color = STATUS_COLORS[p.status] || '#64748B'
              const isOver = (p.realisasi_terkini || 0) > (p.total_anggaran || 0) && (p.total_anggaran || 0) > 0
              return (
                <div key={p.id} style={{
                  borderRadius: 10, border: `1px solid ${isOver ? '#FCD34D' : 'var(--border-subtle)'}`,
                  background: isOver ? '#FFFBEB' : 'var(--surface-min)',
                  padding: '12px 14px',
                }}>
                  {/* Header row: name + status badge */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: isOver ? '#D97706' : 'var(--text-primary)', flex: 1, lineHeight: 1.4 }}>
                      {isOver && <span style={{ marginRight: 4 }}>⚠</span>}{p.nama_pekerjaan}
                    </div>
                    <span style={{ background: color + '20', color, borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>{p.status}</span>
                  </div>
                  {/* Progress bar */}
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Progress fisik</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: prog >= 100 ? '#059669' : '#1A6FE8' }}>
                        {prog}%
                        {diff !== 0 && <span style={{ fontWeight: 600, color: diff > 0 ? '#059669' : '#DC2626', marginLeft: 4 }}>({diff > 0 ? '+' : ''}{diff.toFixed(0)}%)</span>}
                      </span>
                    </div>
                    <div style={{ height: 5, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: 5, width: `${prog}%`, background: prog >= 100 ? '#059669' : '#1A6FE8', borderRadius: 3 }} />
                    </div>
                  </div>
                  {/* Vendor + financials */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11 }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)', marginBottom: 1 }}>Vendor</div>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.vendor || '—'}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', marginBottom: 1 }}>RAB</div>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{formatRupiah(p.total_anggaran || 0)}</div>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ color: 'var(--text-muted)', marginBottom: 1 }}>Realisasi</div>
                      <div style={{ fontWeight: 700, color: isOver ? '#D97706' : 'var(--text-primary)' }}>{formatRupiah(p.realisasi_terkini || 0)}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* Full table for desktop */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--surface-min)' }}>
                  {[
                    { label: 'Pekerjaan', align: 'left' as const, style: { minWidth: 160 } },
                    { label: 'Vendor', align: 'left' as const, style: { minWidth: 100 } },
                    { label: 'Progress', align: 'center' as const, style: { width: 110 } },
                    { label: `Delta vs ${monthLabelFromYM(prevBulan)}`, align: 'right' as const, style: { width: 100 } },
                    { label: 'RAB', align: 'right' as const, style: { width: 120 } },
                    { label: 'Realisasi', align: 'right' as const, style: { width: 120 } },
                    { label: 'Status', align: 'center' as const, style: { width: 90 } },
                  ].map(h => (
                    <th key={h.label} style={{ padding: '8px 10px', textAlign: h.align, fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap', ...h.style }}>
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {programs.map((p, i) => {
                  const prog = progressByProgram[p.id] ?? 0
                  const prevProg = prevProgressByProgram[p.id] ?? 0
                  const diff = prog - prevProg
                  const color = STATUS_COLORS[p.status] || '#64748B'
                  const isOver = (p.realisasi_terkini || 0) > (p.total_anggaran || 0) && (p.total_anggaran || 0) > 0
                  return (
                    <tr key={p.id} style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      background: isOver ? '#FFFBEB' : i % 2 === 1 ? 'var(--surface-min)' : 'transparent',
                    }}>
                      <td style={{ padding: '9px 10px', fontWeight: 600, color: isOver ? '#D97706' : 'var(--text-primary)' }}>
                        {isOver && <span style={{ marginRight: 4 }}>⚠</span>}{p.nama_pekerjaan}
                      </td>
                      <td style={{ padding: '9px 10px', color: 'var(--text-muted)', fontSize: 11 }}>{p.vendor || '—'}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                          <div style={{ width: 72, height: 5, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: 5, width: `${prog}%`, background: prog >= 100 ? '#059669' : '#1A6FE8', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: prog >= 100 ? '#059669' : '#1A6FE8' }}>{prog}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 600, color: diff > 0 ? '#059669' : diff < 0 ? '#DC2626' : 'var(--text-muted)', fontSize: 11 }}>
                        {diff > 0 ? '+' : ''}{diff !== 0 ? diff.toFixed(0) + '%' : '—'}
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', color: 'var(--text-muted)', fontSize: 11 }}>{formatRupiah(p.total_anggaran || 0)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 600, color: isOver ? '#D97706' : 'var(--text-primary)', fontSize: 11 }}>{formatRupiah(p.realisasi_terkini || 0)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                        <span style={{ background: color + '20', color, borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>{p.status}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── EVALUASI & RENCANA ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
        {/* Catatan Evaluasi */}
        <div style={{
          backgroundColor: 'var(--card)', borderRadius: 14,
          border: '1px solid var(--border-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          padding: '18px 20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>📋</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Evaluasi {monthLabelFromYM(bulan)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Apa yang terjadi & pelajaran bulan ini</div>
            </div>
          </div>
          {isAdmin ? (
            <textarea
              value={catatan}
              onChange={e => setCatatan(e.target.value)}
              placeholder="Tuliskan evaluasi: apa yang berjalan baik, apa yang terlambat, masalah vendor, keputusan yang perlu diambil, dll."
              rows={6}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 10,
                border: '1px solid var(--border-strong)', backgroundColor: 'var(--surface-min)',
                color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit',
                lineHeight: 1.65, resize: 'vertical', outline: 'none',
              }}
            />
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, whiteSpace: 'pre-wrap', minHeight: 80 }}>
              {catatan || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Belum diisi.</span>}
            </div>
          )}
        </div>

        {/* Rencana Bulan Depan */}
        <div style={{
          backgroundColor: '#EFF6FF', borderRadius: 14,
          border: '1px solid #BFDBFE', boxShadow: '0 1px 3px rgba(26,111,232,0.06)',
          padding: '18px 20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>🎯</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1A6FE8' }}>Rencana {nextMonthLabel(bulan)}</div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>Target & prioritas bulan depan</div>
            </div>
          </div>
          {isAdmin ? (
            <textarea
              value={rencana}
              onChange={e => setRencana(e.target.value)}
              placeholder="Tuliskan rencana: target progress per pekerjaan, vendor yang perlu di-follow up, kebutuhan anggaran tambahan, prioritas minggu pertama, dll."
              rows={6}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 10,
                border: '1px solid #BFDBFE', backgroundColor: 'rgba(255,255,255,0.7)',
                color: '#1E293B', fontSize: 13, fontFamily: 'inherit',
                lineHeight: 1.65, resize: 'vertical', outline: 'none',
              }}
            />
          ) : (
            <div style={{ fontSize: 13, color: '#1E293B', lineHeight: 1.7, whiteSpace: 'pre-wrap', minHeight: 80 }}>
              {rencana || <span style={{ color: '#64748B', fontStyle: 'italic' }}>Belum diisi.</span>}
            </div>
          )}
        </div>
      </div>

      {/* Simpan button */}
      {isAdmin && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              height: 38, padding: '0 22px', borderRadius: 10,
              backgroundColor: saving ? 'var(--border-subtle)' : '#1A6FE8',
              color: saving ? 'var(--text-muted)' : '#fff',
              border: 'none', cursor: saving ? 'default' : 'pointer',
              fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
            }}
          >
            {saving ? 'Menyimpan...' : 'Simpan Evaluasi & Rencana'}
          </button>
          {saveMsg && (
            <span style={{ fontSize: 13, color: saveMsg === 'Tersimpan' ? '#059669' : '#DC2626', fontWeight: 600 }}>
              {saveMsg}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
