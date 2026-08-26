import { useEffect, useRef, useState, type ReactNode } from 'react'
import { fetchPrograms, fetchTransactions, fetchSnapshots, fetchSubPrograms, fetchWeeklyNotes, Program, ProgramSnapshot, Transaction, SubProgram } from '../lib/supabase'
import { STATUS_COLORS, STATUS_BG, formatRupiah, formatRupiahShort, getTodayFormatted, getEffectiveProgress } from '../lib/data'
import { useWindowWidth } from '../lib/useWindowWidth'
import { MOBILE_BREAKPOINT } from '../lib/breakpoint'
import { isRestrictedForRole } from '../lib/access'
import { Z_MODAL_POPUP } from '../lib/zIndex'
import BerandaAlerts from './BerandaAlerts'
import BerandaWeekOverWeek from './BerandaWeekOverWeek'
import BerandaChart from './BerandaChart'
import MetricDetailModal, { MetricModalType } from './MetricDetailModal'
import PekerjaanDetail from './PekerjaanDetail'
import ModalShell from './ModalShell'
import ModalHeader from './ModalHeader'
import AksesDibatasiModal from './AksesDibatasiModal'
import FilterSummaryBar from './FilterSummaryBar'

interface BerandaProps {
  isAdmin: boolean
  role: 'pbb' | 'maf' | null
  onNavigate?: (page: string, programId?: string, category?: string) => void
  initialDetailId?: string | null
  onInitialDetailConsumed?: () => void
  onOpenDetail?: (id: string, tab: string) => void
  initialStatusTab?: string | null
  onInitialStatusConsumed?: () => void
}

const BULAN_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

const MetricIcon = ({ type }: { type: string }) => {
  const icons: Record<string, JSX.Element> = {
    anggaran: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
      </svg>
    ),
    realisasi: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
    sisa: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
    ),
    penyerapan: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
    progress: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="9 12 11 14 15 10"/>
      </svg>
    ),
  }
  return icons[type] || null
}

const PekerjaanIcon = ({ type }: { type: string }) => {
  const icons: Record<string, JSX.Element> = {
    progress: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    'On Going': (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
    ),
    'On Hold': (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
      </svg>
    ),
    'Selesai': (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
    'Perencanaan': (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>
        <line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/>
      </svg>
    ),
  }
  return icons[type] || null
}

// Activates on Enter/Space, matching native <button> behavior — for the
// div-as-button cards below that can't be real <button> elements (they need
// layout the button element fights, e.g. block-level grid children).
const onActivateKey = (fn: () => void) => (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn() }
}

const SectionPanel = ({ label, isMobile, children }: { label: string; isMobile: boolean; children: ReactNode }) => (
  <div
    style={{
      backgroundColor: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: isMobile ? 14 : 16,
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
      marginBottom: isMobile ? 14 : 18,
    }}
  >
    {/* Header strip — judul center, tanpa ikon/garis/count (D-A) */}
    <div
      style={{
        textAlign: 'center',
        padding: isMobile ? '11px 14px' : '13px 16px',
        backgroundColor: 'var(--surface-raised)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div style={{ fontSize: isMobile ? 15 : 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
        {label}
      </div>
    </div>
    {/* Body */}
    <div style={{ padding: isMobile ? '13px' : '16px' }}>{children}</div>
  </div>
)

export default function Beranda({ isAdmin, role, onNavigate, initialDetailId, onInitialDetailConsumed, onOpenDetail, initialStatusTab, onInitialStatusConsumed }: BerandaProps) {
  const width = useWindowWidth()
  const isMobile = width < MOBILE_BREAKPOINT
  const [programs, setPrograms] = useState<Program[]>([])
  const [rawTransactions, setRawTransactions] = useState<Transaction[]>([])
  const [snapshots, setSnapshots] = useState<ProgramSnapshot[]>([])
  const [subPrograms, setSubPrograms] = useState<SubProgram[]>([])
  const [rencanaMap, setRencanaMap] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [activeModal, setActiveModal] = useState<MetricModalType | null>(null)
  const [detailProgramId, setDetailProgramId] = useState<string | null>(null)
  const [pekerjaanTab, setPekerjaanTab] = useState('On Going')
  const [showDetail, setShowDetail] = useState(false)
  const [popupDetailId, setPopupDetailId] = useState<string | null>(null)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [showBlockedModal, setShowBlockedModal] = useState(false)
  const [hoveredSummaryIdx, setHoveredSummaryIdx] = useState<number | null>(null)
  const hoveredSummaryIdxRef = useRef<number | null>(null)
  const activeModalRef = useRef<MetricModalType | null>(null)
  // Hover di-drive lewat React state (bukan mutasi style langsung) supaya gak
  // ketiban/ke-reset kalau komponen re-render sementara kursor masih di atas
  // card (mis. saat data di background refresh) — beda dari gaya lama yang
  // rawan "hover ngilang" tanpa perlu ada modal yang kebuka dulu.
  const [hoveredProgressCard, setHoveredProgressCard] = useState(false)
  const [hoveredStatusIdx, setHoveredStatusIdx] = useState<number | null>(null)

  useEffect(() => {
    if (initialDetailId) {
      setDetailProgramId(initialDetailId)
      onInitialDetailConsumed?.()
    }
  }, [initialDetailId])

  // Return-from-full-page-detail: reopen the status-list modal at the tab
  // the user came from (Opsi B — preserves browsing context).
  useEffect(() => {
    if (initialStatusTab) {
      setPekerjaanTab(initialStatusTab)
      setPopupDetailId(null)
      setShowDetail(true)
      onInitialStatusConsumed?.()
    }
  }, [initialStatusTab])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [{ data: progData }, { data: txData }, { data: snapData }, { data: subData }, { data: notesData }] = await Promise.all([
        fetchPrograms(),
        fetchTransactions(),
        fetchSnapshots(),
        fetchSubPrograms(),
        fetchWeeklyNotes(),
      ])
      if (progData) setPrograms(progData)
      if (notesData && notesData.length > 0) {
        const map: Record<string, string[]> = {}
        // oldest → newest: newer weeks overwrite older rencana
        notesData.forEach(note => {
          try {
            const parsed = JSON.parse(note.content)
            Object.entries(parsed.programs || {}).forEach(([id, d]: [string, unknown]) => {
              const rencana = ((d as Record<string, string[]>).rencana || []).filter((r: string) => r.trim())
              if (rencana.length > 0) map[id] = rencana
            })
          } catch {}
        })
        setRencanaMap(map)
      }
      if (txData) setRawTransactions(txData)
      if (snapData) setSnapshots(snapData)
      if (subData) setSubPrograms(subData)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => { activeModalRef.current = activeModal }, [activeModal])

  // Clear hover immediately when any modal opens — prevents color "stuck" after click
  useEffect(() => {
    if (activeModal !== null) {
      hoveredSummaryIdxRef.current = null
      setHoveredSummaryIdx(null)
    }
  }, [activeModal])

  useEffect(() => {
    if (showProgressModal || showDetail) {
      setHoveredProgressCard(false)
      setHoveredStatusIdx(null)
    }
  }, [showProgressModal, showDetail])

  useEffect(() => {
    if (isMobile) return
    // Cache card rects and hit-test against the cache on mousemove. The rects
    // only change on scroll / resize / layout — never on pointer movement — so
    // calling getBoundingClientRect on every mousemove was a pure layout thrash
    // (~60–120 sync reflows/sec while the cursor moves). Recompute only when
    // geometry actually changes; the move handler is then pure arithmetic.
    let rects: { l: number; r: number; t: number; b: number }[] = []
    const recompute = () => {
      rects = [...document.querySelectorAll<HTMLElement>('.metric-summary-card')].map(c => {
        const r = c.getBoundingClientRect()
        return { l: r.left, r: r.right, t: r.top, b: r.bottom }
      })
    }
    // Defer initial measure one frame so cards are painted in their final spot.
    const raf = requestAnimationFrame(recompute)

    const onMove = (e: MouseEvent) => {
      if (activeModalRef.current !== null) {
        if (hoveredSummaryIdxRef.current !== null) {
          hoveredSummaryIdxRef.current = null
          setHoveredSummaryIdx(null)
        }
        return
      }
      if (rects.length === 0) recompute()
      let found: number | null = null
      for (let i = 0; i < rects.length; i++) {
        const r = rects[i]
        if (e.clientX >= r.l && e.clientX <= r.r && e.clientY >= r.t && e.clientY <= r.b) { found = i; break }
      }
      if (found !== hoveredSummaryIdxRef.current) {
        hoveredSummaryIdxRef.current = found
        setHoveredSummaryIdx(found)
      }
    }
    document.addEventListener('mousemove', onMove, { passive: true })
    // capture:true so it also catches scroll on the app's inner scroll container.
    document.addEventListener('scroll', recompute, { capture: true, passive: true })
    window.addEventListener('resize', recompute, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('scroll', recompute, { capture: true } as EventListenerOptions)
      window.removeEventListener('resize', recompute)
    }
  }, [isMobile])

  // MAF must never see Man Power / Operasional in any total, list, chart or count.
  // Data arrives unfiltered, so gate once here and use these everywhere downstream.
  const isManPowerTx = (t: Transaction) => {
    const n = (t.nama_pekerjaan || '').toLowerCase()
    return n.includes('man power') || n.includes('honor')
  }
  const visiblePrograms = programs.filter(p => !isRestrictedForRole(p, role, isAdmin))
  const visibleTransactions = !isAdmin ? rawTransactions.filter(t => !isManPowerTx(t)) : rawTransactions

  const displayPrograms = visiblePrograms

  const totalAnggaran = programs.reduce((s, p) => s + (p.total_anggaran || 0), 0)
  const totalRealisasi = rawTransactions
    .filter(t => t.jenis_transaksi === 'Keluar' || t.jenis_transaksi === 'Keluar PBB')
    .reduce((s, t) => s + (t.nominal || 0), 0)
  const totalSisa = totalAnggaran - totalRealisasi
  const penyerapan = totalAnggaran > 0 ? ((totalRealisasi / totalAnggaran) * 100).toFixed(1) : '0'

  const progressPrograms = visiblePrograms
    .filter(p => p.status === 'On Going' || p.status === 'On Hold' || p.status === 'Selesai')
  const progressAnggaranTotal = progressPrograms.reduce((s, p) => s + (p.total_anggaran || 0), 0)
  const progressLapangan = progressAnggaranTotal > 0
    ? (progressPrograms.reduce((s, p) => s + getEffectiveProgress(p) * (p.total_anggaran || 0), 0) / progressAnggaranTotal).toFixed(1)
    : null

  const mostRecentUpdate = visiblePrograms.reduce((latest, p) => {
    if (!p.updated_at) return latest
    return p.updated_at > latest ? p.updated_at : latest
  }, '')
  const freshnessDays = mostRecentUpdate
    ? Math.floor((Date.now() - new Date(mostRecentUpdate).getTime()) / 86400000)
    : null
  const formattedLastUpdated = mostRecentUpdate
    ? (() => { const d = new Date(mostRecentUpdate); return `${d.getDate()} ${BULAN_ID[d.getMonth()]} ${d.getFullYear()}` })()
    : null

  const summaryCards = [
    {
      label: 'Total Anggaran',
      value: formatRupiahShort(totalAnggaran),
      iconType: 'anggaran',
      iconBg: 'rgba(26,111,232,0.08)',
      iconColor: 'rgba(26,111,232,0.6)',
      valueColor: 'var(--text-primary)',
      trend: `${programs.length} Pekerjaan`,
      accentColor: '#1A6FE8',
    },
    {
      label: 'Total Realisasi',
      value: formatRupiahShort(totalRealisasi),
      iconType: 'realisasi',
      iconBg: 'rgba(27,94,43,0.08)',
      iconColor: 'rgba(27,94,43,0.65)',
      valueColor: 'var(--text-primary)',
      // Was "${penyerapan}% Terserap" — duplicated the dedicated Penyerapan
      // card below verbatim. Shows program count with realized spend instead.
      trend: `${programs.filter(p => (p.realisasi_terkini || 0) > 0).length} Pekerjaan Terealisasi`,
      accentColor: '#1B5E2B',
    },
    {
      label: 'Sisa Anggaran',
      value: formatRupiahShort(totalSisa),
      iconType: 'sisa',
      iconBg: 'rgba(217,119,6,0.08)',
      iconColor: 'rgba(217,119,6,0.65)',
      valueColor: 'var(--text-primary)',
      trend: 'Belum Digunakan',
      // #B45309 (not the lighter #D97706 used elsewhere for tinted
      // backgrounds/borders) — this becomes the card's text color on hover,
      // and #D97706 as text on white fails WCAG AA contrast (3.02:1 < 4.5:1).
      accentColor: '#B45309',
    },
    {
      label: 'Penyerapan',
      value: `${penyerapan}%`,
      iconType: 'penyerapan',
      iconBg: 'rgba(26,111,232,0.08)',
      iconColor: 'rgba(26,111,232,0.6)',
      valueColor: 'var(--text-primary)',
      trend: 'Dari Total Anggaran',
      accentColor: '#1A6FE8',
    },
  ]

  const pekerjaanCards = [
    {
      label: 'Progres Pekerjaan',
      value: progressLapangan ? `${progressLapangan}%` : '—',
      sub: `dari ${progressPrograms.length} pekerjaan berjalan`,
      color: 'var(--text-primary)',
      barColor: 'var(--blue)',
      trackColor: 'rgba(26,111,232,0.1)',
      iconBg: 'rgba(26,111,232,0.08)',
      iconColor: 'rgba(26,111,232,0.6)',
      iconType: 'progress',
      accentColor: '#1A6FE8',
      onClick: () => { setPekerjaanTab('On Going'); setPopupDetailId(null); setShowDetail(true) },
    },
    {
      label: 'Selesai',
      value: String(visiblePrograms.filter(p => p.status ==='Selesai').length),
      sub: 'Program selesai',
      color: 'var(--text-primary)',
      barColor: 'var(--blue)',
      trackColor: 'rgba(0,0,0,0.06)',
      iconBg: 'rgba(27,94,43,0.08)',
      iconColor: 'rgba(27,94,43,0.65)',
      iconType: 'Selesai',
      accentColor: STATUS_COLORS['Selesai'],
      onClick: () => { setPekerjaanTab('Selesai'); setPopupDetailId(null); setShowDetail(true) },
    },
    {
      label: 'On Going',
      value: String(visiblePrograms.filter(p => p.status ==='On Going').length),
      sub: 'Pekerjaan berjalan',
      color: 'var(--text-primary)',
      barColor: 'var(--blue)',
      trackColor: 'rgba(0,0,0,0.06)',
      iconBg: 'rgba(26,111,232,0.08)',
      iconColor: 'rgba(26,111,232,0.6)',
      iconType: 'On Going',
      accentColor: STATUS_COLORS['On Going'],
      onClick: () => { setPekerjaanTab('On Going'); setPopupDetailId(null); setShowDetail(true) },
    },
    {
      label: 'On Hold',
      value: String(visiblePrograms.filter(p => p.status ==='On Hold').length),
      sub: 'Ditangguhkan',
      color: 'var(--text-primary)',
      barColor: 'var(--blue)',
      trackColor: 'rgba(0,0,0,0.06)',
      iconBg: 'rgba(217,119,6,0.08)',
      iconColor: 'rgba(217,119,6,0.65)',
      iconType: 'On Hold',
      accentColor: STATUS_COLORS['On Hold'],
      onClick: () => { setPekerjaanTab('On Hold'); setPopupDetailId(null); setShowDetail(true) },
    },
    {
      label: 'Perencanaan',
      value: String(visiblePrograms.filter(p => p.status ==='Perencanaan').length),
      sub: 'Belum mulai',
      color: 'var(--text-primary)',
      barColor: 'var(--blue)',
      trackColor: 'rgba(0,0,0,0.06)',
      iconBg: 'rgba(51,65,85,0.08)',
      iconColor: 'rgba(51,65,85,0.7)',
      iconType: 'Perencanaan',
      accentColor: STATUS_COLORS['Perencanaan'],
      onClick: () => { setPekerjaanTab('Perencanaan'); setPopupDetailId(null); setShowDetail(true) },
    },
  ]

  if (loading) {
    // Mirrors the loaded layout's actual sections/grid/padding (not a generic
    // 4-card guess) so there's no big layout jump once data arrives — the
    // real SectionPanel + real header are reused as-is since their size
    // doesn't depend on data; only the numeric content inside is placeholder.
    const skelCard = (key: number) => (
      <div key={key} style={{ backgroundColor: 'var(--surface-raised)', borderRadius: 12, padding: isMobile ? '12px 13px' : '18px 20px', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? 5 : 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 7 : 9 }}>
            <div style={{ width: isMobile ? 26 : 30, height: isMobile ? 26 : 30, borderRadius: 8, backgroundColor: 'var(--surface-subtle)' }} />
            <div style={{ width: 40, height: isMobile ? 9.5 : 11, borderRadius: 4, backgroundColor: 'var(--surface-subtle)' }} />
          </div>
          <div style={{ width: '65%', height: isMobile ? 15 : 20, borderRadius: 5, backgroundColor: 'var(--surface-subtle)' }} />
          <div style={{ width: '45%', height: isMobile ? 10 : 11, borderRadius: 4, backgroundColor: 'var(--surface-subtle)' }} />
        </div>
      </div>
    )
    return (
      <div style={{ padding: isMobile ? '16px 14px 48px' : '28px 28px 48px' }}>
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
                Dashboard Sarpras MAF
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '5px 0 0' }}>
                Ringkasan anggaran, realisasi &amp; progres pekerjaan
              </p>
            </div>
            <span style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 400, flexShrink: 0, whiteSpace: 'nowrap', marginTop: 4 }}>
              {getTodayFormatted()}
            </span>
          </div>
        )}

        <SectionPanel label="Ringkasan Keuangan" isMobile={isMobile}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 10 : 14 }}>
            {[0, 1, 2, 3].map(skelCard)}
          </div>
        </SectionPanel>

        <SectionPanel label="Progress Pekerjaan" isMobile={isMobile}>
          <div style={{ backgroundColor: 'var(--surface-raised)', borderRadius: 12, padding: isMobile ? '14px 16px' : '18px 24px', border: '1px solid var(--border-subtle)', marginBottom: isMobile ? 10 : 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 10, flexShrink: 0 }}>
                <div style={{ width: isMobile ? 26 : 30, height: isMobile ? 26 : 30, borderRadius: 8, backgroundColor: 'var(--surface-subtle)' }} />
                <div style={{ width: 36, height: isMobile ? 17 : 22, borderRadius: 5, backgroundColor: 'var(--surface-subtle)' }} />
              </div>
              <div style={{ flex: 1, height: isMobile ? 7 : 9, borderRadius: 99, backgroundColor: 'var(--surface-subtle)' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 10 : 14 }}>
            {[0, 1, 2, 3].map(skelCard)}
          </div>
        </SectionPanel>

        <SectionPanel label="Realisasi & Progress" isMobile={isMobile}>
          <div style={{ height: isMobile ? 180 : 240, borderRadius: 10, backgroundColor: 'var(--surface-subtle)' }} />
        </SectionPanel>
      </div>
    )
  }

  return (
    <div style={{ padding: isMobile ? '16px 14px 48px' : '28px 28px 48px' }}>
      {/* Page Header — mobile: judul ada di top bar (App.tsx), sini cukup metadata */}
      {isMobile ? (
        formattedLastUpdated ? (
          <div style={{ marginBottom: 12 }}>
            <span style={{
              fontSize: 10.5, color: 'rgba(27,94,43,.7)', fontWeight: 500,
              display: 'block',
            }}>
              Last updated {formattedLastUpdated}
            </span>
          </div>
        ) : null
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
              Dashboard Sarpras MAF
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '5px 0 0' }}>
              Ringkasan anggaran, realisasi & progres pekerjaan
            </p>
            {formattedLastUpdated && (
              <div style={{ marginTop: 6 }}>
                <span style={{
                  fontSize: 11, color: 'rgba(27,94,43,.7)', fontWeight: 500,
                }}>
                  Last updated {formattedLastUpdated}
                </span>
              </div>
            )}
          </div>
          {/* Tanggal hari ini — rata kanan di desktop */}
          <span style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 400, flexShrink: 0, whiteSpace: 'nowrap', marginTop: 4 }}>
            {getTodayFormatted()}
          </span>
        </div>
      )}

      {/* ── RINGKASAN: Keuangan ── */}
      {<SectionPanel label="Ringkasan Keuangan" isMobile={isMobile}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 10 : 14 }}>
        {summaryCards.map((card, idx) => (
          <div
            key={card.label}
            className="metric-summary-card"
            role="button"
            tabIndex={0}
            aria-label={`Lihat detail ${card.label}`}
            onClick={() => {
              hoveredSummaryIdxRef.current = null
              setHoveredSummaryIdx(null)
              setActiveModal(card.iconType as MetricModalType)
            }}
            onKeyDown={onActivateKey(() => {
              hoveredSummaryIdxRef.current = null
              setHoveredSummaryIdx(null)
              setActiveModal(card.iconType as MetricModalType)
            })}
            style={{
              backgroundColor: hoveredSummaryIdx === idx ? card.accentColor + '0D' : 'var(--surface-raised)',
              borderRadius: 12,
              padding: isMobile ? '12px 13px' : '18px 20px',
              border: `1px solid ${hoveredSummaryIdx === idx ? card.accentColor : 'var(--border-subtle)'}`,
              boxShadow: hoveredSummaryIdx === idx ? `0 4px 16px ${card.accentColor}28` : '0 1px 3px rgba(0,0,0,0.05)',
              transform: hoveredSummaryIdx === idx ? 'translateY(-2px)' : 'none',
              transition: 'border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? 5 : 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 7 : 9 }}>
                <div style={{ width: isMobile ? 26 : 30, height: isMobile ? 26 : 30, borderRadius: 8, backgroundColor: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.iconColor, flexShrink: 0 }}>
                  <MetricIcon type={card.iconType} />
                </div>
                <div style={{ fontSize: isMobile ? 9.5 : 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{card.label}</div>
              </div>
              <div style={{ fontSize: isMobile ? 15 : 20, fontWeight: 700, color: hoveredSummaryIdx === idx ? card.accentColor : card.valueColor, letterSpacing: '-0.03em', lineHeight: 1.1, wordBreak: 'break-word', textAlign: 'center', transition: 'color 0.18s ease' }}>{card.value}</div>
              <div style={{ fontSize: isMobile ? 10 : 11, color: 'var(--text-muted)', fontWeight: 400, textAlign: 'center' }}>{card.trend}</div>
            </div>
          </div>
        ))}
      </div>
      {/* ── PERHATIAN: peringatan anggaran menempel di Section Keuangan ── */}
      <BerandaAlerts programs={displayPrograms} showOverdue={false} embedded />
      </SectionPanel>}

      {/* ── RINGKASAN: Progress Pekerjaan (full-width) ── */}
      {<SectionPanel label="Progress Pekerjaan" isMobile={isMobile}>
      {(() => {
        const card = pekerjaanCards[0]
        return (
          <div
            role="button"
            tabIndex={0}
            aria-label="Lihat detail progress pekerjaan"
            onClick={() => setShowProgressModal(true)}
            onKeyDown={onActivateKey(() => setShowProgressModal(true))}
            style={{
              backgroundColor: 'var(--surface-raised)',
              borderRadius: 12,
              padding: isMobile ? '14px 16px' : '18px 24px',
              border: `1px solid ${hoveredProgressCard ? card.accentColor : 'var(--border-subtle)'}`,
              boxShadow: hoveredProgressCard ? `0 4px 16px ${card.accentColor}28` : '0 1px 3px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: isMobile ? 12 : 14,
              cursor: 'pointer',
              transition: 'box-shadow 0.18s ease, border-color 0.18s ease',
            }}
            onMouseEnter={() => setHoveredProgressCard(true)}
            onMouseLeave={() => setHoveredProgressCard(false)}
          >
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 10, flexShrink: 0 }}>
                  <div style={{ width: isMobile ? 26 : 30, height: isMobile ? 26 : 30, borderRadius: 8, backgroundColor: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.iconColor }}>
                    <PekerjaanIcon type={card.iconType} />
                  </div>
                  <div style={{ fontSize: isMobile ? 17 : 22, fontWeight: 700, color: card.color, letterSpacing: '-0.03em', lineHeight: 1 }}>{card.value}</div>
                </div>
                <div style={{ flex: 1, height: isMobile ? 7 : 9, borderRadius: 99, backgroundColor: card.trackColor ?? 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${progressLapangan || 0}%`,
                    backgroundColor: card.barColor ?? 'var(--blue)',
                    borderRadius: 99,
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>
              <div style={{ fontSize: isMobile ? 9.5 : 10.5, color: 'var(--text-muted)', marginTop: 6 }}>
                Dari Total {programs.length} Pekerjaan
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── RINGKASAN: Status Pekerjaan (2×2 mobile / 4 kolom desktop) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 10 : 14, marginTop: isMobile ? 10 : 14 }}>
        {pekerjaanCards.slice(1).map((card, idx) => {
          const activeByTab = showDetail && pekerjaanTab === card.label
          const isHovered = hoveredStatusIdx === idx
          return (
            <div
              key={card.label}
              role="button"
              tabIndex={0}
              aria-label={`Lihat daftar pekerjaan ${card.label}`}
              onClick={card.onClick}
              onKeyDown={onActivateKey(card.onClick)}
              style={{
                backgroundColor: isHovered ? card.accentColor + '0D' : activeByTab ? 'rgba(0,0,0,0.03)' : 'var(--surface-raised)',
                borderRadius: 12,
                padding: isMobile ? '12px 13px' : '18px 20px',
                border: isHovered ? `1px solid ${card.accentColor}` : activeByTab ? '1.5px solid var(--border)' : '1px solid var(--border-subtle)',
                boxShadow: isHovered ? `0 4px 16px ${card.accentColor}28` : '0 1px 3px rgba(0,0,0,0.05)',
                transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                transition: 'border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={() => setHoveredStatusIdx(idx)}
              onMouseLeave={() => setHoveredStatusIdx(null)}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? 5 : 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 7 : 9 }}>
                  <div style={{ width: isMobile ? 26 : 30, height: isMobile ? 26 : 30, borderRadius: 8, backgroundColor: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.iconColor, flexShrink: 0 }}>
                    <PekerjaanIcon type={card.iconType} />
                  </div>
                  <div style={{ fontSize: isMobile ? 17 : 22, fontWeight: 700, color: card.color, letterSpacing: '-0.03em', lineHeight: 1 }}>{card.value}</div>
                </div>
                <div style={{ fontSize: isMobile ? 9.5 : 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>{card.label}</div>
                <div style={{ fontSize: isMobile ? 10 : 11, color: 'var(--text-muted)', fontWeight: 400, textAlign: 'center' }}>{card.sub}</div>
              </div>
            </div>
          )
        })}
      </div>
      </SectionPanel>}

      {/* ── SECTION 3: Realisasi & Progress (chart) ── */}
      <SectionPanel label="Realisasi & Progress" isMobile={isMobile}>
        <BerandaChart transactions={visibleTransactions} snapshots={snapshots} programs={visiblePrograms} bare />
      </SectionPanel>

      {/* ── POPUP: Progres Pekerjaan ── */}
      {showProgressModal && (
        <ModalShell
          onClose={() => setShowProgressModal(false)}
          maxWidth={960}
          zIndex={Z_MODAL_POPUP}
        >
          <ModalHeader
            title="Progres Pekerjaan"
            subtitle={<>{progressPrograms.length} pekerjaan · progres rata-rata <span style={{ color: 'var(--blue)', fontWeight: 700 }}>{progressLapangan}%</span></>}
            onClose={() => setShowProgressModal(false)}
            isMobile={isMobile}
            padding={isMobile ? '4px 16px 12px' : '18px 20px 14px'}
          />
          {/* List program */}
          <div style={{ padding: isMobile ? '12px 14px 22px' : '14px 18px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...progressPrograms].sort((a, b) => getEffectiveProgress(b) - getEffectiveProgress(a)).map(p => {
              const pct = getEffectiveProgress(p)
              const bobotPct = progressAnggaranTotal > 0 ? Math.round((p.total_anggaran || 0) / progressAnggaranTotal * 100) : 0
              const color = STATUS_COLORS[p.status] || 'var(--blue)'
              return (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Lihat detail ${p.nama_pekerjaan}`}
                  onClick={() => { setShowProgressModal(false); setDetailProgramId(p.id) }}
                  onKeyDown={onActivateKey(() => { setShowProgressModal(false); setDetailProgramId(p.id) })}
                  style={{ backgroundColor: 'var(--surface-subtle)', borderRadius: 12, padding: isMobile ? '13px 14px' : '14px 16px', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0 }}>{p.id}</span>
                    <span style={{ fontSize: isMobile ? 11.5 : 12.5, fontWeight: 600, color: 'var(--text-primary)', flex: 1, lineHeight: 1.3 }}>{p.nama_pekerjaan}</span>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: color, backgroundColor: STATUS_BG[p.status] || 'var(--border-subtle)', padding: '2px 7px', borderRadius: 20, flexShrink: 0 }}>{p.status}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 5, borderRadius: 99, backgroundColor: 'var(--border-subtle)', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: 99, transition: 'width 0.4s ease' }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: color, minWidth: 32, textAlign: 'right' }}>{pct}%</span>
                  </div>
                  <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 5 }}>
                    Bobot anggaran: {bobotPct}% dari total
                  </div>
                </div>
              )
            })}
          </div>
        </ModalShell>
      )}

      {/* ── POPUP: Detail Pekerjaan ── */}
      {showDetail && (
        <ModalShell
          onClose={() => { setShowDetail(false); setPopupDetailId(null) }}
          maxWidth={isMobile ? 600 : 1000}
          zIndex={Z_MODAL_POPUP}
          contentScroll={false}
        >
          {close => {
            const tabCounts: Record<string, number> = {
              'On Going': displayPrograms.filter(p => p.status === 'On Going').length,
              'On Hold': displayPrograms.filter(p => p.status === 'On Hold').length,
              'Selesai': displayPrograms.filter(p => p.status === 'Selesai').length,
              'Perencanaan': displayPrograms.filter(p => p.status === 'Perencanaan').length,
            }
            const tabTitles: Record<string, string> = {
              'On Going': 'Pekerjaan Berlangsung',
              'On Hold': 'Pekerjaan Ditangguhkan',
              'Selesai': 'Pekerjaan Selesai',
              'Perencanaan': 'Tahap Perencanaan',
            }
            return (
              <div style={{ display: 'flex', flexDirection: 'column', height: isMobile ? '82vh' : '84vh' }}>
                {popupDetailId ? (
                  /* ── View 2: Program Detail (in-popup, no stacking) ── */
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                    <div style={{
                      padding: isMobile ? '14px 16px' : '16px 24px',
                      borderBottom: '1px solid var(--border-subtle)',
                      flexShrink: 0,
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <button
                        onClick={() => setPopupDetailId(null)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '6px 12px', borderRadius: 8,
                          border: '1px solid var(--border)', backgroundColor: 'var(--card)',
                          color: 'var(--text-secondary)', fontSize: 12.5, fontWeight: 600,
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                          <polyline points="15 18 9 12 15 6"/>
                        </svg>
                        Kembali
                      </button>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Detail Pekerjaan</span>
                      <button
                        onClick={() => { setShowDetail(false); setPopupDetailId(null) }}
                        style={{
                          marginLeft: 'auto', width: 40, height: 40, borderRadius: 10,
                          border: '1px solid var(--border)', backgroundColor: 'var(--card)',
                          color: 'var(--text-muted)', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1, overscrollBehavior: 'contain' }}>
                      <PekerjaanDetail
                        programId={popupDetailId}
                        isAdmin={isAdmin}
                        role={role}
                        embedded
                        onBack={() => setPopupDetailId(null)}
                        onNavigate={onNavigate ? (page, pid, cat) => {
                          setShowDetail(false)
                          setPopupDetailId(null)
                          onNavigate(page, pid, cat)
                        } : undefined}
                      />
                    </div>
                  </div>
                ) : (
                  /* ── View 1: Program List with filter tabs ── */
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                    {/* Header */}
                    <ModalHeader
                      title={tabTitles[pekerjaanTab]}
                      subtitle={`${tabCounts[pekerjaanTab]} pekerjaan`}
                      onClose={close}
                      isMobile={isMobile}
                      padding={isMobile ? '18px 16px 16px' : '22px 28px 18px'}
                    />
                    {/* Summary bar — non-scrollable, always visible at top */}
                    <FilterSummaryBar
                      status={pekerjaanTab}
                      programs={displayPrograms.filter(p => p.status === pekerjaanTab)}
                      subPrograms={subPrograms}
                      transactions={visibleTransactions}
                      compact
                      isMobile={isMobile}
                      isAdmin={isAdmin}
                    />

                    {/* Scrollable program list */}
                    <div style={{ overflowY: 'auto', flex: 1, overscrollBehavior: 'contain' }}>
                      <BerandaWeekOverWeek
                        programs={programs}
                        snapshots={snapshots}
                        subPrograms={subPrograms}
                        rencanaMap={rencanaMap}
                        progressLapangan={progressLapangan}
                        freshnessDays={freshnessDays}
                        lastUpdated={mostRecentUpdate}
                        hideHeader
                        spacious
                        externalTab={pekerjaanTab}
                        onExternalTabChange={setPekerjaanTab}
                        isAdmin={isAdmin}
                        onProgramClick={id => {
                          const prog = programs.find(p => p.id === id)
                          if (prog && isRestrictedForRole(prog, role, isAdmin)) {
                            setShowBlockedModal(true)
                            return
                          }
                          if (onOpenDetail) onOpenDetail(id, pekerjaanTab)
                          else setPopupDetailId(id)
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          }}
        </ModalShell>
      )}

      {activeModal && (
        <MetricDetailModal
          type={activeModal}
          programs={displayPrograms}
          totalAnggaran={totalAnggaran}
          totalRealisasi={totalRealisasi}
          onClose={() => setActiveModal(null)}
          onProgramClick={id => { setActiveModal(null); setDetailProgramId(id) }}
        />
      )}

      {detailProgramId && (
        <ModalShell
          onClose={() => setDetailProgramId(null)}
          maxWidth={820}
          zIndex={Z_MODAL_POPUP}
          panelColor="var(--bg)"
        >
          {close => (
            <div style={{ position: 'relative' }}>
              {!isMobile && (
                <button
                  onClick={close}
                  style={{
                    position: 'absolute', top: 14, right: 14, zIndex: 10,
                    width: 40, height: 40, borderRadius: 10,
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--card)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
              <PekerjaanDetail
                programId={detailProgramId}
                isAdmin={isAdmin}
                role={role}
                embedded
                onBack={close}
                onNavigate={onNavigate ? (page, pid, cat) => {
                  setDetailProgramId(null)
                  onNavigate(page, pid, cat)
                } : undefined}
              />
            </div>
          )}
        </ModalShell>
      )}

      {/* Modal: Akses Dibatasi (MAF user klik Man Power) */}
      {showBlockedModal && <AksesDibatasiModal onClose={() => setShowBlockedModal(false)} />}
    </div>
  )
}
