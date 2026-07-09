import { useEffect, useState } from 'react'
import { fetchPrograms, fetchTransactions, fetchSnapshots, fetchSubPrograms, fetchWeeklyNotes, Program, ProgramSnapshot, Transaction, SubProgram } from '../lib/supabase'
import { formatRupiah, getTodayFormatted, getEffectiveProgress } from '../lib/data'
import { useWindowWidth } from '../lib/useWindowWidth'
import LaporanPekananCard from './LaporanPekananCard'
import BerandaAlerts from './BerandaAlerts'
import BerandaWeekOverWeek from './BerandaWeekOverWeek'
import BerandaChart from './BerandaChart'
import MetricDetailModal, { MetricModalType } from './MetricDetailModal'
import PekerjaanDetail from './PekerjaanDetail'
import ModalShell from './ModalShell'

interface BerandaProps {
  isAdmin: boolean
  role: 'pbb' | 'maf' | null
  onNavigate?: (page: string, programId?: string, category?: string) => void
  initialDetailId?: string | null
  onInitialDetailConsumed?: () => void
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

const SectionDivider = ({ label, isMobile }: { label: string; isMobile: boolean }) => (
  <div style={{ marginBottom: isMobile ? 8 : 12, marginTop: isMobile ? 16 : 20 }}>
    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      {label}
    </div>
    <div style={{ height: 1, backgroundColor: 'var(--border-subtle)', marginTop: 6 }} />
  </div>
)

export default function Beranda({ isAdmin, role, onNavigate, initialDetailId, onInitialDetailConsumed }: BerandaProps) {
  const width = useWindowWidth()
  const isMobile = width < 600
  const [programs, setPrograms] = useState<Program[]>([])
  const [rawTransactions, setRawTransactions] = useState<Transaction[]>([])
  const [snapshots, setSnapshots] = useState<ProgramSnapshot[]>([])
  const [subPrograms, setSubPrograms] = useState<SubProgram[]>([])
  const [rencanaMap, setRencanaMap] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [showLaporan, setShowLaporan] = useState(false)
  const [activeModal, setActiveModal] = useState<MetricModalType | null>(null)
  const [detailProgramId, setDetailProgramId] = useState<string | null>(null)
  const [pekerjaanTab, setPekerjaanTab] = useState('On Going')
  const [showDetail, setShowDetail] = useState(false)
  const [popupDetailId, setPopupDetailId] = useState<string | null>(null)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [showBlockedModal, setShowBlockedModal] = useState(false)

  useEffect(() => {
    if (initialDetailId) {
      setDetailProgramId(initialDetailId)
      onInitialDetailConsumed?.()
    }
  }, [initialDetailId])

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

  const displayPrograms = programs

  const totalAnggaran = programs.reduce((s, p) => s + (p.total_anggaran || 0), 0)
  const totalRealisasi = rawTransactions
    .filter(t => t.jenis_transaksi === 'Keluar' || t.jenis_transaksi === 'Keluar PBB')
    .reduce((s, t) => s + (t.nominal || 0), 0)
  const totalSisa = totalAnggaran - totalRealisasi
  const penyerapan = totalAnggaran > 0 ? ((totalRealisasi / totalAnggaran) * 100).toFixed(1) : '0'

  const progressPrograms = programs.filter(p => p.status === 'On Going' || p.status === 'On Hold' || p.status === 'Selesai')
  const progressAnggaranTotal = progressPrograms.reduce((s, p) => s + (p.total_anggaran || 0), 0)
  const progressLapangan = progressAnggaranTotal > 0
    ? (progressPrograms.reduce((s, p) => s + getEffectiveProgress(p) * (p.total_anggaran || 0), 0) / progressAnggaranTotal).toFixed(1)
    : null

  const mostRecentUpdate = programs.reduce((latest, p) => {
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
      value: formatRupiah(totalAnggaran),
      iconType: 'anggaran',
      iconBg: 'rgba(0,0,0,0.05)',
      iconColor: 'var(--text-secondary)',
      valueColor: 'var(--text-primary)',
      trend: `${displayPrograms.length} Pekerjaan`,
      accentColor: 'var(--border)',
    },
    {
      label: 'Total Realisasi',
      value: formatRupiah(totalRealisasi),
      iconType: 'realisasi',
      iconBg: 'rgba(0,0,0,0.05)',
      iconColor: 'var(--text-secondary)',
      valueColor: 'var(--text-primary)',
      trend: `${penyerapan}% Terserap`,
      accentColor: 'var(--border)',
    },
    {
      label: 'Sisa Anggaran',
      value: formatRupiah(totalSisa),
      iconType: 'sisa',
      iconBg: 'rgba(0,0,0,0.05)',
      iconColor: 'var(--text-secondary)',
      valueColor: 'var(--text-primary)',
      trend: 'Belum Digunakan',
      accentColor: 'var(--border)',
    },
    {
      label: 'Penyerapan',
      value: `${penyerapan}%`,
      iconType: 'penyerapan',
      iconBg: 'rgba(0,0,0,0.05)',
      iconColor: 'var(--text-secondary)',
      valueColor: 'var(--text-primary)',
      trend: 'Dari Total Anggaran',
      accentColor: 'var(--border)',
    },
  ]

  const pekerjaanCards = [
    {
      label: 'Progres Pekerjaan',
      value: progressLapangan ? `${progressLapangan}%` : '—',
      sub: `dari ${progressPrograms.length} pekerjaan berjalan`,
      color: 'var(--text-primary)',
      barColor: 'var(--blue)',
      iconBg: 'rgba(0,0,0,0.05)',
      iconColor: 'var(--text-secondary)',
      iconType: 'progress',
      onClick: () => { setPekerjaanTab('On Going'); setPopupDetailId(null); setShowDetail(true) },
    },
    {
      label: 'On Going',
      value: String(programs.filter(p => p.status === 'On Going').length),
      sub: 'Pekerjaan berjalan',
      color: 'var(--text-primary)',
      barColor: 'var(--blue)',
      iconBg: 'rgba(0,0,0,0.05)',
      iconColor: 'var(--text-secondary)',
      iconType: 'On Going',
      onClick: () => { setPekerjaanTab('On Going'); setPopupDetailId(null); setShowDetail(true) },
    },
    {
      label: 'On Hold',
      value: String(programs.filter(p => p.status === 'On Hold').length),
      sub: 'Ditangguhkan',
      color: 'var(--text-primary)',
      barColor: 'var(--blue)',
      iconBg: 'rgba(0,0,0,0.05)',
      iconColor: 'var(--text-secondary)',
      iconType: 'On Hold',
      onClick: () => { setPekerjaanTab('On Hold'); setPopupDetailId(null); setShowDetail(true) },
    },
    {
      label: 'Selesai',
      value: String(programs.filter(p => p.status === 'Selesai').length),
      sub: 'Program selesai',
      color: 'var(--text-primary)',
      barColor: 'var(--blue)',
      iconBg: 'rgba(0,0,0,0.05)',
      iconColor: 'var(--text-secondary)',
      iconType: 'Selesai',
      onClick: () => { setPekerjaanTab('Selesai'); setPopupDetailId(null); setShowDetail(true) },
    },
    {
      label: 'Perencanaan',
      value: String(programs.filter(p => p.status === 'Perencanaan').length),
      sub: 'Belum mulai',
      color: 'var(--text-primary)',
      barColor: 'var(--blue)',
      iconBg: 'rgba(0,0,0,0.05)',
      iconColor: 'var(--text-secondary)',
      iconType: 'Perencanaan',
      onClick: () => { setPekerjaanTab('Perencanaan'); setPopupDetailId(null); setShowDetail(true) },
    },
  ]

  if (loading) {
    return (
      <div style={{ padding: '28px 28px 40px' }}>
        {/* Skeleton header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ width: 240, height: 24, borderRadius: 8, backgroundColor: 'var(--border-subtle)', marginBottom: 8 }} />
          <div style={{ width: 120, height: 14, borderRadius: 6, backgroundColor: 'var(--surface-hover)' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ backgroundColor: 'var(--card)', borderRadius: 14, padding: 20, height: 110, border: '1px solid var(--border-subtle)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: 'var(--surface-subtle)', marginBottom: 14 }} />
              <div style={{ width: '60%', height: 11, borderRadius: 5, backgroundColor: 'var(--surface-subtle)', marginBottom: 8 }} />
              <div style={{ width: '80%', height: 20, borderRadius: 6, backgroundColor: 'var(--surface-subtle)' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: isMobile ? '16px 14px 48px' : '28px 28px 48px' }}>
      {/* Page Header */}
      {isMobile ? (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
              Dashboard Sarpras MAF
            </h1>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, flexShrink: 0, marginLeft: 8, marginTop: 2 }}>
              {getTodayFormatted()}
            </span>
          </div>
          {formattedLastUpdated && (
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              fontSize: 10, color: 'rgba(27,94,43,.75)', fontWeight: 500,
              border: '0.5px solid rgba(27,94,43,.22)', borderRadius: 5,
              padding: '2px 7px', background: 'rgba(27,94,43,.06)', marginTop: 5,
            }}>
              Diperbarui {formattedLastUpdated}
            </span>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
              Dashboard Sarpras MAF
            </h1>
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 400 }}>{getTodayFormatted()}</span>
              {formattedLastUpdated && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center',
                  fontSize: 11, color: 'rgba(27,94,43,.75)', fontWeight: 500,
                  border: '0.5px solid rgba(27,94,43,.22)', borderRadius: 5,
                  padding: '2px 8px', background: 'rgba(27,94,43,.06)',
                }}>
                  Diperbarui {formattedLastUpdated}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── RINGKASAN: Keuangan ── */}
      <SectionDivider label="Ringkasan Keuangan" isMobile={isMobile} />
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 10 : 14, marginBottom: isMobile ? 10 : 14 }}>
        {summaryCards.map(card => (
          <div
            key={card.label}
            onClick={() => setActiveModal(card.iconType as MetricModalType)}
            style={{
              backgroundColor: 'var(--card)',
              borderRadius: 12,
              padding: isMobile ? '12px 13px' : '18px 20px',
              border: '1px solid var(--border-subtle)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              transition: 'border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease',
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLDivElement
              el.style.borderColor = card.accentColor
              el.style.backgroundColor = card.accentColor + '0D'
              el.style.boxShadow = `0 4px 16px ${card.accentColor}28`
              el.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLDivElement
              el.style.borderColor = 'var(--border-subtle)'
              el.style.backgroundColor = 'var(--card)'
              el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'
              el.style.transform = 'translateY(0)'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? 5 : 6 }}>
              {/* Baris 1: Icon + Label berdampingan */}
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 7 : 9 }}>
                <div style={{ width: isMobile ? 26 : 30, height: isMobile ? 26 : 30, borderRadius: 8, backgroundColor: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.iconColor, flexShrink: 0 }}>
                  <MetricIcon type={card.iconType} />
                </div>
                <div style={{ fontSize: isMobile ? 9.5 : 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{card.label}</div>
              </div>
              {/* Baris 2: Nilai besar */}
              <div style={{ fontSize: isMobile ? 15 : 20, fontWeight: 700, color: card.valueColor, letterSpacing: '-0.03em', lineHeight: 1.1, wordBreak: 'break-word', textAlign: 'center' }}>{card.value}</div>
              {/* Baris 3: Keterangan */}
              <div style={{ fontSize: isMobile ? 10 : 11, color: 'var(--text-muted)', fontWeight: 400, textAlign: 'center' }}>{card.trend}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── RINGKASAN: Progress Pekerjaan (full-width) ── */}
      <SectionDivider label="Progress Pekerjaan" isMobile={isMobile} />
      {(() => {
        const card = pekerjaanCards[0]
        const activeByTab = showDetail && pekerjaanTab === card.label
        return (
          <div
            onClick={() => setShowProgressModal(true)}
            style={{
              backgroundColor: 'var(--card)',
              borderRadius: 12,
              padding: isMobile ? '14px 16px' : '18px 24px',
              border: '1px solid var(--border-subtle)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              marginBottom: isMobile ? 10 : 14,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: isMobile ? 12 : 14,
              cursor: 'pointer',
              transition: 'box-shadow 0.18s ease, border-color 0.18s ease',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLDivElement
              el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
              el.style.borderColor = 'var(--border)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLDivElement
              el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'
              el.style.borderColor = 'var(--border-subtle)'
            }}
          >
            {/* Header tengah — dipisah dengan garis bawah tipis */}
            <div style={{
              textAlign: 'center',
              fontSize: isMobile ? 9.5 : 11,
              fontWeight: 700,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              paddingBottom: isMobile ? 10 : 12,
              borderBottom: '1px solid var(--border-subtle)',
              width: '100%',
            }}>
              {card.label}
            </div>
            {/* Baris: icon + angka | progress bar — center */}
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 16, width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 10, flexShrink: 0 }}>
                <div style={{ width: isMobile ? 26 : 30, height: isMobile ? 26 : 30, borderRadius: 8, backgroundColor: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.iconColor }}>
                  <PekerjaanIcon type={card.iconType} />
                </div>
                <div style={{ fontSize: isMobile ? 17 : 22, fontWeight: 700, color: card.color, letterSpacing: '-0.03em', lineHeight: 1 }}>{card.value}</div>
              </div>
              {/* Progress bar */}
              <div style={{ flex: 1 }}>
                <div style={{ height: isMobile ? 7 : 9, borderRadius: 99, backgroundColor: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${progressLapangan || 0}%`,
                    backgroundColor: card.barColor ?? 'var(--blue)',
                    borderRadius: 99,
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <div style={{ fontSize: isMobile ? 8.5 : 9.5, color: 'var(--text-muted)', marginTop: 6 }}>
                  Dari Total {programs.length} Pekerjaan
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── RINGKASAN: Status Pekerjaan (2×2 mobile / 4 kolom desktop) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 10 : 14, marginBottom: 20 }}>
        {pekerjaanCards.slice(1).map(card => {
          const activeByTab = showDetail && pekerjaanTab === card.label
          return (
            <div
              key={card.label}
              onClick={card.onClick}
              style={{
                backgroundColor: activeByTab ? 'rgba(0,0,0,0.03)' : 'var(--card)',
                borderRadius: 12,
                padding: isMobile ? '12px 13px' : '18px 20px',
                border: activeByTab ? '1.5px solid var(--border)' : '1px solid var(--border-subtle)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.borderColor = 'var(--border)'
                el.style.backgroundColor = 'rgba(0,0,0,0.03)'
                el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
                el.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.borderColor = activeByTab ? 'var(--border)' : 'var(--border-subtle)'
                el.style.backgroundColor = activeByTab ? 'rgba(0,0,0,0.03)' : 'var(--card)'
                el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'
                el.style.transform = 'translateY(0)'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? 5 : 6 }}>
                {/* Icon + angka berdampingan */}
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

      {/* ── PERHATIAN ── */}
      <BerandaAlerts programs={displayPrograms} showOverdue={false} />

      {/* ── TREN ── */}
      <BerandaChart transactions={rawTransactions} snapshots={snapshots} programs={programs} />

      {/* ── POPUP: Progres Pekerjaan ── */}
      {showProgressModal && (
        <div
          onClick={() => setShowProgressModal(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,22,40,0.5)', backdropFilter: 'blur(8px)', zIndex: 300, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 24 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--card)',
              borderRadius: isMobile ? '20px 20px 0 0' : 16,
              width: '100%',
              maxWidth: 960,
              maxHeight: isMobile ? '88dvh' : '80vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
            }}
          >
            {/* Header modal */}
            <div style={{ padding: isMobile ? '16px 16px 12px' : '18px 20px 14px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Progres Pekerjaan</div>
                <div style={{ fontSize: isMobile ? 11 : 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {progressPrograms.length} pekerjaan · progres rata-rata <span style={{ color: '#7C3AED', fontWeight: 700 }}>{progressLapangan}%</span>
                </div>
              </div>
              <button
                onClick={() => setShowProgressModal(false)}
                style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-subtle)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0 }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            {/* List program */}
            <div style={{ overflowY: 'auto', padding: isMobile ? '10px 12px 20px' : '12px 16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...progressPrograms].sort((a, b) => getEffectiveProgress(b) - getEffectiveProgress(a)).map(p => {
                const pct = getEffectiveProgress(p)
                const bobotPct = progressAnggaranTotal > 0 ? Math.round((p.total_anggaran || 0) / progressAnggaranTotal * 100) : 0
                const statusColors: Record<string, string> = { 'On Going': '#1A6FE8', 'On Hold': '#D97706', 'Selesai': '#059669', 'Perencanaan': '#660000' }
                const statusBg: Record<string, string> = { 'On Going': 'rgba(26,111,232,0.1)', 'On Hold': 'rgba(217,119,6,0.1)', 'Selesai': 'rgba(5,150,105,0.1)', 'Perencanaan': 'rgba(102,0,0,0.1)' }
                const color = statusColors[p.status] || 'var(--blue)'
                return (
                  <div key={p.id} style={{ backgroundColor: 'var(--surface-subtle)', borderRadius: 10, padding: isMobile ? '10px 12px' : '11px 14px', border: '1px solid var(--border-subtle)' }}>
                    {/* Baris atas: ID + nama + status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0 }}>{p.id}</span>
                      <span style={{ fontSize: isMobile ? 11.5 : 12.5, fontWeight: 600, color: 'var(--text-primary)', flex: 1, lineHeight: 1.3 }}>{p.nama_pekerjaan}</span>
                      <span style={{ fontSize: 9.5, fontWeight: 700, color: color, backgroundColor: statusBg[p.status], padding: '2px 7px', borderRadius: 20, flexShrink: 0 }}>{p.status}</span>
                    </div>
                    {/* Progress bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 5, borderRadius: 99, backgroundColor: 'var(--border-subtle)', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: 99, transition: 'width 0.4s ease' }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: color, minWidth: 32, textAlign: 'right' }}>{pct}%</span>
                    </div>
                    {/* Bobot anggaran */}
                    <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 5 }}>
                      Bobot anggaran: {bobotPct}% dari total
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── POPUP: Detail Pekerjaan ── */}
      {showDetail && (
        <ModalShell
          onClose={() => { setShowDetail(false); setPopupDetailId(null) }}
          maxWidth={isMobile ? 600 : 1000}
          zIndex={250}
          contentScroll={false}
          backdropColor="rgba(10,22,40,0.68)"
        >
          {close => {
            const tabCounts: Record<string, number> = {
              'On Going': displayPrograms.filter(p => p.status === 'On Going').length,
              'On Hold': displayPrograms.filter(p => p.status === 'On Hold').length,
              'Selesai': displayPrograms.filter(p => p.status === 'Selesai').length,
              'Perencanaan': displayPrograms.filter(p => p.status === 'Perencanaan').length,
            }
            const tabColors: Record<string, string> = {
              'On Going': '#1A6FE8', 'On Hold': '#D97706', 'Selesai': '#059669', 'Perencanaan': '#660000',
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
                          marginLeft: 'auto', width: 30, height: 30, borderRadius: 7,
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
                    <div style={{
                      padding: isMobile ? '18px 16px 16px' : '22px 28px 18px',
                      flexShrink: 0,
                      borderBottom: '1px solid var(--border-subtle)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <div style={{ width: 4, height: 24, borderRadius: 2, backgroundColor: tabColors[pekerjaanTab], flexShrink: 0 }} />
                            <div style={{ fontSize: isMobile ? 15 : 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                              {tabTitles[pekerjaanTab]}
                            </div>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, paddingLeft: 14 }}>
                            {tabCounts[pekerjaanTab]} pekerjaan
                          </div>
                        </div>
                        <button
                          onClick={close}
                          style={{
                            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                            border: '1px solid var(--border)', backgroundColor: 'var(--card)',
                            color: 'var(--text-muted)', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                    {/* Scrollable program list */}
                    <div style={{ overflowY: 'auto', flex: 1, overscrollBehavior: 'contain' }}>
                      <BerandaWeekOverWeek
                        programs={displayPrograms}
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
                        onProgramClick={id => {
                          const prog = programs.find(p => p.id === id)
                          if (role === 'maf' && prog?.jenis_pekerjaan === 'Operasional') {
                            setShowBlockedModal(true)
                            return
                          }
                          setPopupDetailId(id)
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
        />
      )}

      {detailProgramId && (
        <ModalShell
          onClose={() => setDetailProgramId(null)}
          maxWidth={820}
          zIndex={200}
          panelColor="var(--bg)"
          backdropColor="rgba(10,22,40,0.6)"
        >
          {close => (
            <div style={{ position: 'relative' }}>
              {!isMobile && (
                <button
                  onClick={close}
                  style={{
                    position: 'absolute', top: 14, right: 14, zIndex: 10,
                    width: 32, height: 32, borderRadius: 8,
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

      {/* Laporan Pekanan — admin only */}
      {isAdmin && (
      <div style={{ marginTop: 12 }}>
        <button
          onClick={() => setShowLaporan(v => !v)}
          style={{
            width: '100%', padding: '10px 16px',
            borderRadius: 10,
            border: showLaporan ? '1px solid rgba(26,111,232,0.25)' : '1px solid var(--border)',
            backgroundColor: showLaporan ? 'rgba(26,111,232,0.06)' : 'var(--card)',
            color: showLaporan ? 'var(--blue)' : 'var(--text-secondary)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, fontFamily: 'inherit', transition: 'all 0.15s',
          }}
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"
            style={{ transform: showLaporan ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.18s' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
          {showLaporan ? 'Sembunyikan Laporan Pekanan' : 'Tampilkan Laporan Pekanan'}
        </button>
        {showLaporan && (
          <div style={{ marginTop: 12 }}>
            <LaporanPekananCard isAdmin={isAdmin} programs={programs} />
          </div>
        )}
      </div>
      )}

      {/* Modal: Akses Dibatasi (MAF user klik Man Power) */}
      {showBlockedModal && (
        <div
          onClick={() => setShowBlockedModal(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,22,40,0.5)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ backgroundColor: 'var(--card)', borderRadius: 16, padding: '32px 28px', maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(10,22,40,0.2)' }}
          >
            <div style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(102,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="24" height="24" fill="none" stroke="#660000" strokeWidth="1.75" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.02em' }}>Akses Dibatasi</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 24 }}>Butuh akses admin untuk melihat data ini.</div>
            <button
              onClick={() => setShowBlockedModal(false)}
              style={{ backgroundColor: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Oke
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
