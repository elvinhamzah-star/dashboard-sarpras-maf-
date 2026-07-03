import { useState } from 'react'
import { Program } from '../lib/supabase'
import { formatRupiah, getTodayFormatted, getEffectiveProgress } from '../lib/data'
import { useWindowWidth } from '../lib/useWindowWidth'
import BerandaAlerts from './BerandaAlerts'

interface Props {
  programs: Program[]
  totalAnggaran: number
  totalRealisasi: number
  formattedLastUpdated: string | null
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  'On Going':    { label: 'Berjalan',    color: '#1A6FE8', bg: 'rgba(26,111,232,0.1)',  dot: '#1A6FE8' },
  'Selesai':     { label: 'Selesai',     color: '#059669', bg: 'rgba(5,150,105,0.1)',   dot: '#059669' },
  'On Hold':     { label: 'Tertunda',    color: '#D97706', bg: 'rgba(217,119,6,0.1)',   dot: '#D97706' },
  'Perencanaan': { label: 'Perencanaan', color: '#6B7280', bg: 'rgba(107,114,128,0.1)', dot: '#9CA3AF' },
}

const FILTERS = [
  { key: 'Semua',      status: null },
  { key: 'Berjalan',   status: 'On Going' },
  { key: 'Selesai',    status: 'Selesai' },
  { key: 'Tertunda',   status: 'On Hold' },
  { key: 'Perencanaan',status: 'Perencanaan' },
]

const STATUS_ORDER = ['On Going', 'Selesai', 'On Hold', 'Perencanaan']

export default function BerandaMAF({ programs, totalAnggaran, totalRealisasi, formattedLastUpdated }: Props) {
  const width = useWindowWidth()
  const isMobile = width < 600
  const [activeFilter, setActiveFilter] = useState('Semua')

  const penyerapan = totalAnggaran > 0 ? (totalRealisasi / totalAnggaran) * 100 : 0
  const selesai = programs.filter(p => p.status === 'Selesai').length
  const onGoing = programs.filter(p => p.status === 'On Going').length
  const onHold  = programs.filter(p => p.status === 'On Hold').length

  const progressPrograms = programs.filter(p => p.status !== 'Perencanaan')
  const progressAnggaranTotal = progressPrograms.reduce((s, p) => s + (p.total_anggaran || 0), 0)
  const progressOverall = progressAnggaranTotal > 0
    ? progressPrograms.reduce((s, p) => s + getEffectiveProgress(p) * (p.total_anggaran || 0), 0) / progressAnggaranTotal
    : 0

  const summaryCards = [
    {
      label: 'Total Program',
      value: programs.length.toString(),
      iconBg: 'rgba(26,111,232,0.1)',
      iconColor: 'var(--blue)',
      trend: `${selesai} selesai`,
      icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
    },
    {
      label: 'Selesai',
      value: selesai.toString(),
      iconBg: 'rgba(5,150,105,0.1)',
      iconColor: '#059669',
      trend: `Dari ${programs.length} program`,
      icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    },
    {
      label: 'Progress',
      value: `${progressOverall.toFixed(1)}%`,
      iconBg: 'rgba(26,111,232,0.1)',
      iconColor: 'var(--blue)',
      trend: `${onGoing} berjalan · ${onHold} tertunda`,
      icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    },
  ]

  const sortedPrograms = [...programs].sort((a, b) => {
    const ai = STATUS_ORDER.indexOf(a.status || '')
    const bi = STATUS_ORDER.indexOf(b.status || '')
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  const activeStatus = FILTERS.find(f => f.key === activeFilter)?.status ?? null
  const filteredPrograms = activeStatus
    ? sortedPrograms.filter(p => p.status === activeStatus)
    : sortedPrograms

  return (
    <div style={{ padding: isMobile ? '16px 14px 48px' : '28px 28px 48px' }}>

      {/* Header */}
      {isMobile ? (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <h1 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
              Dashboard Sarpras MAF
            </h1>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, flexShrink: 0, marginLeft: 8, marginTop: 2 }}>
              {getTodayFormatted()}
            </span>
          </div>
          {formattedLastUpdated && (
            <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 10, color: 'rgba(185,28,28,.6)', fontWeight: 500, border: '0.5px solid rgba(220,38,38,.22)', borderRadius: 5, padding: '2px 7px', background: 'rgba(220,38,38,.055)', marginTop: 5 }}>
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
                <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11, color: 'rgba(185,28,28,.6)', fontWeight: 500, border: '0.5px solid rgba(220,38,38,.22)', borderRadius: 5, padding: '2px 8px', background: 'rgba(220,38,38,.055)' }}>
                  Diperbarui {formattedLastUpdated}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <BerandaAlerts programs={programs} />

      {/* 3 Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isMobile ? 10 : 14, marginBottom: 20 }}>
        {summaryCards.map(card => (
          <div
            key={card.label}
            style={{ backgroundColor: 'var(--card)', borderRadius: 12, padding: isMobile ? '12px 13px' : '18px 20px', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'box-shadow 0.18s ease, transform 0.18s ease' }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}
          >
            <div style={{ width: isMobile ? 28 : 36, height: isMobile ? 28 : 36, borderRadius: 8, backgroundColor: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.iconColor, marginBottom: isMobile ? 8 : 14 }}>
              {card.icon}
            </div>
            <div style={{ fontSize: isMobile ? 9.5 : 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: isMobile ? 4 : 6 }}>
              {card.label}
            </div>
            <div style={{ fontSize: isMobile ? 15 : 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: isMobile ? 3 : 6 }}>
              {card.value}
            </div>
            <div style={{ fontSize: isMobile ? 10 : 11, color: 'var(--text-muted)' }}>{card.trend}</div>
          </div>
        ))}
      </div>

      {/* Anggaran Program PBB */}
      <div style={{ backgroundColor: 'var(--card)', borderRadius: 14, border: '1px solid var(--border-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: isMobile ? '12px 14px' : '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Anggaran Program PBB</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Keseluruhan program</div>
        </div>
        <div style={{ padding: isMobile ? '14px 14px' : '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Total Anggaran</div>
              <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{formatRupiah(totalAnggaran)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Terserap</div>
              <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 700, color: '#059669' }}>{penyerapan.toFixed(1)}%</div>
            </div>
          </div>
          <div style={{ height: 6, backgroundColor: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden', marginBottom: 10 }}>
            <div style={{ width: `${Math.min(penyerapan, 100)}%`, height: '100%', backgroundColor: '#1A6FE8', borderRadius: 99 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobile ? 11 : 12 }}>
            <span style={{ color: 'var(--text-muted)' }}>
              Digunakan: <span style={{ color: '#059669', fontWeight: 600 }}>{formatRupiah(totalRealisasi)}</span>
            </span>
            <span style={{ color: 'var(--text-muted)' }}>
              Sisa: <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{formatRupiah(totalAnggaran - totalRealisasi)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Status per Program — dengan filter + grid */}
      <div style={{ backgroundColor: 'var(--card)', borderRadius: 14, border: '1px solid var(--border-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden', marginBottom: 20 }}>

        {/* Header + filter */}
        <div style={{ padding: isMobile ? '12px 14px 0' : '14px 20px 0', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Status per Program</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {filteredPrograms.length} dari {programs.length}
            </div>
          </div>

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12, scrollbarWidth: 'none' }}>
            {FILTERS.map(f => {
              const count = f.status
                ? programs.filter(p => p.status === f.status).length
                : programs.length
              const isActive = activeFilter === f.key
              const cfg = f.status ? STATUS_CFG[f.status] : null
              return (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 20,
                    border: isActive
                      ? `1.5px solid ${cfg?.color ?? 'var(--blue)'}`
                      : '1px solid var(--border-subtle)',
                    backgroundColor: isActive
                      ? (cfg?.bg ?? 'rgba(26,111,232,0.1)')
                      : 'var(--card)',
                    color: isActive ? (cfg?.color ?? '#1A6FE8') : 'var(--text-secondary)',
                    fontSize: 11.5,
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    transition: 'all 0.15s',
                  }}
                >
                  {cfg && (
                    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: cfg.dot, display: 'inline-block', flexShrink: 0 }} />
                  )}
                  {f.key}
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    backgroundColor: isActive ? (cfg?.color ?? '#1A6FE8') : 'var(--border-subtle)',
                    color: isActive ? '#fff' : 'var(--text-muted)',
                    borderRadius: 10,
                    padding: '1px 5px',
                    minWidth: 18,
                    textAlign: 'center',
                    lineHeight: 1.6,
                  }}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Grid cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
          gap: 1,
          backgroundColor: 'var(--border-subtle)',
        }}>
          {filteredPrograms.length === 0 ? (
            <div style={{ gridColumn: '1/-1', padding: '32px 20px', textAlign: 'center', backgroundColor: 'var(--card)' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Tidak ada program dengan status ini</div>
            </div>
          ) : (
            filteredPrograms.map(p => {
              const progress = getEffectiveProgress(p)
              const st = STATUS_CFG[p.status || ''] ?? { label: p.status || '-', color: '#6B7280', bg: 'rgba(107,114,128,0.1)', dot: '#9CA3AF' }
              const barColor = p.status === 'Selesai' ? '#059669' : p.status === 'On Hold' ? '#D97706' : '#1A6FE8'
              return (
                <div
                  key={p.id}
                  style={{
                    backgroundColor: 'var(--card)',
                    padding: isMobile ? '14px 14px' : '16px 20px',
                  }}
                >
                  {/* Status badge + nama */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                    <div style={{ fontSize: isMobile ? 12.5 : 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.35, flex: 1 }}>
                      {p.nama_pekerjaan}
                    </div>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: st.color,
                      backgroundColor: st.bg,
                      borderRadius: 6,
                      padding: '3px 8px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}>
                      {st.label}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 5, backgroundColor: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${progress}%`, height: '100%', backgroundColor: barColor, borderRadius: 99, transition: 'width 0.4s ease' }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: barColor, minWidth: 36, textAlign: 'right' }}>
                      {progress}%
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

    </div>
  )
}
