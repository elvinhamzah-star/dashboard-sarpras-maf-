import { useState } from 'react'
import { Program, ProgramSnapshot, SubProgram } from '../lib/supabase'
import { STATUS_COLORS, formatRupiah, getEffectiveProgress } from '../lib/data'
import { useWindowWidth } from '../lib/useWindowWidth'
import { MOBILE_BREAKPOINT } from '../lib/breakpoint'
import { isRestrictedForRole } from '../lib/access'

const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

function formatTanggal(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`
}

interface Props {
  programs: Program[]
  snapshots: ProgramSnapshot[]
  subPrograms: SubProgram[]
  rencanaMap: Record<string, string[]>
  progressLapangan: string | null
  freshnessDays: number | null
  lastUpdated: string
  onProgramClick?: (id: string) => void
  hideHeader?: boolean
  externalTab?: string
  onExternalTabChange?: (tab: string) => void
  /** Spacious mode: lebih banyak padding & gap untuk tampilan dalam popup lebar */
  spacious?: boolean
  role?: 'pbb' | 'maf' | null
  isAdmin?: boolean
}

const TABS = ['On Going', 'On Hold', 'Selesai', 'Perencanaan']
const TABS_MAF = ['Selesai', 'On Going', 'On Hold', 'Perencanaan']

const TAB_ICONS: Record<string, JSX.Element> = {
  'On Going': (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  'On Hold': (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
    </svg>
  ),
  'Selesai': (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  'Perencanaan': (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
}

function getVendorDisplay(program: Program, subPrograms: SubProgram[]): string {
  const subs = subPrograms.filter(s => s.program_id === program.id)
  if (subs.length === 0) return program.vendor || ''
  const uniqueVendors = [...new Set(subs.map(s => s.vendor).filter(v => v && v.trim()))]
  if (uniqueVendors.length === 0) return program.vendor || ''
  return uniqueVendors.join(' · ')
}

export default function BerandaWeekOverWeek({ programs, snapshots, subPrograms, rencanaMap, progressLapangan, freshnessDays, lastUpdated, onProgramClick, hideHeader, externalTab, onExternalTabChange, spacious, role, isAdmin }: Props) {
  const isMaf = role === 'maf'
  const [internalTab, setInternalTab] = useState(isMaf ? 'Selesai' : 'On Going')
  const activeTab = externalTab ?? internalTab
  const setActiveTab = (tab: string) => {
    setInternalTab(tab)
    onExternalTabChange?.(tab)
  }
  const width = useWindowWidth()
  const isNarrow = width < 1100
  // Program name in the list: bump up on desktop; mobile (<768, matches App) stays 11.5.
  const nameSize = width < MOBILE_BREAKPOINT ? 11.5 : 13.5
  // Rencana/Catatan bullet lists are capped per-row so one program with many
  // notes doesn't blow out that row's height and break scan rhythm down the
  // list — expand on demand instead. Keyed by program id; a program only
  // ever shows one of the two lists at a time (branch is per-tab), so one
  // shared set covers both.
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())
  const NOTES_CAP = 3

  const now = Date.now()
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000

  const wowMap: Record<string, { delta: number | null; prev: number | null }> = {}
  programs
    .filter(p => p.status === 'On Going' && p.jenis_pekerjaan !== 'Operasional')
    .forEach(p => {
      const programSnaps = snapshots
        .filter(s => s.program_id === p.id)
        .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))

      if (programSnaps.length < 2) {
        wowMap[p.id] = { delta: null, prev: null }
        return
      }

      const latest = programSnaps[programSnaps.length - 1]
      const weekAgoTarget = now - oneWeekMs
      const weekAgoSnap = programSnaps.reduce((closest, s) => {
        const diff = Math.abs(new Date(s.snapshot_date).getTime() - weekAgoTarget)
        const closestDiff = Math.abs(new Date(closest.snapshot_date).getTime() - weekAgoTarget)
        return diff < closestDiff ? s : closest
      })

      if (weekAgoSnap.snapshot_date === latest.snapshot_date) {
        wowMap[p.id] = { delta: null, prev: null }
        return
      }

      const current = latest.progress_percent ?? p.progress_percent ?? 0
      const prev = weekAgoSnap.progress_percent ?? 0
      wowMap[p.id] = { delta: current - prev, prev }
    })

  // Man Power tampil di list untuk semua user — click diblokir via onProgramClick.
  const visiblePrograms = programs

  const countByStatus: Record<string, number> = {}
  visiblePrograms.forEach(p => {
    countByStatus[p.status] = (countByStatus[p.status] || 0) + 1
  })

  const filteredPrograms = visiblePrograms
    .filter(p => p.status === activeTab)
    .sort((a, b) => {
      if (activeTab === 'Perencanaan') {
        const aHas = (rencanaMap[a.id] || []).length > 0 ? 0 : 1
        const bHas = (rencanaMap[b.id] || []).length > 0 ? 0 : 1
        return aHas - bHas
      }
      return 0
    })

  const freshnessColor = freshnessDays === null
    ? 'var(--text-muted)'
    : freshnessDays === 0
      ? '#1B5E2B'
      : freshnessDays <= 3
        ? '#D97706'
        : 'var(--color-danger)'

  return (
    <>
      {!hideHeader && (
      <div style={{
        display: 'grid',
        gridTemplateColumns: isNarrow ? 'repeat(2, 1fr)' : 'minmax(150px, 1.15fr) repeat(4, minmax(110px, 1fr))',
        gap: 10,
        marginBottom: 14,
      }}>
        {progressLapangan && (() => {
          const progColor = isMaf ? '#1A6FE8' : '#7C3AED'
          const progBorder = isMaf ? 'rgba(26,111,232,0.25)' : 'rgba(124,58,237,0.25)'
          const progIconBg = isMaf ? 'rgba(26,111,232,0.1)' : 'rgba(124,58,237,0.1)'
          return (
          <div style={{
            backgroundColor: 'var(--card)',
            borderRadius: 14,
            padding: isNarrow ? '10px 14px' : '14px 16px',
            border: isNarrow ? '1px solid var(--border)' : `1.5px solid ${progBorder}`,
            gridColumn: isNarrow ? '1 / -1' : 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: 0,
          }}>
            {/* Icon + angka berdampingan — sama untuk mobile dan desktop */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isNarrow ? 8 : 10, marginBottom: isNarrow ? 2 : 4 }}>
              <div style={{
                width: isNarrow ? 22 : 28, height: isNarrow ? 22 : 28, borderRadius: 7,
                backgroundColor: progIconBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: progColor, flexShrink: 0,
              }}>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" /><polyline points="9 12 11 14 15 10" />
                </svg>
              </div>
              <div style={{ fontSize: isNarrow ? 15 : 20, fontWeight: 700, color: progColor, letterSpacing: '-0.03em', lineHeight: 1 }}>
                {progressLapangan}%
              </div>
            </div>
            <div style={{ fontSize: isNarrow ? 9 : 9.5, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: isNarrow ? 1 : 2 }}>
              Progress Pekerjaan
            </div>
            <div style={{ fontSize: isNarrow ? 9 : 10, color: 'var(--text-muted)', fontWeight: 500 }}>
              Dari {visiblePrograms.length} Pekerjaan
            </div>
          </div>
          )
        })()}

        {(isMaf ? TABS_MAF : TABS).map(tab => {
          const isActive = activeTab === tab
          const color = STATUS_COLORS[tab] || '#888'
          const count = countByStatus[tab] || 0
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                textAlign: 'center',
                backgroundColor: isActive ? `${color}10` : 'var(--card)',
                borderRadius: isNarrow ? 12 : 14,
                padding: isNarrow ? '10px 12px' : '14px 16px',
                border: isActive ? `1.5px solid ${color}` : '1px solid var(--border)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.borderColor = `${color}55`
                  el.style.backgroundColor = `${color}0D`
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.borderColor = 'var(--border)'
                  el.style.backgroundColor = 'var(--card)'
                }
              }}
            >
              {/* Baris atas: icon + angka berdampingan */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isNarrow ? 6 : 8, marginBottom: isNarrow ? 4 : 5 }}>
                <div style={{
                  width: isNarrow ? 20 : 26, height: isNarrow ? 20 : 26, borderRadius: 6,
                  backgroundColor: isActive ? `${color}26` : 'rgba(0,0,0,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isActive ? color : 'var(--text-muted)', flexShrink: 0,
                }}>
                  {TAB_ICONS[tab]}
                </div>
                <div style={{ fontSize: isNarrow ? 15 : 20, fontWeight: 700, color: isActive ? color : 'var(--text-secondary)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {count}
                </div>
              </div>
              {/* Label status */}
              <div style={{ fontSize: isNarrow ? 9 : 10, fontWeight: 700, color: isActive ? color : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: isNarrow ? 1 : 2 }}>
                {tab}
              </div>
              {/* Sub */}
              <div style={{ fontSize: isNarrow ? 9 : 10, color: isActive ? color : 'var(--text-muted)', fontWeight: 400, opacity: isActive ? 0.8 : 1 }}>
                Pekerjaan
              </div>
            </button>
          )
        })}
      </div>
      )}

      <div style={{
        backgroundColor: 'transparent',
        borderRadius: 0,
        border: 'none',
        boxShadow: 'none',
        padding: spacious ? '0 28px 24px' : '0 0 4px',
        display: 'flex',
        flexDirection: 'column',
        gap: spacious ? 10 : 8,
        marginBottom: spacious ? 0 : 20,
      }}>
        {filteredPrograms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: 12 }}>
            Tidak Ada Pekerjaan Dengan Status Ini.
          </div>
        ) : activeTab === 'Selesai' ? (
          filteredPrograms.map((p) => {
            const sisa = p.sisa_anggaran ?? (p.total_anggaran ?? 0) - (p.realisasi_terkini ?? 0)
            const isEfficient = sisa > 0
            const isOver = sisa < 0
            return (
              <div
                key={p.id}
                role={onProgramClick ? 'button' : undefined}
                tabIndex={onProgramClick ? 0 : undefined}
                aria-label={onProgramClick ? `Lihat detail ${p.nama_pekerjaan}` : undefined}
                onClick={() => onProgramClick?.(p.id)}
                onKeyDown={onProgramClick ? (e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onProgramClick(p.id) } }) : undefined}
                onMouseEnter={e => { if (onProgramClick) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(27,94,43,0.07)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--card)' }}
                style={{
                  padding: spacious ? '14px 16px' : '10px 12px',
                  borderRadius: 10,
                  border: '1.5px solid var(--border-subtle)',
                  // Permanent (not hover-only) accent so the row reads as tappable
                  // at rest on mobile too, where hover never fires.
                  ...(onProgramClick ? { borderLeft: '3px solid #1B5E2B55' } : {}),
                  backgroundColor: 'var(--card)',
                  cursor: onProgramClick ? 'pointer' : 'default',
                  transition: 'background-color 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div title={p.nama_pekerjaan} style={{
                      fontSize: nameSize, fontWeight: 600, color: 'var(--text-primary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {p.nama_pekerjaan}
                    </div>
                    {getVendorDisplay(p, subPrograms) && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{getVendorDisplay(p, subPrograms)}</div>
                    )}
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatRupiah(p.realisasi_terkini ?? 0)}
                    </div>
                    <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 1 }}>
                      dari {formatRupiah(p.total_anggaran ?? 0)}
                    </div>
                  </div>
                </div>
                {(isEfficient || isOver) && (
                  <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                    {isEfficient && (
                      <span style={{
                        fontSize: 9.5, fontWeight: 600, flexShrink: 0,
                        color: '#1B5E2B',
                        backgroundColor: 'rgba(27,94,43,0.1)',
                        padding: '2px 7px', borderRadius: 99,
                      }}>
                        Efisiensi {formatRupiah(sisa)}
                      </span>
                    )}
                    {isOver && (
                      <span style={{
                        fontSize: 9.5, fontWeight: 600, flexShrink: 0,
                        color: 'var(--color-danger)',
                        backgroundColor: 'rgba(220,38,38,0.08)',
                        padding: '2px 7px', borderRadius: 99,
                      }}>
                        Lebih {formatRupiah(Math.abs(sisa))}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })
        ) : activeTab === 'Perencanaan' ? (
          filteredPrograms.map((p) => {
            const rencana = rencanaMap[p.id] || []
            const hoverColor = rencana.length > 0 ? 'rgba(220,38,38,0.06)' : 'rgba(0,0,0,0.04)'
            return (
              <div
                key={p.id}
                role={onProgramClick ? 'button' : undefined}
                tabIndex={onProgramClick ? 0 : undefined}
                aria-label={onProgramClick ? `Lihat detail ${p.nama_pekerjaan}` : undefined}
                onClick={() => onProgramClick?.(p.id)}
                onKeyDown={onProgramClick ? (e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onProgramClick(p.id) } }) : undefined}
                onMouseEnter={e => { if (onProgramClick) (e.currentTarget as HTMLDivElement).style.backgroundColor = hoverColor }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--card)' }}
                style={{
                  padding: spacious ? '14px 16px' : '10px 12px',
                  borderRadius: 10,
                  border: '1.5px solid var(--border-subtle)',
                  ...(onProgramClick ? { borderLeft: '3px solid rgba(51,65,85,0.45)' } : {}),
                  backgroundColor: 'var(--card)',
                  cursor: onProgramClick ? 'pointer' : 'default',
                  transition: 'background-color 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div title={p.nama_pekerjaan} style={{
                      fontSize: nameSize, fontWeight: 600, color: 'var(--text-primary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {p.nama_pekerjaan}
                    </div>
                    {getVendorDisplay(p, subPrograms) && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{getVendorDisplay(p, subPrograms)}</div>
                    )}
                  </div>
                </div>
                {rencana.length > 0 && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                      <svg width="10" height="10" fill="none" stroke="var(--color-neutral-dark)" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-neutral-dark)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rencana</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingLeft: 4 }}>
                      {(expandedNotes.has(p.id) ? rencana : rencana.slice(0, NOTES_CAP)).map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 1, flexShrink: 0 }}>•</span>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item}</span>
                        </div>
                      ))}
                      {!expandedNotes.has(p.id) && rencana.length > NOTES_CAP && (
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setExpandedNotes(prev => new Set(prev).add(p.id)) }}
                          style={{ alignSelf: 'flex-start', background: 'none', border: 'none', padding: '1px 0 0 12px', color: 'var(--color-neutral-dark)', fontSize: 10.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
                        >
                          +{rencana.length - NOTES_CAP} lainnya
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        ) : (
          filteredPrograms.map((p) => {
            const color = STATUS_COLORS[p.status] || '#1A6FE8'
            const effectivePct = getEffectiveProgress(p)
            const realisasi = p.realisasi_terkini ?? 0
            const anggaran = p.total_anggaran ?? 0
            const sisa = p.sisa_anggaran ?? (anggaran - realisasi)
            const isOver = sisa < 0
            return (
              <div
                key={p.id}
                role={onProgramClick ? 'button' : undefined}
                tabIndex={onProgramClick ? 0 : undefined}
                aria-label={onProgramClick ? `Lihat detail ${p.nama_pekerjaan}` : undefined}
                onClick={() => onProgramClick?.(p.id)}
                onKeyDown={onProgramClick ? (e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onProgramClick(p.id) } }) : undefined}
                onMouseEnter={e => { if (onProgramClick) (e.currentTarget as HTMLDivElement).style.backgroundColor = `${color}0D` }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--card)' }}
                style={{
                  padding: spacious ? '14px 16px' : '10px 12px',
                  borderRadius: 10,
                  border: '1.5px solid var(--border-subtle)',
                  ...(onProgramClick ? { borderLeft: `3px solid ${color}55` } : {}),
                  backgroundColor: 'var(--card)',
                  cursor: onProgramClick ? 'pointer' : 'default',
                  transition: 'background-color 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* nama + progress badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div title={p.nama_pekerjaan} style={{
                        fontSize: nameSize, fontWeight: 600, color: 'var(--text-primary)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
                      }}>
                        {p.nama_pekerjaan}
                      </div>
                      <span style={{
                        flexShrink: 0, fontSize: 9.5, fontWeight: 700,
                        padding: '2px 7px', borderRadius: 99,
                        color, backgroundColor: `${color}1F`,
                        whiteSpace: 'nowrap',
                      }}>
                        {effectivePct}%
                      </span>
                    </div>
                    {getVendorDisplay(p, subPrograms) && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{getVendorDisplay(p, subPrograms)}</div>
                    )}
                    {p.isu_utama && (
                      <div style={{ marginTop: 16 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-neutral-dark)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Catatan</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4, paddingLeft: 4 }}>
                          {(() => {
                            const lines = p.isu_utama.split('\n').filter(l => l.trim())
                            const shown = expandedNotes.has(p.id) ? lines : lines.slice(0, NOTES_CAP)
                            return (
                              <>
                                {shown.map((line, idx) => (
                                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 1, flexShrink: 0 }}>•</span>
                                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{line}</span>
                                  </div>
                                ))}
                                {!expandedNotes.has(p.id) && lines.length > NOTES_CAP && (
                                  <button
                                    type="button"
                                    onClick={e => { e.stopPropagation(); setExpandedNotes(prev => new Set(prev).add(p.id)) }}
                                    style={{ alignSelf: 'flex-start', background: 'none', border: 'none', padding: '1px 0 0 12px', color: 'var(--color-neutral-dark)', fontSize: 10.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
                                  >
                                    +{lines.length - NOTES_CAP} lainnya
                                  </button>
                                )}
                              </>
                            )
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatRupiah(realisasi)}
                    </div>
                    <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 1 }}>
                      dari {formatRupiah(anggaran)}
                    </div>
                    <span style={{
                      fontSize: 9.5, fontWeight: 600,
                      color: isOver ? 'var(--color-danger)' : color,
                      backgroundColor: isOver ? 'rgba(220,38,38,0.08)' : `${color}1A`,
                      padding: '2px 7px', borderRadius: 99,
                      display: 'inline-block', marginTop: 6,
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {isOver ? `Lebih ${formatRupiah(Math.abs(sisa))}` : `Sisa ${formatRupiah(sisa)}`}
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </>
  )
}
