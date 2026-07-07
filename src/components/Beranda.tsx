import { useEffect, useState } from 'react'
import { fetchPrograms, fetchTransactions, fetchSnapshots, fetchSubPrograms, fetchWeeklyNotes, Program, ProgramSnapshot, Transaction, SubProgram } from '../lib/supabase'
import { formatRupiah, getTodayFormatted } from '../lib/data'
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

const SectionDivider = ({ isMobile }: { label: string; isMobile: boolean }) => (
  <div style={{ height: isMobile ? 12 : 20 }} />
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
  const [filterMonth, setFilterMonth] = useState<string | null>(null) // format: 'YYYY-MM'
  const [showLaporan, setShowLaporan] = useState(false)
  const [activeModal, setActiveModal] = useState<MetricModalType | null>(null)
  const [detailProgramId, setDetailProgramId] = useState<string | null>(null)

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

  // Bulan yang tersedia dari data transaksi (format YYYY-MM, urut ascending)
  const availableMonths = [...new Set(
    rawTransactions.map(t => t.tanggal?.slice(0, 7)).filter(Boolean) as string[]
  )].sort()

  // Filter transaksi berdasarkan bulan
  const filteredTransactions = filterMonth
    ? rawTransactions.filter(t => t.tanggal?.startsWith(filterMonth))
    : rawTransactions

  // Filter program: aktif di bulan yang dipilih
  const filteredPrograms = filterMonth
    ? programs.filter(p => {
        if (!p.tanggal_mulai) return true
        const mulai = p.tanggal_mulai.slice(0, 7) // YYYY-MM
        const selesai = p.tanggal_selesai ? p.tanggal_selesai.slice(0, 7) : '9999-12'
        return mulai <= filterMonth && selesai >= filterMonth
      })
    : programs

  const displayPrograms = role === 'maf' ? filteredPrograms.filter(p => p.jenis_pekerjaan !== 'Operasional') : filteredPrograms

  const totalAnggaran = filteredPrograms.reduce((s, p) => s + (p.total_anggaran || 0), 0)
  const totalRealisasi = filteredTransactions
    .filter(t => t.jenis_transaksi === 'Keluar' || t.jenis_transaksi === 'Keluar PBB')
    .reduce((s, t) => s + (t.nominal || 0), 0)
  const totalSisa = totalAnggaran - totalRealisasi
  const penyerapan = totalAnggaran > 0 ? ((totalRealisasi / totalAnggaran) * 100).toFixed(1) : '0'

  const progressPrograms = filteredPrograms.filter(p => p.status !== 'Perencanaan' && p.jenis_pekerjaan !== 'Operasional')
  const progressAnggaranTotal = progressPrograms.reduce((s, p) => s + (p.total_anggaran || 0), 0)
  const progressLapangan = progressAnggaranTotal > 0
    ? (progressPrograms.reduce((s, p) => s + (p.progress_percent || 0) * (p.total_anggaran || 0), 0) / progressAnggaranTotal).toFixed(1)
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
      iconBg: 'rgba(26,111,232,0.1)',
      iconColor: 'var(--blue)',
      valueColor: 'var(--text-primary)',
      trend: `${displayPrograms.length} Pekerjaan`,
      accentColor: '#1A6FE8',
    },
    {
      label: 'Total Realisasi',
      value: formatRupiah(totalRealisasi),
      iconType: 'realisasi',
      iconBg: 'rgba(5,150,105,0.1)',
      iconColor: '#059669',
      valueColor: 'var(--text-primary)',
      trend: `${penyerapan}% Terserap`,
      accentColor: '#059669',
    },
    {
      label: 'Sisa Anggaran',
      value: formatRupiah(totalSisa),
      iconType: 'sisa',
      iconBg: 'rgba(217,119,6,0.1)',
      iconColor: '#D97706',
      valueColor: 'var(--text-primary)',
      trend: 'Belum Digunakan',
      accentColor: '#D97706',
    },
    {
      label: 'Penyerapan',
      value: `${penyerapan}%`,
      iconType: 'penyerapan',
      iconBg: 'rgba(26,111,232,0.1)',
      iconColor: 'var(--blue)',
      valueColor: 'var(--text-primary)',
      trend: 'Dari Total Anggaran',
      accentColor: '#1A6FE8',
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
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: 10,
              color: 'rgba(185,28,28,.6)',
              fontWeight: 500,
              border: '0.5px solid rgba(220,38,38,.22)',
              borderRadius: 5,
              padding: '2px 7px',
              background: 'rgba(220,38,38,.055)',
              marginTop: 5,
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
              <span style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 400 }}>
                {getTodayFormatted()}
              </span>
              {formattedLastUpdated && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontSize: 11,
                  color: 'rgba(185,28,28,.6)',
                  fontWeight: 500,
                  border: '0.5px solid rgba(220,38,38,.22)',
                  borderRadius: 5,
                  padding: '2px 8px',
                  background: 'rgba(220,38,38,.055)',
                }}>
                  Diperbarui {formattedLastUpdated}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter Bulan */}
      {availableMonths.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {[null, ...availableMonths].map(ym => {
            const label = ym
              ? `${BULAN_ID[parseInt(ym.slice(5, 7)) - 1].slice(0, 3)} '${ym.slice(2, 4)}`
              : 'Semua'
            const active = filterMonth === ym
            return (
              <button
                key={ym ?? 'all'}
                onClick={() => setFilterMonth(ym)}
                style={{
                  padding: isMobile ? '4px 11px' : '5px 13px',
                  borderRadius: 20,
                  border: active ? 'none' : '1px solid var(--border)',
                  backgroundColor: active ? 'var(--blue)' : 'var(--card)',
                  color: active ? '#fff' : 'var(--text-muted)',
                  fontSize: isMobile ? 11.5 : 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      {/* ── KEUANGAN ── */}
      <SectionDivider label="Keuangan" isMobile={isMobile} />

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: isMobile ? 10 : 14, marginBottom: 20 }}>
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
            <div style={{ marginBottom: isMobile ? 8 : 14 }}>
              <div
                style={{
                  width: isMobile ? 28 : 36,
                  height: isMobile ? 28 : 36,
                  borderRadius: 8,
                  backgroundColor: card.iconBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: card.iconColor,
                  flexShrink: 0,
                }}
              >
                <MetricIcon type={card.iconType} />
              </div>
            </div>
            <div style={{ fontSize: isMobile ? 9.5 : 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: isMobile ? 4 : 6 }}>
              {card.label}
            </div>
            <div style={{ fontSize: isMobile ? 15 : 20, fontWeight: 700, color: card.valueColor, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: isMobile ? 3 : 6, wordBreak: 'break-word' }}>
              {card.value}
            </div>
            <div style={{ fontSize: isMobile ? 10 : 11, color: 'var(--text-muted)', fontWeight: 400 }}>{card.trend}</div>
          </div>
        ))}
      </div>

      <BerandaChart transactions={filteredTransactions} />

      {/* ── PEKERJAAN ── */}
      <SectionDivider label="Pekerjaan" isMobile={isMobile} />

      {/* Over-budget alert — masuk Pekerjaan karena perlu tindakan per program */}
      <BerandaAlerts programs={displayPrograms} showOverdue={false} />

      <BerandaWeekOverWeek
        programs={displayPrograms}
        snapshots={snapshots}
        subPrograms={subPrograms}
        rencanaMap={rencanaMap}
        progressLapangan={progressLapangan}
        freshnessDays={freshnessDays}
        lastUpdated={mostRecentUpdate}
        onProgramClick={id => {
          if (role === 'maf' && id === 'P-024') return
          setDetailProgramId(id)
        }}
      />

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
      <div>
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

    </div>
  )
}
