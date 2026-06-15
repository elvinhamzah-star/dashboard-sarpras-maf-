import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { adminInsert, adminUpdate } from '../lib/adminApi'
import { Program } from '../lib/supabase'
import BulletInput from './BulletInput'

interface LaporanPerProgram {
  dikerjakan: string[]
  kendala: string[]
  rencana: string[]
}

interface WeeklyNote {
  id: string
  week_start: string
  week_end: string
  content: string
}

interface LaporanPekananCardProps {
  isAdmin: boolean
  programs: Program[]
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

const getWeekDates = (offset = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + offset * 7)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const start = new Date(d)
  start.setDate(diff)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

const formatWeekRange = (start: string, end: string) => {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  if (s.getMonth() === e.getMonth()) {
    return `${s.getDate()} – ${e.getDate()} ${MONTHS[e.getMonth()]} ${e.getFullYear()}`
  }
  return `${s.getDate()} ${MONTHS[s.getMonth()]} – ${e.getDate()} ${MONTHS[e.getMonth()]} ${e.getFullYear()}`
}

const empty = (): LaporanPerProgram => ({ dikerjakan: [], kendala: [], rencana: [] })

const parseContent = (content: string): { programs: Record<string, LaporanPerProgram>; pinnedPlanning: string[] } => {
  try {
    const p = JSON.parse(content)
    if (p.v === 2) return { programs: p.programs || {}, pinnedPlanning: p.pinned_planning || [] }
  } catch {}
  return { programs: {}, pinnedPlanning: [] }
}

const hasAnyData = (d: LaporanPerProgram) =>
  d.dikerjakan.some(x => x.trim()) || d.kendala.some(x => x.trim()) || d.rencana.some(x => x.trim())

const BulletList = ({ items }: { items: string[] }) => {
  const filtered = items.filter(i => i.trim())
  if (!filtered.length) return <div style={{ fontSize: 12, color: '#C8D2E0', fontStyle: 'italic' }}>Belum ada catatan</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {filtered.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#9CAABB', flexShrink: 0, marginTop: 8 }} />
          <span style={{ fontSize: 13, color: '#0F1C2E', lineHeight: 1.55 }}>{item}</span>
        </div>
      ))}
    </div>
  )
}

const Chevron = ({ open }: { open: boolean }) => (
  <svg
    width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.18s', flexShrink: 0, color: '#9CAABB' }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

const SectionDots = ({ data }: { data: LaporanPerProgram }) => (
  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
    {[
      { color: '#059669', filled: data.dikerjakan.some(x => x.trim()), title: 'Sudah dikerjakan' },
      { color: '#D97706', filled: data.kendala.some(x => x.trim()), title: 'Kendala' },
      { color: '#1A6FE8', filled: data.rencana.some(x => x.trim()), title: 'Rencana' },
    ].map((d, i) => (
      <div key={i} title={d.title} style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: d.filled ? d.color : 'rgba(15,23,42,0.1)' }} />
    ))}
  </div>
)

const FolderLink = ({ href }: { href: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    onClick={e => e.stopPropagation()}
    title="Buka folder dokumentasi"
    style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 6,
      backgroundColor: 'rgba(26,111,232,0.08)',
      color: '#1A6FE8', fontSize: 11, fontWeight: 600,
      textDecoration: 'none', flexShrink: 0,
      border: '1px solid rgba(26,111,232,0.15)',
    }}
  >
    <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
    Dokumentasi
  </a>
)

const IconPrev = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)

const IconNext = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

const SECTIONS = [
  {
    field: 'dikerjakan' as const,
    label: 'Sudah Dikerjakan',
    placeholder: 'Progres atau pencapaian pekan ini...',
    color: '#059669',
    bg: 'rgba(5,150,105,0.07)',
    icon: (
      <svg width="13" height="13" fill="none" stroke="#059669" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" /><polyline points="9 12 12 15 16 9" />
      </svg>
    ),
  },
  {
    field: 'kendala' as const,
    label: 'Kendala / Update Penting',
    placeholder: 'Kendala atau hal penting yang perlu dilaporkan...',
    color: '#D97706',
    bg: 'rgba(217,119,6,0.07)',
    icon: (
      <svg width="13" height="13" fill="none" stroke="#D97706" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    field: 'rencana' as const,
    label: 'Rencana Pekan Depan',
    placeholder: 'Target atau rencana untuk pekan berikutnya...',
    color: '#1A6FE8',
    bg: 'rgba(26,111,232,0.07)',
    icon: (
      <svg width="13" height="13" fill="none" stroke="#1A6FE8" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
]

export default function LaporanPekananCard({ isAdmin, programs }: LaporanPekananCardProps) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [note, setNote] = useState<WeeklyNote | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [perProgram, setPerProgram] = useState<Record<string, LaporanPerProgram>>({})
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set())
  const [pinnedPlanningIds, setPinnedPlanningIds] = useState<string[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const week = getWeekDates(weekOffset)
  const activePrograms = programs.filter(p => p.status === 'On Going' && p.jenis_pekerjaan !== 'Operasional')
  const planningPrograms = programs.filter(p => p.status === 'Perencanaan' && p.jenis_pekerjaan !== 'Operasional')
  const availablePlanning = planningPrograms.filter(p => !pinnedPlanningIds.includes(p.id))
  const pinnedPrograms = pinnedPlanningIds.map(id => planningPrograms.find(p => p.id === id)).filter(Boolean) as Program[]
  const displayedPlanningPrograms = isAdmin ? pinnedPrograms : planningPrograms
  const showPlanningSection = planningPrograms.length > 0

  const setField = (programId: string, field: keyof LaporanPerProgram, items: string[]) => {
    setPerProgram(prev => ({
      ...prev,
      [programId]: { ...(prev[programId] || empty()), [field]: items },
    }))
  }

  const toggleExpand = (id: string) => {
    setExpandedPrograms(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const pinProgram = (id: string) => {
    setPinnedPlanningIds(prev => [...prev, id])
    setShowDropdown(false)
    setExpandedPrograms(prev => new Set([...prev, id]))
  }

  const unpinProgram = (id: string) => {
    setPinnedPlanningIds(prev => prev.filter(x => x !== id))
    setPerProgram(prev => { const n = { ...prev }; delete n[id]; return n })
    setExpandedPrograms(prev => { const n = new Set(prev); n.delete(id); return n })
  }

  useEffect(() => {
    if (!showDropdown) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showDropdown])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('weekly_notes')
      .select('*')
      .eq('week_start', week.start)
      .maybeSingle()

    if (data) {
      setNote(data as WeeklyNote)
      const { programs: parsed, pinnedPlanning } = parseContent(data.content)
      setPerProgram(parsed)
      setPinnedPlanningIds(pinnedPlanning)
      const expanded = new Set<string>()
      Object.entries(parsed).forEach(([id, d]) => {
        if (hasAnyData(d)) expanded.add(id)
      })
      setExpandedPrograms(expanded)
    } else {
      setNote(null)
      setPerProgram({})
      setPinnedPlanningIds([])
      setExpandedPrograms(new Set())
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [weekOffset])

  const handleSave = async () => {
    setSaving(true)
    setError('')

    const cleaned: Record<string, LaporanPerProgram> = {}
    Object.entries(perProgram).forEach(([id, d]) => {
      cleaned[id] = {
        dikerjakan: d.dikerjakan.filter(x => x.trim()),
        kendala: d.kendala.filter(x => x.trim()),
        rencana: d.rencana.filter(x => x.trim()),
      }
    })

    const content = JSON.stringify({ v: 2, programs: cleaned, pinned_planning: pinnedPlanningIds })
    const payload = { week_start: week.start, week_end: week.end, content }
    const result = note
      ? await adminUpdate('weekly_notes', payload, note.id)
      : await adminInsert('weekly_notes', payload)

    if (result.error) setError(result.error.message || 'Gagal menyimpan')
    else load()
    setSaving(false)
  }

  if (loading) return null

  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: 14,
      border: '1px solid rgba(15,23,42,0.07)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 14px', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0F1C2E', letterSpacing: '-0.02em' }}>Laporan Pekanan</div>
          <div style={{ fontSize: 11, color: '#9CAABB', marginTop: 2 }}>Update progress mingguan per program</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(15,23,42,0.14)', backgroundColor: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5C6B82', flexShrink: 0, padding: 0 }}
          >
            <IconPrev />
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0F1C2E', whiteSpace: 'nowrap' }}>
              {formatWeekRange(week.start, week.end)}
            </div>
            {weekOffset < 0 && (
              <button
                onClick={() => setWeekOffset(0)}
                style={{ marginTop: 5, padding: '2px 10px', borderRadius: 20, border: 'none', backgroundColor: '#EFF4FF', color: '#1A6FE8', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                ↩ Pekan ini
              </button>
            )}
          </div>
          <button
            onClick={() => setWeekOffset(w => Math.min(0, w + 1))}
            disabled={weekOffset === 0}
            style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(15,23,42,0.14)', backgroundColor: '#fff', cursor: weekOffset === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: weekOffset === 0 ? 'rgba(15,23,42,0.2)' : '#5C6B82', flexShrink: 0, padding: 0, opacity: weekOffset === 0 ? 0.35 : 1 }}
          >
            <IconNext />
          </button>
        </div>
      </div>

      {activePrograms.length === 0 && !showPlanningSection && (
        <div style={{ padding: '32px 20px', textAlign: 'center', color: '#9CAABB', fontSize: 13 }}>
          Tidak ada pekerjaan aktif
        </div>
      )}

      {/* On Going programs */}
      {activePrograms.map((program, pIdx) => {
        const data = perProgram[program.id] || empty()
        const isExpanded = expandedPrograms.has(program.id)
        const isLast = pIdx === activePrograms.length - 1 && !showPlanningSection

        return (
          <div key={program.id} style={{ borderBottom: isLast ? 'none' : '1px solid rgba(15,23,42,0.05)' }}>
            {/* Accordion header */}
            <div
              onClick={() => toggleExpand(program.id)}
              onMouseEnter={() => setHoveredId(program.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                padding: '14px 20px 12px',
                backgroundColor: hoveredId === program.id
                  ? 'rgba(15,23,42,0.035)'
                  : isExpanded ? 'rgba(26,111,232,0.02)' : 'rgba(15,23,42,0.015)',
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'background-color 0.12s',
                borderLeft: isExpanded ? '3px solid rgba(26,111,232,0.45)' : '3px solid transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Chevron open={isExpanded} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F1C2E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
                    {program.nama_pekerjaan}
                  </div>
                  {program.vendor && (
                    <div style={{ fontSize: 11, color: '#9CAABB', marginTop: 1 }}>{program.vendor}</div>
                  )}
                </div>
                {program.link_dokumentasi && <FolderLink href={program.link_dokumentasi} />}
                <SectionDots data={data} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1A6FE8', flexShrink: 0, minWidth: 30, textAlign: 'right' }}>
                  {program.progress_percent || 0}%
                </span>
              </div>
              <div style={{ height: 6, backgroundColor: 'rgba(15,23,42,0.08)', borderRadius: 99, overflow: 'hidden', marginLeft: 21 }}>
                <div style={{ height: '100%', width: `${Math.min(100, program.progress_percent || 0)}%`, backgroundColor: '#1A6FE8', borderRadius: 99, transition: 'width 0.3s ease' }} />
              </div>
            </div>

            {/* Expanded content: mini-cards per section */}
            {isExpanded && (
              <div style={{ padding: '12px 16px 8px', backgroundColor: '#FAFBFD' }}>
                {SECTIONS.map(s => (
                  <div key={s.field} style={{ marginBottom: 10, borderRadius: 9, overflow: 'hidden', border: '1px solid rgba(15,23,42,0.07)' }}>
                    <div style={{ padding: '8px 12px', backgroundColor: s.bg, borderLeft: `3px solid ${s.color}`, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {s.icon}
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {s.label}
                      </span>
                    </div>
                    <div style={{ padding: '10px 12px', backgroundColor: '#fff', borderLeft: `3px solid ${s.color}` }}>
                      {isAdmin ? (
                        <BulletInput items={data[s.field]} onChange={items => setField(program.id, s.field, items)} placeholder={s.placeholder} />
                      ) : (
                        <BulletList items={data[s.field]} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Perencanaan section */}
      {showPlanningSection && (
        <>
          <div style={{
            padding: '14px 20px',
            backgroundColor: 'rgba(220,38,38,0.025)',
            borderTop: activePrograms.length > 0 ? '1px solid rgba(220,38,38,0.15)' : 'none',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ flex: 1, height: 1.5, backgroundColor: 'rgba(220,38,38,0.25)' }} />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>
              Perencanaan Pekan Depan
            </span>
            <div style={{ flex: 1, height: 1.5, backgroundColor: 'rgba(220,38,38,0.25)' }} />
          </div>

          {displayedPlanningPrograms.map((program, pIdx) => {
            const data = perProgram[program.id] || empty()
            const isExpanded = expandedPrograms.has(program.id)
            const isLast = pIdx === displayedPlanningPrograms.length - 1

            return (
              <div key={program.id} style={{ borderBottom: isLast && !isAdmin ? 'none' : '1px solid rgba(15,23,42,0.05)' }}>
                <div
                  onClick={() => toggleExpand(program.id)}
                  onMouseEnter={() => setHoveredId(program.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    padding: '14px 20px 12px',
                    backgroundColor: hoveredId === program.id
                      ? 'rgba(220,38,38,0.04)'
                      : isExpanded ? 'rgba(220,38,38,0.02)' : 'rgba(15,23,42,0.01)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    userSelect: 'none',
                    transition: 'background-color 0.12s',
                    borderLeft: isExpanded ? '3px solid rgba(220,38,38,0.5)' : '3px solid transparent',
                  }}
                >
                  <Chevron open={isExpanded} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0F1C2E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {program.nama_pekerjaan}
                    </div>
                  </div>
                  {program.link_dokumentasi && <FolderLink href={program.link_dokumentasi} />}
                  {isAdmin && (
                    <button
                      onClick={e => { e.stopPropagation(); unpinProgram(program.id) }}
                      title="Hapus dari daftar"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C8D2E0', fontSize: 16, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
                    >
                      ×
                    </button>
                  )}
                  <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: data.rencana.some(x => x.trim()) ? '#DC2626' : 'rgba(15,23,42,0.1)', flexShrink: 0 }} />
                </div>

                {isExpanded && (
                  <div style={{ padding: '12px 16px 8px', backgroundColor: '#FAFBFD' }}>
                    <div style={{ borderRadius: 9, overflow: 'hidden', border: '1px solid rgba(15,23,42,0.07)' }}>
                      <div style={{ padding: '8px 12px', backgroundColor: 'rgba(220,38,38,0.06)', borderLeft: '3px solid #DC2626', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <svg width="13" height="13" fill="none" stroke="#DC2626" strokeWidth="2" viewBox="0 0 24 24">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Rencana Eksekusi
                        </span>
                      </div>
                      <div style={{ padding: '10px 12px', backgroundColor: '#fff', borderLeft: '3px solid #DC2626' }}>
                        {isAdmin ? (
                          <BulletInput items={data.rencana} onChange={items => setField(program.id, 'rencana', items)} placeholder="Rencana atau target eksekusi..." />
                        ) : (
                          <BulletList items={data.rencana} />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Add planning program dropdown (admin only) */}
          {isAdmin && (
            <div style={{ padding: '10px 20px', position: 'relative' }} ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(v => !v)}
                disabled={availablePlanning.length === 0}
                style={{
                  width: '100%', padding: '8px 14px',
                  borderRadius: 8, border: '1px dashed rgba(26,43,94,0.2)',
                  backgroundColor: 'transparent', color: '#5C6B82',
                  fontSize: 12, fontWeight: 600, cursor: availablePlanning.length > 0 ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', gap: 6,
                  justifyContent: 'center', fontFamily: 'inherit',
                  opacity: availablePlanning.length === 0 ? 0.4 : 1,
                }}
              >
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                {availablePlanning.length === 0 ? 'Semua program sudah ditambahkan' : 'Tambah program perencanaan'}
              </button>

              {showDropdown && availablePlanning.length > 0 && (
                <div style={{
                  position: 'absolute', bottom: '100%', left: 20, right: 20, zIndex: 20,
                  backgroundColor: '#fff',
                  borderRadius: 10,
                  border: '1px solid rgba(15,23,42,0.1)',
                  boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
                  overflow: 'hidden',
                  maxHeight: 220,
                  overflowY: 'auto',
                  marginBottom: 4,
                }}>
                  {availablePlanning.map((p, i) => (
                    <button
                      key={p.id}
                      onClick={() => pinProgram(p.id)}
                      style={{
                        width: '100%', textAlign: 'left',
                        padding: '10px 14px',
                        border: 'none',
                        borderBottom: i < availablePlanning.length - 1 ? '1px solid rgba(15,23,42,0.05)' : 'none',
                        backgroundColor: 'transparent', color: '#0F1C2E',
                        fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                        display: 'block',
                      }}
                    >
                      {p.nama_pekerjaan}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Save button */}
      {isAdmin && (activePrograms.length > 0 || pinnedPlanningIds.length > 0) && (
        <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(15,23,42,0.06)' }}>
          {error && (
            <div style={{ marginBottom: 8, padding: 8, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)', color: '#991b1b', fontSize: 12 }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding: '8px 18px', borderRadius: 8, border: 'none', backgroundColor: '#1A6FE8', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Menyimpan...' : 'Simpan Laporan'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
