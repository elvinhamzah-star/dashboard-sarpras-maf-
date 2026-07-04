import { useState } from 'react'
import { Program } from '../lib/supabase'
import { formatRupiah, getTodayFormatted, getEffectiveProgress, STATUS_COLORS } from '../lib/data'
import { useWindowWidth } from '../lib/useWindowWidth'
import BerandaAlerts from './BerandaAlerts'
import MetricDetailModal, { MetricModalType } from './MetricDetailModal'

interface Props {
  programs: Program[]
  totalAnggaran: number
  totalRealisasi: number
  formattedLastUpdated: string | null
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  'On Going':    { label: 'Berjalan',      color: '#0A7BC8', bg: 'rgba(10,123,200,0.08)',  border: 'rgba(10,123,200,0.25)' },
  'Selesai':     { label: 'Selesai',       color: '#1B5E2B', bg: 'rgba(27,94,43,0.08)',    border: 'rgba(27,94,43,0.25)' },
  'On Hold':     { label: 'Ditangguhkan',  color: '#D97706', bg: 'rgba(217,119,6,0.08)',   border: 'rgba(217,119,6,0.25)' },
  'Perencanaan': { label: 'Perencanaan',   color: '#DC2626', bg: 'rgba(220,38,38,0.08)',   border: 'rgba(220,38,38,0.2)' },
}

const STATUS_TABS = [
  { key: 'On Going',    icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg> },
  { key: 'On Hold',     icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> },
  { key: 'Selesai',     icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> },
  { key: 'Perencanaan', icon: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
]

const STATUS_ORDER = ['On Going', 'Selesai', 'On Hold', 'Perencanaan']

const BULAN_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

export default function BerandaMAF({ programs, totalAnggaran, totalRealisasi, formattedLastUpdated }: Props) {
  const width = useWindowWidth()
  const isMobile = width < 600
  const [activeTab, setActiveTab] = useState('On Going')
  const [activeModal, setActiveModal] = useState<MetricModalType | null>(null)

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
      accentColor: '#1A6FE8',
      trend: `${selesai} selesai`,
      icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
    },
    {
      label: 'Selesai',
      value: selesai.toString(),
      iconBg: 'rgba(5,150,105,0.1)',
      iconColor: '#059669',
      accentColor: '#059669',
      trend: `Dari ${programs.length} program`,
      icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    },
    {
      label: 'Progress',
      value: `${progressOverall.toFixed(1)}%`,
      iconBg: 'rgba(26,111,232,0.1)',
      iconColor: 'var(--blue)',
      accentColor: '#1A6FE8',
      trend: `${onGoing} berjalan · ${onHold} ditangguhkan`,
      icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    },
  ]

  const sortedPrograms = [...programs].sort((a, b) => {
    const ai = STATUS_ORDER.indexOf(a.status || '')
    const bi = STATUS_ORDER.indexOf(b.status || '')
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  const filteredPrograms = sortedPrograms.filter(p => p.status === activeTab)

  const tabCounts: Record<string, number> = {}
  STATUS_TABS.forEach(t => {
    tabCounts[t.key] = programs.filter(p => p.status === t.key).length
  })

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
        {summaryCards.map((card, idx) => {
          const modalType: MetricModalType = idx === 0 ? 'anggaran' : idx === 1 ? 'realisasi' : 'penyerapan'
          return (
            <div
              key={card.label}
              onClick={() => setActiveModal(modalType)}
              style={{ backgroundColor: 'var(--card)', borderRadius: 12, padding: isMobile ? '12px 13px' : '18px 20px', border: '1px solid var(--border-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease', cursor: 'pointer' }}
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
                <div style={{ width: isMobile ? 28 : 36, height: isMobile ? 28 : 36, borderRadius: 8, backgroundColor: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.iconColor, flexShrink: 0 }}>
                  {card.icon}
                </div>
              </div>
              <div style={{ fontSize: isMobile ? 9.5 : 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: isMobile ? 4 : 6 }}>{card.label}</div>
              <div style={{ fontSize: isMobile ? 15 : 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: isMobile ? 3 : 6 }}>{card.value}</div>
              <div style={{ fontSize: isMobile ? 10 : 11, color: 'var(--text-muted)' }}>{card.trend}</div>
            </div>
          )
        })}
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

      {/* Status Tabs + Program List */}
      <div style={{ backgroundColor: 'var(--card)', borderRadius: 14, border: '1px solid var(--border-subtle)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>

        {/* Status Cards — same style as BerandaWeekOverWeek */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${STATUS_TABS.length}, 1fr)`,
          gap: 10,
          padding: isMobile ? '10px 12px' : '12px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--surface-subtle)',
        }}>
          {STATUS_TABS.map(tab => {
            const color = STATUS_COLORS[tab.key] || '#888'
            const isActive = activeTab === tab.key
            const count = tabCounts[tab.key]
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  textAlign: 'left',
                  backgroundColor: isActive ? `${color}10` : 'var(--card)',
                  borderRadius: isMobile ? 12 : 14,
                  padding: isMobile ? '10px 12px' : '14px 16px',
                  border: isActive ? `1.5px solid ${color}` : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.15s ease, background-color 0.15s ease, opacity 0.15s ease',
                }}
                onMouseEnter={e => {
                  if (!isActive && !isMobile) {
                    e.currentTarget.style.borderColor = `${color}55`
                    e.currentTarget.style.backgroundColor = `${color}0D`
                    e.currentTarget.style.opacity = '0.75'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive && !isMobile) {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)'
                    e.currentTarget.style.backgroundColor = 'var(--card)'
                    e.currentTarget.style.opacity = '1'
                  }
                }}
              >
                <div style={{
                  width: isMobile ? 24 : 32, height: isMobile ? 24 : 32, borderRadius: 7,
                  backgroundColor: isActive ? `${color}26` : 'rgba(0,0,0,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isActive ? color : 'var(--text-muted)', marginBottom: isMobile ? 6 : 10,
                }}>
                  {tab.icon}
                </div>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: isActive ? color : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: isMobile ? 2 : 4 }}>
                  {STATUS_CFG[tab.key]?.label ?? tab.key}
                </div>
                <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 700, color: isActive ? color : 'var(--text-secondary)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                  {count}
                </div>
                <div style={{ fontSize: 10, color: isActive ? color : 'var(--text-muted)', fontWeight: 500, marginTop: isMobile ? 2 : 4, opacity: isActive ? 0.8 : 1 }}>
                  Program
                </div>
              </button>
            )
          })}
        </div>

        {/* Program list — vertikal */}
        <div>
          {filteredPrograms.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Tidak ada program dengan status ini</div>
            </div>
          ) : (
            filteredPrograms.map((p, i) => {
              const progress = getEffectiveProgress(p)
              const cfg = STATUS_CFG[p.status || ''] ?? STATUS_CFG['Perencanaan']
              const barColor = p.status === 'Selesai' ? '#059669' : p.status === 'On Hold' ? '#D97706' : '#1A6FE8'

              const updatedAt = p.updated_at ? (() => {
                const d = new Date(p.updated_at)
                return `${d.getDate()} ${BULAN_ID[d.getMonth()]}`
              })() : null

              return (
                <div
                  key={p.id}
                  style={{
                    padding: isMobile ? '14px 14px' : '16px 20px',
                    borderBottom: i < filteredPrograms.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: isMobile ? 13 : 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.35, marginBottom: 4 }}>
                        {p.nama_pekerjaan}
                      </div>
                      {updatedAt && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Diperbarui {updatedAt}</div>
                      )}
                    </div>
                    <span style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: cfg.color,
                      backgroundColor: cfg.bg,
                      border: `1px solid ${cfg.border}`,
                      borderRadius: 6,
                      padding: '3px 9px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}>
                      {cfg.label}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, height: 5, backgroundColor: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${progress}%`, height: '100%', backgroundColor: barColor, borderRadius: 99, transition: 'width 0.4s ease' }} />
                    </div>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: barColor, minWidth: 38, textAlign: 'right', flexShrink: 0 }}>
                      {progress}%
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer count */}
        <div style={{ padding: isMobile ? '10px 14px' : '10px 20px', borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {filteredPrograms.length} program · {STATUS_CFG[activeTab]?.label}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Total {programs.length} program
          </span>
        </div>
      </div>

      {activeModal && (
        <MetricDetailModal
          type={activeModal}
          programs={programs}
          totalAnggaran={totalAnggaran}
          totalRealisasi={totalRealisasi}
          onClose={() => setActiveModal(null)}
        />
      )}

    </div>
  )
}
