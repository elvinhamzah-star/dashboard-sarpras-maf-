import { useEffect, useState } from 'react'
import { fetchPrograms, Program } from '../lib/supabase'
import { formatRupiah, getTodayFormatted, STATUS_COLORS } from '../lib/data'
import LaporanPekananCard from './LaporanPekananCard'

interface BerandaProps {
  isAdmin: boolean
}

const STATUS_ORDER = ['On Going', 'Selesai', 'On Hold', 'Perencanaan']


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

export default function Beranda({ isAdmin }: BerandaProps) {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [showProgramList, setShowProgramList] = useState(false)
  const [listFilter, setListFilter] = useState('On Going')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await fetchPrograms()
      if (data) setPrograms(data)
      setLoading(false)
    }
    load()
  }, [])

  const totalAnggaran = programs.reduce((s, p) => s + (p.total_anggaran || 0), 0)
  const totalRealisasi = programs.reduce((s, p) => s + (p.realisasi_terkini || 0), 0)
  const totalSisa = programs.reduce((s, p) => s + (p.sisa_anggaran || 0), 0)
  const penyerapan = totalAnggaran > 0 ? ((totalRealisasi / totalAnggaran) * 100).toFixed(1) : '0'

  const progressPrograms = programs.filter(p => p.status !== 'Perencanaan' && p.jenis_pekerjaan !== 'Operasional')
  const progressAnggaranTotal = progressPrograms.reduce((s, p) => s + (p.total_anggaran || 0), 0)
  const progressLapangan = progressAnggaranTotal > 0
    ? (progressPrograms.reduce((s, p) => s + (p.progress_percent || 0) * (p.total_anggaran || 0), 0) / progressAnggaranTotal).toFixed(1)
    : '0'

  const statusCount: Record<string, number> = {}
  programs.forEach(p => {
    statusCount[p.status] = (statusCount[p.status] || 0) + 1
  })
  const pieData = Object.entries(statusCount).map(([name, value]) => ({ name, value }))

  const summaryCards = [
    {
      label: 'Total Anggaran',
      value: formatRupiah(totalAnggaran),
      iconType: 'anggaran',
      iconBg: 'rgba(26,111,232,0.1)',
      iconColor: '#1A6FE8',
      valueColor: '#1A6FE8',
      trend: `${programs.length} program`,
    },
    {
      label: 'Total Realisasi',
      value: formatRupiah(totalRealisasi),
      iconType: 'realisasi',
      iconBg: 'rgba(5,150,105,0.1)',
      iconColor: '#059669',
      valueColor: '#059669',
      trend: `${penyerapan}% terserap`,
    },
    {
      label: 'Sisa Anggaran',
      value: formatRupiah(totalSisa),
      iconType: 'sisa',
      iconBg: 'rgba(217,119,6,0.1)',
      iconColor: '#D97706',
      valueColor: '#D97706',
      trend: 'Belum digunakan',
    },
    {
      label: 'Penyerapan',
      value: `${penyerapan}%`,
      iconType: 'penyerapan',
      iconBg: 'rgba(26,111,232,0.1)',
      iconColor: '#1A6FE8',
      valueColor: '#0F1C2E',
      trend: 'Dari total anggaran',
    },
  ]

  if (loading) {
    return (
      <div style={{ padding: '28px 28px 40px' }}>
        {/* Skeleton header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ width: 240, height: 24, borderRadius: 8, backgroundColor: 'rgba(15,23,42,0.06)', marginBottom: 8 }} />
          <div style={{ width: 120, height: 14, borderRadius: 6, backgroundColor: 'rgba(15,23,42,0.04)' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ backgroundColor: '#fff', borderRadius: 14, padding: 20, height: 110, border: '1px solid rgba(15,23,42,0.06)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: 'rgba(15,23,42,0.05)', marginBottom: 14 }} />
              <div style={{ width: '60%', height: 11, borderRadius: 5, backgroundColor: 'rgba(15,23,42,0.05)', marginBottom: 8 }} />
              <div style={{ width: '80%', height: 20, borderRadius: 6, backgroundColor: 'rgba(15,23,42,0.05)' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '28px 28px 48px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F1C2E', margin: 0, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
            Dashboard Sarpras MAF
          </h1>
          <p style={{ color: '#5C6B82', fontSize: 13, marginTop: 5, fontWeight: 400 }}>{getTodayFormatted()}</p>
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
        {summaryCards.map(card => (
          <div
            key={card.label}
            style={{
              backgroundColor: '#fff',
              borderRadius: 14,
              padding: '18px 20px',
              border: '1px solid rgba(15,23,42,0.07)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              transition: 'box-shadow 0.18s ease, transform 0.18s ease',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLDivElement
              el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'
              el.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLDivElement
              el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'
              el.style.transform = 'translateY(0)'
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                backgroundColor: card.iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: card.iconColor,
                marginBottom: 14,
                flexShrink: 0,
              }}
            >
              <MetricIcon type={card.iconType} />
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#5C6B82', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              {card.label}
            </div>
            <div style={{ fontSize: 20, fontWeight: 750, color: card.valueColor, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 6 }}>
              {card.value}
            </div>
            <div style={{ fontSize: 11, color: '#9CAABB', fontWeight: 400 }}>{card.trend}</div>
          </div>
        ))}
      </div>

      {/* Status Pekerjaan */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: 14,
            border: '1px solid rgba(15,23,42,0.07)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0F1C2E', letterSpacing: '-0.02em' }}>Progress Pekerjaan</span>
            <div style={{ fontSize: 12, color: '#9CAABB', marginTop: 3 }}>{programs.length} program total</div>
          </div>

          {pieData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CAABB', fontSize: 13 }}>Belum ada data program.</div>
          ) : (
            <>
              {/* Two bordered sections side by side */}
              <div style={{ display: 'flex', gap: 12, padding: '18px 16px 16px' }}>
                {/* Left: Progress Lapangan */}
                <div style={{
                  flex: 35,
                  borderRadius: 11,
                  border: '1px solid rgba(124,58,237,0.2)',
                  borderTop: '3px solid #7C3AED',
                  padding: '20px 18px 22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                    Progress Lapangan
                  </div>
                  <div style={{ fontSize: 36, fontWeight: 700, color: '#7C3AED', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 10 }}>
                    {progressLapangan}%
                  </div>
                  <div style={{ fontSize: 11.5, color: '#9CAABB' }}>
                    rata-rata {progressPrograms.length} program aktif
                  </div>
                </div>

                {/* Right: Horizontal status bars */}
                <div style={{
                  flex: 65,
                  borderRadius: 11,
                  border: '1px solid rgba(26,111,232,0.18)',
                  borderTop: '3px solid #1A6FE8',
                  padding: '16px 18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: 12,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#1A6FE8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                    Status Program
                  </div>
                  {STATUS_ORDER.map(statusName => {
                    const count = statusCount[statusName] || 0
                    const pct = programs.length > 0 ? (count / programs.length) * 100 : 0
                    const color = STATUS_COLORS[statusName] || '#9CAABB'
                    return (
                      <div key={statusName}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
                            <span style={{ fontSize: 11.5, color: '#5C6B82', fontWeight: 500 }}>{statusName}</span>
                          </div>
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#0F1C2E' }}>{count}</span>
                        </div>
                        <div style={{ height: 5, backgroundColor: 'rgba(15,23,42,0.07)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${pct}%`,
                            backgroundColor: color,
                            borderRadius: 99,
                          }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* Toggle button */}
          <div style={{ padding: '0 16px 14px' }}>
            <button
              onClick={() => setShowProgramList(v => !v)}
              style={{
                width: '100%', padding: '7px 14px',
                borderRadius: 8,
                border: showProgramList ? '1px solid rgba(26,111,232,0.25)' : '1px solid rgba(15,23,42,0.1)',
                backgroundColor: showProgramList ? 'rgba(26,111,232,0.06)' : '#fff',
                color: showProgramList ? '#1A6FE8' : '#5C6B82',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 6, fontFamily: 'inherit', transition: 'all 0.15s',
              }}
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"
                style={{ transform: showProgramList ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.18s' }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
              {showProgramList ? 'Sembunyikan' : 'Tampilkan Pekerjaan'}
            </button>
          </div>

          {/* Collapsible program list */}
          {showProgramList && (
            <div style={{ borderTop: '1px solid rgba(15,23,42,0.06)' }}>
              {/* Filter tabs */}
              <div style={{ padding: '10px 16px 8px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {pieData.map(d => {
                  const isActive = listFilter === d.name
                  const color = STATUS_COLORS[d.name] || '#5C6B82'
                  return (
                    <button
                      key={d.name}
                      onClick={() => setListFilter(d.name)}
                      style={{
                        padding: '4px 12px', borderRadius: 20, border: 'none',
                        cursor: 'pointer', fontSize: 11.5, fontWeight: 600,
                        backgroundColor: isActive ? color : 'rgba(15,23,42,0.06)',
                        color: isActive ? '#fff' : '#5C6B82',
                        transition: 'all 0.13s', fontFamily: 'inherit',
                      }}
                    >
                      {d.name} · {d.value}
                    </button>
                  )
                })}
              </div>

              {/* List */}
              <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {programs.filter(p => p.status === listFilter).map(p => (
                  <div
                    key={p.id}
                    style={{
                      padding: '11px 14px', borderRadius: 10,
                      backgroundColor: '#fff',
                      border: '1px solid rgba(15,23,42,0.13)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0F1C2E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.nama_pekerjaan}
                        </div>
                        {p.vendor && (
                          <div style={{ fontSize: 11, color: '#9CAABB', marginTop: 1 }}>{p.vendor}</div>
                        )}
                      </div>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: STATUS_COLORS[p.status] || '#1A6FE8', flexShrink: 0 }}>
                        {p.progress_percent || 0}%
                      </span>
                    </div>
                    <div style={{ height: 4, backgroundColor: 'rgba(15,23,42,0.07)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(100, p.progress_percent || 0)}%`,
                        backgroundColor: STATUS_COLORS[p.status] || '#1A6FE8',
                        borderRadius: 99,
                      }} />
                    </div>
                  </div>
                ))}
                {programs.filter(p => p.status === listFilter).length === 0 && (
                  <div style={{ textAlign: 'center', padding: '16px 0', color: '#9CAABB', fontSize: 12 }}>
                    Tidak ada program dengan status ini.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Laporan Pekanan */}
      <LaporanPekananCard isAdmin={isAdmin} programs={programs} />

    </div>
  )
}
