import { useEffect, useState } from 'react'
import { fetchPrograms, fetchSubPrograms, fetchTransactions, Program, SubProgram, Transaction } from '../lib/supabase'
import { STATUS_COLORS, STATUS_BG, formatRupiah } from '../lib/data'
import { deriveProgramTotals } from '../lib/deriveTotals'
import { useWindowWidth } from '../lib/useWindowWidth'
import { MOBILE_BREAKPOINT } from '../lib/breakpoint'
import { isRestrictedForRole } from '../lib/access'
import FilterSummaryBar from './FilterSummaryBar'
import AksesDibatasiModal from './AksesDibatasiModal'
import ManPowerGateModal from './ManPowerGateModal'

interface PekerjaanProps {
  isAdmin: boolean
  role?: 'pbb' | 'maf' | null
  activeStatus?: string
  onFilterChange?: (status: string) => void
  onSelectProgram: (id: string) => void
  onAddPekerjaan: () => void
  onAdminUnlock?: () => void
}

const STATUS_TABS = ['Selesai', 'On Going', 'On Hold', 'Perencanaan']

// Grid kolom desktop — dipakai sama-sama oleh header dan tiap baris biar sejajar persis.
const DESKTOP_COLS = 'minmax(0,1fr) 130px 130px 80px 110px'


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

// Inisial 1-2 huruf dari nama pekerjaan, buat avatar bulat di tiap baris —
// ambil huruf pertama dari 2 kata pertama (skip kata sambung pendek "dan"/"di"/dst).
function getInitials(nama: string): string {
  const words = (nama || '').split(/\s+/).filter(w => w.length > 2)
  const pick = words.length >= 2 ? words.slice(0, 2) : (nama || '').split(/\s+/).slice(0, 2)
  return pick.map(w => w[0]?.toUpperCase() || '').join('') || '—'
}

export default function Pekerjaan({ isAdmin, role, activeStatus: activeStatusProp = '', onFilterChange, onSelectProgram, onAddPekerjaan, onAdminUnlock }: PekerjaanProps) {
  const width = useWindowWidth()
  const isMobile = width < MOBILE_BREAKPOINT
  const isNarrow = width < 1100
  const [programs, setPrograms] = useState<Program[]>([])
  const [subPrograms, setSubPrograms] = useState<SubProgram[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
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
      const [{ data }, { data: subData }, { data: txData }] = await Promise.all([fetchPrograms(), fetchSubPrograms(), fetchTransactions()])
      if (data) setPrograms(data)
      if (subData) setSubPrograms(subData)
      if (txData) setTransactions(txData)
      setLoading(false)
    }
    load()
  }, [])

  const handleCardClick = (p: Program) => {
    if (isRestrictedForRole(p, role, isAdmin)) {
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

  const getDerived = (p: Program) =>
    deriveProgramTotals(p, subPrograms.filter(s => s.program_id === p.id), transactions)

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
      {/* Header — DESKTOP ONLY. Di mobile judul ada di top bar (App.tsx). */}
      {!isMobile && (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em' }}>
              Daftar {programs.length} Pekerjaan
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '5px 0 0' }}>
              Status &amp; progres seluruh pekerjaan Sarpras MAF
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={onAddPekerjaan}
              style={{ backgroundColor: 'var(--blue)', color: 'var(--card)', border: 'none', borderRadius: 8, padding: '7px 13px', fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, letterSpacing: '-0.01em', boxShadow: '0 1px 3px rgba(26,111,232,0.3), 0 4px 12px rgba(26,111,232,0.2)', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1560d4' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--blue)' }}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Tambah Pekerjaan
            </button>
          )}
        </div>
      )}

      <style>{`
        @media (hover: hover) {
          .pekerjaan-status-card:hover {
            background-color: var(--accent-bg) !important;
            border: 1.5px solid var(--accent) !important;
            box-shadow: 0 2px 10px var(--accent-shadow) !important;
          }
          .pekerjaan-status-card:hover .psc-icon { background-color: var(--accent-icon-bg) !important; color: var(--accent) !important; }
          .pekerjaan-status-card:hover .psc-count,
          .pekerjaan-status-card:hover .psc-label { color: var(--accent) !important; }
          .pekerjaan-row:hover {
            border-color: var(--row-accent) !important;
            background-color: var(--row-accent-bg) !important;
            box-shadow: 0 2px 10px var(--row-accent-shadow) !important;
            transform: translateY(-1px);
          }
        }
      `}</style>
      {/* Status Overview Cards — display only, no filter, always 1 row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: isMobile ? 8 : 14,
        marginBottom: isMobile ? 14 : 20,
      }}>
        {STATUS_TABS.map((tab) => {
          const color = STATUS_COLORS[tab] || '#888'
          const count = statusCounts[tab] || 0
          const isActive = activeStatus === tab
          const showColor = isActive
          return (
            <div
              key={tab}
              className="pekerjaan-status-card"
              role="button"
              tabIndex={0}
              aria-label={`Filter status ${tab}`}
              aria-pressed={isActive}
              onClick={() => setActiveStatus(prev => prev === tab ? '' : tab)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveStatus(prev => prev === tab ? '' : tab) }
              }}
              style={{
                ['--accent']: color,
                ['--accent-bg']: `${color}18`,
                ['--accent-icon-bg']: `${color}28`,
                ['--accent-shadow']: `${color}30`,
                backgroundColor: showColor ? `${color}18` : 'var(--card)',
                borderRadius: 12,
                padding: isMobile ? '10px 8px' : '14px 16px',
                border: showColor ? `1.5px solid ${color}` : '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'all 0.18s',
                boxShadow: showColor ? `0 2px 10px ${color}30` : 'none',
              } as React.CSSProperties}
            >
              {/* Icon + Count side by side */}
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10, marginBottom: isMobile ? 4 : 8 }}>
                <div className="psc-icon" style={{
                  width: isMobile ? 20 : 30, height: isMobile ? 20 : 30, borderRadius: 6,
                  backgroundColor: showColor ? `${color}28` : 'rgba(0,0,0,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: showColor ? color : 'var(--text-secondary)', flexShrink: 0,
                  transition: 'color 0.18s, background-color 0.18s',
                }}>
                  {TAB_ICONS[tab]}
                </div>
                <div className="psc-count" style={{ fontSize: isMobile ? 16 : 24, fontWeight: 700, color: showColor ? color : 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1, transition: 'color 0.18s' }}>
                  {count}
                </div>
              </div>
              {/* Label below */}
              <div className="psc-label" style={{ fontSize: isMobile ? 9 : 9.5, fontWeight: 700, color: showColor ? color : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', transition: 'color 0.18s' }}>
                {tab}
              </div>
            </div>
          )
        })}
      </div>

      {/* Filter Summary Bar — tampil untuk semua status aktif */}
      {!loading && !!activeStatus && (
        <FilterSummaryBar
          status={activeStatus}
          programs={filtered}
          subPrograms={subPrograms}
          transactions={transactions}
          isMobile={isMobile}
          role={role}
        />
      )}

      {/* Card List */}
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Memuat Data...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Tidak Ada Pekerjaan Ditemukan.</div>
      ) : (
        /* ── CARD LIST (mobile) / TABLE (desktop) ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 6 }}>
          {/* Desktop column header — kolom sejajar sama persis dengan tiap baris di bawah */}
          {!isMobile && (
            <div style={{ display: 'grid', gridTemplateColumns: DESKTOP_COLS, gap: 12, padding: '0 16px 6px', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <span>Pekerjaan</span>
              <span style={{ textAlign: 'right' }}>Anggaran</span>
              <span style={{ textAlign: 'right' }}>Realisasi</span>
              <span style={{ textAlign: 'right' }}>Progress</span>
              <span style={{ textAlign: 'right' }}>Status</span>
            </div>
          )}
          {filtered.map((p) => {
            const d = getDerived(p)
            const pct = d.progress_percent
            const color = STATUS_COLORS[p.status] || 'var(--blue)'
            const isLocked = isRestrictedForRole(p, role, isAdmin)
            const vendor = getVendorDisplay(p)
            const showBar = p.status === 'On Going' || p.status === 'On Hold'
            const lockIcon = <svg width="12" height="12" fill="none" stroke="#C8D2E0" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            const statusBadge = (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: isMobile ? '2px 8px' : '3px 10px', borderRadius: 20, fontSize: isMobile ? 9.5 : 11, fontWeight: 700, backgroundColor: STATUS_BG[p.status] || 'var(--border-subtle)', color, whiteSpace: 'nowrap' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: 'currentColor', flexShrink: 0 }} />
                {p.status}
              </span>
            )
            const avatar = (
              <div style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                {getInitials(p.nama_pekerjaan)}
              </div>
            )
            return (
              <div
                key={p.id}
                className={isLocked ? undefined : 'pekerjaan-row'}
                role="button"
                tabIndex={0}
                aria-label={isLocked ? `${p.nama_pekerjaan} — butuh akses admin` : `Lihat detail ${p.nama_pekerjaan}`}
                onClick={() => handleCardClick(p)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCardClick(p) }
                }}
                style={{
                  ['--row-accent']: color,
                  ['--row-accent-bg']: `${color}08`,
                  ['--row-accent-shadow']: `${color}22`,
                  padding: isMobile ? '13px 12px' : '12px 16px',
                  borderRadius: 10,
                  border: '1px solid var(--border-subtle)',
                  // Permanent (not hover-only) left accent — mobile has no hover to
                  // reveal "this is tappable", so the affordance needs to be visible
                  // at rest too.
                  borderLeft: isLocked ? '1px solid var(--border-subtle)' : `3px solid ${color}55`,
                  backgroundColor: 'var(--card)',
                  cursor: isLocked ? 'default' : 'pointer',
                  opacity: isLocked ? 0.7 : 1,
                  transition: 'border-color 0.18s, background-color 0.18s, box-shadow 0.18s, transform 0.18s',
                } as React.CSSProperties}
              >
                {isMobile ? (
                  <>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 3, letterSpacing: '0.02em' }}>
                      {p.id}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div title={p.nama_pekerjaan} style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.35, letterSpacing: '-0.01em' }}>
                          {p.nama_pekerjaan}
                        </div>
                      </div>
                      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                        {showBar && (
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: isLocked ? '#C8D2E0' : color, fontVariantNumeric: 'tabular-nums' }}>
                            Progres {pct}%
                          </span>
                        )}
                        {p.status === 'Selesai' && !isLocked && (
                          <div style={{ fontSize: 11, fontWeight: 700, color: d.realisasi_terkini > 0 ? '#1B5E2B' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                            {formatRupiah(d.realisasi_terkini)}
                          </div>
                        )}
                        {isLocked ? lockIcon : statusBadge}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4, letterSpacing: '0.02em' }}>
                      {p.id}
                    </span>
                    {/* Kolom sejajar dengan header di atas — gak numpuk lagi di kanan */}
                    <div style={{ display: 'grid', gridTemplateColumns: DESKTOP_COLS, gap: 12, alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        {avatar}
                        <div style={{ minWidth: 0 }}>
                          <div title={p.nama_pekerjaan} style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.nama_pekerjaan}
                          </div>
                          {vendor && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vendor}</div>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 12.5, fontWeight: 500, color: isLocked ? 'var(--text-muted)' : 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                        {isLocked ? '—' : formatRupiah(d.total_anggaran)}
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: isLocked ? 'var(--text-muted)' : (d.realisasi_terkini > 0 ? '#1B5E2B' : 'var(--text-muted)'), fontVariantNumeric: 'tabular-nums' }}>
                        {isLocked ? '—' : formatRupiah(d.realisasi_terkini)}
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: isLocked ? 'var(--text-muted)' : color, fontVariantNumeric: 'tabular-nums' }}>
                        {isLocked ? '—' : `${pct}%`}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {isLocked ? lockIcon : statusBadge}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
      {/* Mobile FAB — Tambah Pekerjaan */}
      {isAdmin && isMobile && (
        <button
          onClick={onAddPekerjaan}
          style={{ position: 'fixed', bottom: 'calc(78px + env(safe-area-inset-bottom))', right: 18, zIndex: 50, width: 46, height: 46, borderRadius: 14, border: 'none', backgroundColor: 'var(--blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 16px rgba(26,111,232,0.35)', transition: 'transform 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      )}

      {/* Modal: Akses Dibatasi */}
      {showBlockedModal && (
        onAdminUnlock
          ? <ManPowerGateModal onClose={() => setShowBlockedModal(false)} onUnlock={onAdminUnlock} />
          : <AksesDibatasiModal onClose={() => setShowBlockedModal(false)} />
      )}
    </div>
  )
}
