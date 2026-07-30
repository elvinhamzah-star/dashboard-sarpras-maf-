/**
 * LaporanProgress
 *
 * Admin-only. Rekam jejak progress & keuangan tiap pekerjaan, bisa dilihat
 * per minggu atau per bulan. Sumbernya data yang beneran ada di sistem
 * (program_snapshots + transactions) -- bukan diketik ulang manual.
 * Laporan pekanan manual yang lama (weekly_notes) tetap bisa dibuka lewat
 * "Lihat Arsip" di bagian bawah.
 */

import { useEffect, useState } from 'react'
import { fetchPrograms, fetchSnapshots, fetchTransactions, Program, ProgramSnapshot, Transaction } from '../lib/supabase'
import { STATUS_COLORS, formatRupiah, formatRupiahShort, monthLabelFromYM } from '../lib/data'
import { useWindowWidth } from '../lib/useWindowWidth'
import RiwayatLaporan from './RiwayatLaporan'

type Mode = 'bulanan' | 'mingguan'

const EXCLUDED_PROGRAM_ID = 'P-024' // Man Power -- biaya operasional terus-menerus, bukan "progress" proyek
const STATUS_TABS = ['On Going', 'On Hold', 'Perencanaan']

// ── Period helpers ──────────────────────────────────────────────────────────
function pad2(n: number) { return String(n).padStart(2, '0') }

function currentMonthKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
}
function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
}
function monthRange(ym: string): [string, string] {
  const [y, m] = ym.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return [`${ym}-01`, `${ym}-${pad2(lastDay)}`]
}

// Format a local Date as 'YYYY-MM-DD' without going through toISOString (which
// converts to UTC first -- for UTC+ zones like WIB that silently shifts local
// midnight back a day, making the week look 6 days instead of 7).
function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function currentWeekStart(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const start = new Date(d.getFullYear(), d.getMonth(), diff)
  return toDateStr(start)
}
function shiftWeek(weekStart: string, delta: number): string {
  const d = new Date(weekStart + 'T00:00:00')
  d.setDate(d.getDate() + delta * 7)
  return toDateStr(d)
}
function weekRange(weekStart: string): [string, string] {
  const d = new Date(weekStart + 'T00:00:00')
  d.setDate(d.getDate() + 6)
  return [weekStart, toDateStr(d)]
}
const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
function weekLabel(weekStart: string, weekEnd: string): string {
  const s = new Date(weekStart + 'T00:00:00')
  const e = new Date(weekEnd + 'T00:00:00')
  if (s.getMonth() === e.getMonth()) return `${s.getDate()} – ${e.getDate()} ${MONTHS_ID[e.getMonth()]} ${e.getFullYear()}`
  return `${s.getDate()} ${MONTHS_ID[s.getMonth()]} – ${e.getDate()} ${MONTHS_ID[e.getMonth()]} ${e.getFullYear()}`
}

// ── Per-program activity within a period ────────────────────────────────────
interface Activity {
  program: Program
  statusAtEnd: string
  becameSelesai: boolean
  progressStart: number | null
  progressEnd: number | null
  progressDelta: number
  realisasiAtEnd: number | null
}

function computeActivity(program: Program, snaps: ProgramSnapshot[], start: string, end: string): Activity | null {
  const own = snaps
    .filter(s => s.program_id === program.id)
    .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))
  const inPeriod = own.filter(s => s.snapshot_date >= start && s.snapshot_date <= end)
  if (inPeriod.length === 0) return null

  const before = own.filter(s => s.snapshot_date < start)
  const last = inPeriod[inPeriod.length - 1]
  const baseline = before.length > 0 ? before[before.length - 1] : inPeriod[0]
  const wasSelesaiBefore = before.length > 0 && before[before.length - 1].status === 'Selesai'
  const statusAtEnd = last.status || program.status
  const progressStart = baseline.progress_percent
  const progressEnd = last.progress_percent

  return {
    program,
    statusAtEnd,
    becameSelesai: statusAtEnd === 'Selesai' && !wasSelesaiBefore,
    progressStart,
    progressEnd,
    progressDelta: (progressEnd ?? 0) - (progressStart ?? 0),
    realisasiAtEnd: last.realisasi_terkini,
  }
}

const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--card)', borderRadius: 12, padding: '14px 16px',
  border: '1px solid var(--border-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
}
const summaryLabelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em',
}
const sectionHeadStyle: React.CSSProperties = {
  fontSize: 10.5, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 2px 8px',
}

export default function LaporanProgress() {
  const width = useWindowWidth()
  const isMobile = width < 600

  const [programs, setPrograms] = useState<Program[]>([])
  const [snapshots, setSnapshots] = useState<ProgramSnapshot[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<Mode>('bulanan')
  const [monthKey, setMonthKey] = useState(currentMonthKey())
  const [weekKey, setWeekKey] = useState(currentWeekStart())
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [showArchive, setShowArchive] = useState(false)
  const [catatan, setCatatan] = useState('')

  useEffect(() => {
    Promise.all([fetchPrograms(), fetchSnapshots(), fetchTransactions()]).then(([pRes, sRes, tRes]) => {
      setPrograms((pRes.data ?? []).filter(p => p.id !== EXCLUDED_PROGRAM_ID))
      setSnapshots((sRes.data ?? []) as ProgramSnapshot[])
      setTransactions(tRes.data ?? [])
      setLoading(false)
    })
  }, [])

  // Catatan pribadi -- disimpan lokal di browser saja (localStorage), per periode.
  // Sengaja TIDAK ke Supabase & TIDAK ikut ke-print/export, murni buat pegangan
  // baca sendiri pas lagi call laporan.
  const catatanKey = mode === 'bulanan' ? `lp_catatan_bulanan_${monthKey}` : `lp_catatan_mingguan_${weekKey}`
  useEffect(() => {
    setCatatan(localStorage.getItem(catatanKey) ?? '')
  }, [catatanKey])

  if (showArchive) {
    return (
      <div>
        <div style={{ padding: isMobile ? '14px 14px 0' : '20px 28px 0' }}>
          <button
            onClick={() => setShowArchive(false)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--card)', color: 'var(--text-secondary)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
            Kembali ke Laporan Progress
          </button>
        </div>
        <RiwayatLaporan />
      </div>
    )
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>Memuat...</div>
  }

  const [rangeStart, rangeEnd] = mode === 'bulanan' ? monthRange(monthKey) : weekRange(weekKey)
  const periodLabel = mode === 'bulanan' ? monthLabelFromYM(monthKey) : weekLabel(rangeStart, rangeEnd)

  const txsInPeriod = transactions.filter(t => t.tanggal >= rangeStart && t.tanggal <= rangeEnd)
  const danaMasuk = txsInPeriod.filter(t => t.jenis_transaksi === 'Masuk').reduce((s, t) => s + (t.nominal || 0), 0)
  const danaKeluar = txsInPeriod.filter(t => t.jenis_transaksi !== 'Masuk').reduce((s, t) => s + (t.nominal || 0), 0)
  const net = danaMasuk - danaKeluar

  const activities = programs
    .map(p => computeActivity(p, snapshots, rangeStart, rangeEnd))
    .filter((a): a is Activity => a !== null)

  const selesaiList = activities.filter(a => a.becameSelesai)
  const bergerakList = activities.filter(a => !a.becameSelesai)

  const tabCounts: Record<string, number> = {}
  bergerakList.forEach(a => { tabCounts[a.statusAtEnd] = (tabCounts[a.statusAtEnd] || 0) + 1 })
  const visibleTabs = [
    ...(selesaiList.length > 0 ? ['Selesai'] : []),
    ...STATUS_TABS.filter(t => (tabCounts[t] || 0) > 0),
  ]
  const currentTab = activeTab && visibleTabs.includes(activeTab) ? activeTab : (visibleTabs[0] ?? null)
  const currentList = currentTab === 'Selesai' ? selesaiList : bergerakList.filter(a => a.statusAtEnd === currentTab)

  const shiftPeriod = (delta: number) => {
    if (mode === 'bulanan') setMonthKey(k => shiftMonth(k, delta))
    else setWeekKey(k => shiftWeek(k, delta))
    setActiveTab(null)
  }

  const ActivityCard = ({ a }: { a: Activity }) => {
    const color = STATUS_COLORS[a.statusAtEnd] || 'var(--text-muted)'
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: isMobile ? '10px 12px' : '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: isMobile ? 12.5 : 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.35 }}>{a.program.nama_pekerjaan}</div>
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>
            {a.becameSelesai ? (mode === 'bulanan' ? 'Selesai bulan ini' : 'Selesai minggu ini') : (
              a.progressStart !== null && a.progressStart !== a.progressEnd
                ? `${a.progressStart}% → ${a.progressEnd}%`
                : `${a.progressEnd ?? 0}%`
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color }}>{a.progressEnd ?? 0}%</div>
          {a.realisasiAtEnd != null && (
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 1 }}>{formatRupiahShort(a.realisasiAtEnd)}</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #laporan-progress-print, #laporan-progress-print * { visibility: visible; }
          #laporan-progress-print { position: absolute; left: 0; top: 0; width: 100%; }
          #laporan-progress-print .no-print { display: none !important; visibility: hidden; }
          #laporan-progress-print .lp-section { break-inside: avoid; page-break-inside: avoid; }
          @page { margin: 16mm; size: A4 portrait; }
        }
      `}</style>

      <div id="laporan-progress-print" style={{ padding: isMobile ? '16px 14px 48px' : '24px 28px 48px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em' }}>Laporan Progress</h1>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '4px 0 0' }}>Rekam jejak progress &amp; keuangan tiap pekerjaan</p>
          </div>
          <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', backgroundColor: 'var(--surface-2)', borderRadius: 9, padding: 3 }}>
              {(['bulanan', 'mingguan'] as Mode[]).map(m => (
                <button key={m} onClick={() => { setMode(m); setActiveTab(null) }} style={{
                  padding: '6px 13px', borderRadius: 7, border: 'none', fontFamily: 'inherit',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  backgroundColor: mode === m ? 'var(--card)' : 'transparent',
                  color: mode === m ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}>
                  {m === 'bulanan' ? 'Bulanan' : 'Mingguan'}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 9, padding: '4px 6px' }}>
              <button onClick={() => shiftPeriod(-1)} style={{ width: 24, height: 24, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', padding: '0 4px', whiteSpace: 'nowrap' }}>{periodLabel}</span>
              <button onClick={() => shiftPeriod(1)} style={{ width: 24, height: 24, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>
            <button
              onClick={() => window.print()}
              style={{ padding: '8px 14px', borderRadius: 9, border: 'none', backgroundColor: 'var(--blue)', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Export PDF
            </button>
          </div>
        </div>

        {/* Ringkasan Keuangan */}
        <div className="lp-section" style={{ marginBottom: 18 }}>
          <div style={sectionHeadStyle}>Ringkasan Keuangan — {periodLabel}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <div style={cardStyle}>
              <div style={summaryLabelStyle}>Dana Masuk</div>
              <div style={{ fontSize: isMobile ? 15 : 17, fontWeight: 700, color: '#1B5E2B', marginTop: 4 }}>{formatRupiahShort(danaMasuk)}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{txsInPeriod.filter(t => t.jenis_transaksi === 'Masuk').length} transaksi</div>
            </div>
            <div style={cardStyle}>
              <div style={summaryLabelStyle}>Dana Keluar</div>
              <div style={{ fontSize: isMobile ? 15 : 17, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>{formatRupiahShort(danaKeluar)}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{txsInPeriod.filter(t => t.jenis_transaksi !== 'Masuk').length} transaksi</div>
            </div>
            <div style={cardStyle}>
              <div style={summaryLabelStyle}>Net {mode === 'bulanan' ? 'Bulan Ini' : 'Minggu Ini'}</div>
              <div style={{ fontSize: isMobile ? 15 : 17, fontWeight: 700, color: net >= 0 ? 'var(--blue)' : '#660000', marginTop: 4 }}>
                {net >= 0 ? '+' : ''}{formatRupiahShort(net)}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{net >= 0 ? 'masuk > keluar' : 'keluar > masuk'}</div>
            </div>
          </div>
        </div>

        {/* Ringkasan Progress */}
        <div className="lp-section" style={{ marginBottom: 18 }}>
          <div style={sectionHeadStyle}>Ringkasan Progress — {periodLabel}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            <div style={{ ...cardStyle, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1B5E2B' }}>{selesaiList.length}</div>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 2 }}>Selesai {mode === 'bulanan' ? 'Bulan Ini' : 'Minggu Ini'}</div>
            </div>
            <div style={{ ...cardStyle, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--blue)' }}>{bergerakList.length}</div>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 2 }}>Progress Bergerak</div>
            </div>
          </div>
        </div>

        {/* Detail per pekerjaan */}
        <div className="lp-section">
          <div style={sectionHeadStyle}>Detail per Pekerjaan</div>
          {visibleTabs.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '32px 16px' }}>
              Belum ada aktivitas tercatat di periode ini.
            </div>
          ) : (
            <>
              <div className="no-print" style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                {visibleTabs.map(tab => {
                  const isActive = currentTab === tab
                  const count = tab === 'Selesai' ? selesaiList.length : (tabCounts[tab] || 0)
                  const color = STATUS_COLORS[tab] || 'var(--text-muted)'
                  return (
                    <button key={tab} onClick={() => setActiveTab(tab)} style={{
                      padding: '6px 14px', borderRadius: 8, fontFamily: 'inherit',
                      fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      backgroundColor: isActive ? color : 'var(--card)',
                      color: isActive ? '#fff' : 'var(--text-secondary)',
                      border: isActive ? 'none' : '1px solid var(--border)',
                    }}>
                      {tab} ({count})
                    </button>
                  )
                })}
              </div>
              <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
                {currentList.map((a, i) => <ActivityCard key={a.program.id + i} a={a} />)}
              </div>
            </>
          )}
        </div>

        {/* Catatan pribadi — admin only, tersimpan di browser, TIDAK ikut export PDF */}
        <div className="no-print" style={{ marginTop: 18 }}>
          <div style={sectionHeadStyle}>Catatan — untuk dibaca sendiri, tidak ikut export</div>
          <textarea
            value={catatan}
            onChange={e => {
              setCatatan(e.target.value)
              if (e.target.value) localStorage.setItem(catatanKey, e.target.value)
              else localStorage.removeItem(catatanKey)
            }}
            placeholder="Kendala, poin yang mau disampaikan pas call, dll. Fleksibel, bebas tulis apa aja."
            style={{
              width: '100%', minHeight: 90, padding: '12px 14px', borderRadius: 12,
              border: '1px solid var(--border-subtle)', backgroundColor: 'var(--card)',
              color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit',
              resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5,
            }}
          />
        </div>

        {/* Arsip */}
        <div className="no-print" style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Laporan pekanan manual lama masih tersimpan</span>
          <button
            onClick={() => setShowArchive(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, color: 'var(--blue)', fontFamily: 'inherit', padding: 0 }}
          >
            Lihat Arsip →
          </button>
        </div>
      </div>
    </>
  )
}
