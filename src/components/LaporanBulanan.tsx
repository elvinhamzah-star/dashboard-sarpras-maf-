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

function progressInMonth(
  snapshots: ProgramSnapshot[],
  programId: string,
  ym: string,
): number | null {
  const inMonth = snapshots
    .filter(s => s.program_id === programId && s.snapshot_date?.startsWith(ym))
    .sort((a, b) => b.snapshot_date.localeCompare(a.snapshot_date))
  return inMonth[0]?.progress_percent ?? null
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
      <div style={{ padding: '32px 20px', color: 'var(--text-muted)', fontSize: 14 }}>
        Memuat data...
      </div>
    )
  }

  if (!bulan) {
    return (
      <div style={{ padding: '32px 20px', color: 'var(--text-muted)', fontSize: 14 }}>
        Belum ada data transaksi.
      </div>
    )
  }

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

  const statusCount: Record<string, number> = {}
  programs.forEach(p => { statusCount[p.status] = (statusCount[p.status] || 0) + 1 })

  const deltaText = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? '+100%' : '—'
    const pct = ((curr - prev) / prev) * 100
    return (pct >= 0 ? '▲ +' : '▼ ') + Math.abs(pct).toFixed(1) + '%'
  }
  const dColor = (curr: number, prev: number) => curr >= prev ? '#059669' : '#DC2626'

  const card = (children: React.ReactNode, extra?: React.CSSProperties) => (
    <div style={{
      backgroundColor: 'var(--card)', borderRadius: 14,
      border: '1px solid var(--border-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      padding: '16px 20px', marginBottom: 14, ...extra,
    }}>
      {children}
    </div>
  )

  const statMini = (label: string, val: string, sub: string, color = 'var(--text-primary)') => (
    <div style={{ flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color, letterSpacing: '-0.03em' }}>{val}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>
    </div>
  )

  return (
    <div style={{ padding: '20px 20px 40px', maxWidth: 860, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>Laporan Bulanan</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Evaluasi, perbandingan &amp; rencana eksekusi</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MonthSelector value={selectedMonth} onChange={setSelectedMonth} months={allMonths} allLabel="Pilih Bulan" />
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            style={{
              height: 32, padding: '0 14px', borderRadius: 8,
              backgroundColor: exporting ? 'var(--border-subtle)' : '#1A6FE8',
              color: exporting ? 'var(--text-muted)' : '#fff',
              border: 'none', cursor: exporting ? 'default' : 'pointer',
              fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {exporting ? 'Generating...' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* Keuangan */}
      {card(<>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
          Keuangan — {monthLabelFromYM(bulan)}
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {statMini('Dana Masuk', formatRupiah(masukIni), `${deltaText(masukIni, masukPrev)} vs ${monthLabelFromYM(prevBulan)}`, dColor(masukIni, masukPrev))}
          {statMini('Dana Keluar', formatRupiah(keluarIni), `${deltaText(keluarIni, keluarPrev)} vs ${monthLabelFromYM(prevBulan)}`, '#DC2626')}
          {statMini('Net', formatRupiah(Math.abs(masukIni - keluarIni)), masukIni >= keluarIni ? 'surplus' : 'defisit', masukIni >= keluarIni ? '#059669' : '#DC2626')}
          {statMini('Transaksi', String(txsBulanIni.length), `vs ${txsBulanLalu.length} bulan lalu`)}
        </div>
      </>)}

      {/* Progress */}
      {card(<>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>Progress Pekerjaan</div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 16 }}>
          {statMini(`Rata-rata ${monthLabelFromYM(bulan)}`, avgProgress.toFixed(1) + '%', `${deltaText(avgProgress, avgProgressPrev)} vs ${monthLabelFromYM(prevBulan)}`, '#1A6FE8')}
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <>{statMini(status, String(statusCount[status] || 0), 'pekerjaan', color)}</>
          ))}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--surface-min)' }}>
                {['Pekerjaan', 'Vendor', `Progress ${monthLabelFromYM(bulan)}`, `Delta vs ${monthLabelFromYM(prevBulan)}`, 'Status'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {programs.map(p => {
                const prog = progressByProgram[p.id] ?? 0
                const prevProg = prevProgressByProgram[p.id] ?? 0
                const diff = prog - prevProg
                const color = STATUS_COLORS[p.status] || 'var(--text-muted)'
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{p.nama_pekerjaan}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{p.vendor}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#1A6FE8' }}>{prog}%</td>
                    <td style={{ padding: '8px 10px', fontWeight: 600, color: diff > 0 ? '#059669' : diff < 0 ? '#DC2626' : 'var(--text-muted)' }}>
                      {diff > 0 ? '+' : ''}{diff !== 0 ? diff.toFixed(0) + '%' : '—'}
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ backgroundColor: color + '20', color, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{p.status}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </>)}

      {/* Catatan Evaluasi */}
      {card(<>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
          Catatan Evaluasi — {monthLabelFromYM(bulan)}
        </div>
        {isAdmin ? (
          <textarea
            value={catatan}
            onChange={e => setCatatan(e.target.value)}
            placeholder="Tuliskan evaluasi bulan ini: apa yang berjalan baik, apa yang terlambat, masalah vendor, dll."
            rows={6}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 10,
              border: '1px solid var(--border-strong)', backgroundColor: 'var(--surface-min)',
              color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit',
              lineHeight: 1.6, resize: 'vertical', outline: 'none',
            }}
          />
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {catatan || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Belum diisi.</span>}
          </div>
        )}
      </>)}

      {/* Rencana */}
      {card(<>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1A6FE8', marginBottom: 10 }}>
          Rencana Eksekusi — Bulan Depan
        </div>
        {isAdmin ? (
          <textarea
            value={rencana}
            onChange={e => setRencana(e.target.value)}
            placeholder="Tuliskan rencana bulan depan: target progress per pekerjaan, vendor yang perlu di-follow up, kebutuhan anggaran tambahan, dll."
            rows={6}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 10,
              border: '1px solid rgba(26,111,232,0.3)', backgroundColor: 'rgba(26,111,232,0.04)',
              color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit',
              lineHeight: 1.6, resize: 'vertical', outline: 'none',
            }}
          />
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {rencana || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Belum diisi.</span>}
          </div>
        )}
      </>)}

      {/* Simpan */}
      {isAdmin && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              height: 36, padding: '0 20px', borderRadius: 10,
              backgroundColor: saving ? 'var(--border-subtle)' : '#1A6FE8',
              color: saving ? 'var(--text-muted)' : '#fff',
              border: 'none', cursor: saving ? 'default' : 'pointer',
              fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
            }}
          >
            {saving ? 'Menyimpan...' : 'Simpan Catatan & Rencana'}
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
