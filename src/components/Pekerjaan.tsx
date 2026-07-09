import { useEffect, useState } from 'react'
import { fetchPrograms, fetchSubPrograms, Program, SubProgram } from '../lib/supabase'
import { STATUS_COLORS, STATUS_BG, formatRupiah, getEffectiveProgress } from '../lib/data'
import { useWindowWidth } from '../lib/useWindowWidth'

interface PekerjaanProps {
  isAdmin: boolean
  role?: 'pbb' | 'maf' | null
  activeStatus?: string
  onFilterChange?: (status: string) => void
  onSelectProgram: (id: string) => void
  onAddPekerjaan: () => void
}

const STATUS_TABS = ['Selesai', 'On Going', 'On Hold', 'Perencanaan']


const TAB_ICONS: Record<string, JSX.Element> = {
  'On Going': (
    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  'On Hold': (
    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
    </svg>
  ),
  'Selesai': (
    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  'Perencanaan': (
    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
}

export default function Pekerjaan({ isAdmin, role, activeStatus: activeStatusProp = '', onFilterChange, onSelectProgram, onAddPekerjaan }: PekerjaanProps) {
  const width = useWindowWidth()
  const isMobile = width < 600
  const isNarrow = width < 1100
  const [programs, setPrograms] = useState<Program[]>([])
  const [subPrograms, setSubPrograms] = useState<SubProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [showBlockedModal, setShowBlockedModal] = useState(false)

  const activeStatus = activeStatusProp
  const setActiveStatus = (val: string | ((prev: string) => string)) => {
    const next = typeof val === 'function' ? val(activeStatusProp) : val
    onFilterChange?.(next)
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [{ data }, { data: subData }] = await Promise.all([fetchPrograms(), fetchSubPrograms()])
      if (data) setPrograms(data)
      if (subData) setSubPrograms(subData)
      setLoading(false)
    }
    load()
  }, [])

  const handleCardClick = (p: Program) => {
    if (role === 'maf' && p.jenis_pekerjaan === 'Operasional') {
      setShowBlockedModal(true)
      return
    }
    onSelectProgram(p.id)
  }

  const getVendorDisplay = (p: Program): string => {
    const subs = subPrograms.filter(s => s.program_id === p.id)
    if (subs.length === 0) return p.vendor || ''
    const unique = [...new Set(subs.map(s => s.vendor).filter(v => v && v.trim()))]
    if (unique.length === 0) return p.vendor || ''
    return unique.join(' · ')
  }

  // Filter by status (if active), then sort by ID
  const filtered = programs
    .filter(p => activeStatus === '' || p.status === activeStatus)
    .sort((a, b) => a.id.localeCompare(b.id))

  const statusCounts: Record<string, number> = {}
  programs.forEach(p => {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1
  })

  return (
    <div style={{ padding: isMobile ? '16px 14px 48px' : '28px 28px 48px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: isMobile ? 14 : 24 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em' }}>
            Daftar {programs.length} Pekerjaan
          </h1>
        </div>
        {isAdmin && (
          <button
            onClick={onAddPekerjaan}
            style={{
              backgroundColor: 'var(--blue)',
              color: 'var(--card)',
              border: 'none',
              borderRadius: 10,
              padding: '9px 18px',
              fontWeight: 600,
              fontSize: 13.5,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              letterSpacing: '-0.01em',
              boxShadow: '0 1px 3px rgba(26,111,232,0.3), 0 4px 12px rgba(26,111,232,0.2)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1560d4'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--blue)'
            }}
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Tambah Pekerjaan
          </button>
        )}
      </div>

      {/* Status Overview Cards — display only, no filter, always 1 row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: isMobile ? 8 : 14,
        marginBottom: isMobile ? 14 : 20,
      }}>
        {STATUS_TABS.map(tab => {
          const color = STATUS_COLORS[tab] || '#888'
          const count = statusCounts[tab] || 0
          const isActive = activeStatus === tab
          return (
            <div
              key={tab}
              onClick={() => setActiveStatus(prev => prev === tab ? '' : tab)}
              style={{
                backgroundColor: isActive ? `${color}0F` : 'var(--card)',
                borderRadius: 12,
                padding: isMobile ? '10px 8px' : '14px 16px',
                border: isActive ? `1.5px solid ${color}` : '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s',
                boxShadow: isActive ? `0 2px 8px ${color}30` : 'none',
              }}
            >
              {/* Icon + Count side by side */}
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10, marginBottom: isMobile ? 4 : 8 }}>
                <div style={{
                  width: isMobile ? 20 : 30, height: isMobile ? 20 : 30, borderRadius: 6,
                  backgroundColor: isActive ? `${color}30` : `${color}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: color, flexShrink: 0,
                }}>
                  {TAB_ICONS[tab]}
                </div>
                <div style={{ fontSize: isMobile ? 16 : 24, fontWeight: 700, color: color, letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {count}
                </div>
              </div>
              {/* Label below */}
              <div style={{ fontSize: isMobile ? 7 : 9.5, fontWeight: 700, color: isActive ? color : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                {tab}
              </div>
            </div>
          )
        })}
      </div>

      {/* Card List */}
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Memuat Data...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Tidak Ada Pekerjaan Ditemukan.</div>
      ) : (
        /* ── CARD LIST: style selaras dengan BerandaWeekOverWeek ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 8 : 10 }}>
          {filtered.map((p) => {
            const pct = getEffectiveProgress(p)
            const color = STATUS_COLORS[p.status] || 'var(--blue)'
            const isLocked = role === 'maf' && p.jenis_pekerjaan === 'Operasional'
            const vendor = getVendorDisplay(p)
            return (
              <div
                key={p.id}
                onClick={() => handleCardClick(p)}
                onMouseEnter={e => { if (!isLocked) (e.currentTarget as HTMLDivElement).style.backgroundColor = `${color}0D` }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--card)' }}
                style={{
                  padding: isMobile ? '10px 12px' : '14px 16px',
                  borderRadius: 10,
                  border: '1.5px solid var(--border-subtle)',
                  borderLeft: `3px solid ${isLocked ? '#C8D2E0' : color}`,
                  backgroundColor: 'var(--card)',
                  cursor: isLocked ? 'default' : 'pointer',
                  opacity: isLocked ? 0.7 : 1,
                  transition: 'background-color 0.15s',
                }}
              >
                {isMobile ? (
                  /* ── MOBILE: nama + status (baris 1), progress bar (baris 2) ── */
                  <>
                    {/* Baris 1: nama + status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden' }}>
                        {p.isu_utama && <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#D97706', flexShrink: 0 }} />}
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
                          {p.nama_pekerjaan}
                        </div>
                      </div>
                      {isLocked
                        ? <svg width="12" height="12" fill="none" stroke="#C8D2E0" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                        : <span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 20, fontSize: 9, fontWeight: 700, backgroundColor: STATUS_BG[p.status] || 'var(--border-subtle)', color, flexShrink: 0 }}>{p.status}</span>
                      }
                    </div>
                    {/* Baris 2: progress bar + % */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ flex: 1, height: 3, backgroundColor: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: isLocked ? '#C8D2E0' : color, borderRadius: 99, transition: 'width 0.3s ease' }} />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: isLocked ? 'var(--text-muted)' : color, minWidth: 28, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
                    </div>
                  </>
                ) : (
                  /* ── DESKTOP: layout lengkap ── */
                  <>
                    {/* Baris 1: nama + realisasi */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden' }}>
                          {p.isu_utama && <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#D97706', flexShrink: 0 }} />}
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
                            {p.nama_pekerjaan}
                          </div>
                        </div>
                        {vendor && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{vendor}</div>}
                      </div>
                      <div style={{ flexShrink: 0, textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: (p.realisasi_terkini || 0) > 0 ? '#059669' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                          {formatRupiah(p.realisasi_terkini || 0)}
                        </div>
                        <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 1, fontVariantNumeric: 'tabular-nums' }}>
                          dari {formatRupiah(p.total_anggaran || 0)}
                        </div>
                      </div>
                    </div>
                    {/* Baris 2: progress bar + pct + status badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 4, backgroundColor: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: isLocked ? '#C8D2E0' : color, borderRadius: 99, transition: 'width 0.3s ease' }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: isLocked ? 'var(--text-muted)' : color, minWidth: 30, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
                      {isLocked
                        ? <svg width="12" height="12" fill="none" stroke="#C8D2E0" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                        : <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, backgroundColor: STATUS_BG[p.status] || 'var(--border-subtle)', color, flexShrink: 0 }}>{p.status}</span>
                      }
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
      {/* Modal: Akses Dibatasi */}
      {showBlockedModal && (
        <div
          onClick={() => setShowBlockedModal(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(10,22,40,0.5)', backdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
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
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.02em' }}>
              Akses Dibatasi
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 24 }}>
              Butuh akses admin untuk melihat data ini.
            </div>
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
