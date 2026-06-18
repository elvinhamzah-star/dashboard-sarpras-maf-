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

interface ProgramMeta {
  name: string
  vendor?: string | null
  category: 'ongoing' | 'onhold' | 'planning'
  link?: string | null
}

interface DisplayProgram {
  id: string
  nama_pekerjaan: string
  vendor?: string | null
  link_dokumentasi?: string | null
  progress_percent?: number | null
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

const parseContent = (content: string): {
  programs: Record<string, LaporanPerProgram>
  pinnedPlanning: string[]
  programMeta: Record<string, ProgramMeta>
} => {
  try {
    const p = JSON.parse(content)
    if (p.v === 2) return { programs: p.programs || {}, pinnedPlanning: p.pinned_planning || [], programMeta: {} }
    if (p.v === 3) return { programs: p.programs || {}, pinnedPlanning: p.pinned_planning || [], programMeta: p.program_meta || {} }
  } catch {}
  return { programs: {}, pinnedPlanning: [], programMeta: {} }
}

const hasAnyData = (d: LaporanPerProgram) =>
  d.dikerjakan.some(x => x.trim()) || d.kendala.some(x => x.trim()) || d.rencana.some(x => x.trim())

const BulletList = ({ items }: { items: string[] }) => {
  const filtered = items.filter(i => i.trim())
  if (!filtered.length) return <div style={{ fontSize: 12, color: '#C8D2E0', fontStyle: 'italic' }}>Belum ada catatan</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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

const FolderLink = ({ href }: { href: string }) => (
  <a
    href={href} target="_blank" rel="noopener noreferrer"
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
    Dok
  </a>
)

const SECTIONS = [
  {
    field: 'dikerjakan' as const,
    label: 'Sudah Dikerjakan',
    placeholder: 'Progres atau pencapaian pekan ini...',
    color: '#059669',
    bg: 'rgba(5,150,105,0.07)',
  },
  {
    field: 'kendala' as const,
    label: 'Kendala / Update Penting',
    placeholder: 'Kendala atau hal penting yang perlu dilaporkan...',
    color: '#D97706',
    bg: 'rgba(217,119,6,0.07)',
  },
  {
    field: 'rencana' as const,
    label: 'Rencana Pekan Depan',
    placeholder: 'Target atau rencana untuk pekan berikutnya...',
    color: '#1A6FE8',
    bg: 'rgba(26,111,232,0.07)',
  },
]

// ─── Shared program row renderer ────────────────────────────────────────────

interface ProgramRowProps {
  program: DisplayProgram
  data: LaporanPerProgram
  sectionColor: string
  isExpanded: boolean
  isLast: boolean
  isAdmin: boolean
  canEdit: boolean // false for past-week read-only
  onToggle: () => void
  onFieldChange?: (field: keyof LaporanPerProgram, items: string[]) => void
  extraActions?: React.ReactNode
}

function ProgramRow({
  program, data, sectionColor, isExpanded, isLast,
  isAdmin, canEdit, onToggle, onFieldChange, extraActions,
}: ProgramRowProps) {
  const [hovered, setHovered] = useState(false)
  const progress = program.progress_percent ?? 0

  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid rgba(15,23,42,0.05)' }}>
      {/* Accordion header */}
      <div
        onClick={onToggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          padding: '12px 18px 10px',
          backgroundColor: hovered
            ? 'rgba(15,23,42,0.03)'
            : isExpanded ? `rgba(${sectionColor === '#1A6FE8' ? '26,111,232' : sectionColor === '#D97706' ? '217,119,6' : '185,28,28'},0.02)` : 'transparent',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'background-color 0.12s',
          borderLeft: `3px solid ${isExpanded ? sectionColor : 'transparent'}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Chevron open={isExpanded} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F1C2E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
              {program.nama_pekerjaan}
            </div>
            {program.vendor && (
              <div style={{ fontSize: 10.5, color: '#9CAABB', marginTop: 1 }}>{program.vendor}</div>
            )}
          </div>
          {program.link_dokumentasi && <FolderLink href={program.link_dokumentasi} />}
          {extraActions}
          <span style={{ fontSize: 12.5, fontWeight: 700, color: sectionColor, flexShrink: 0, minWidth: 34, textAlign: 'right' }}>
            {progress}%
          </span>
        </div>
        {/* Mini progress bar */}
        <div style={{ marginTop: 8, marginLeft: 21, marginRight: 0, height: 3, backgroundColor: 'rgba(15,23,42,0.07)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(100, progress)}%`, backgroundColor: sectionColor, borderRadius: 99, opacity: 0.75 }} />
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div style={{ backgroundColor: '#FAFBFD', borderTop: '1px solid rgba(15,23,42,0.04)' }}>
          {SECTIONS.map((s, idx) => (
            <div key={s.field} style={{ borderTop: idx > 0 ? '1px solid rgba(15,23,42,0.05)' : 'none' }}>
              <div style={{ padding: '9px 18px 7px', backgroundColor: s.bg, display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 3, height: 12, borderRadius: 2, backgroundColor: s.color, flexShrink: 0 }} />
                <span style={{ fontSize: 10.5, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {s.label}
                </span>
                {s.field === 'dikerjakan' && (
                  <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#059669' }}>{progress}%</span>
                )}
              </div>
              <div style={{ padding: '10px 18px 12px' }}>
                {canEdit && onFieldChange ? (
                  <BulletInput items={data[s.field]} onChange={items => onFieldChange(s.field, items)} placeholder={s.placeholder} />
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
}

// ─── Planning-only row (single "rencana" section) ────────────────────────────

interface PlanningRowProps {
  program: DisplayProgram
  data: LaporanPerProgram
  isExpanded: boolean
  isLast: boolean
  isAdmin: boolean
  canEdit: boolean
  onToggle: () => void
  onFieldChange?: (field: keyof LaporanPerProgram, items: string[]) => void
  onUnpin?: () => void
}

function PlanningRow({ program, data, isExpanded, isLast, isAdmin, canEdit, onToggle, onFieldChange, onUnpin }: PlanningRowProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid rgba(15,23,42,0.05)' }}>
      <div
        onClick={onToggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          padding: '12px 18px 10px',
          backgroundColor: hovered ? 'rgba(185,28,28,0.04)' : isExpanded ? 'rgba(185,28,28,0.02)' : 'transparent',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
          userSelect: 'none', transition: 'background-color 0.12s',
          borderLeft: `3px solid ${isExpanded ? '#B91C1C' : 'transparent'}`,
        }}
      >
        <Chevron open={isExpanded} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0F1C2E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {program.nama_pekerjaan}
          </div>
        </div>
        {program.link_dokumentasi && <FolderLink href={program.link_dokumentasi} />}
        {isAdmin && canEdit && onUnpin && (
          <button
            onClick={e => { e.stopPropagation(); onUnpin() }}
            title="Hapus dari daftar"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C8D2E0', fontSize: 16, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
          >
            ×
          </button>
        )}
        <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: data.rencana.some(x => x.trim()) ? '#B91C1C' : 'rgba(15,23,42,0.1)', flexShrink: 0 }} />
      </div>

      {isExpanded && (
        <div style={{ backgroundColor: '#FAFBFD', borderTop: '1px solid rgba(15,23,42,0.04)' }}>
          <div style={{ padding: '9px 18px 7px', backgroundColor: 'rgba(185,28,28,0.06)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 3, height: 12, borderRadius: 2, backgroundColor: '#B91C1C', flexShrink: 0 }} />
            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#B91C1C', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Rencana Eksekusi
            </span>
          </div>
          <div style={{ padding: '10px 18px 12px' }}>
            {canEdit && onFieldChange ? (
              <BulletInput items={data.rencana} onChange={items => onFieldChange('rencana', items)} placeholder="Rencana atau target eksekusi..." />
            ) : (
              <BulletList items={data.rencana} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Section divider header ────────────────────────────────────────────────

function SectionHeader({ label, count, color, bg }: { label: string; count: number; color: string; bg: string }) {
  return (
    <div style={{
      padding: '10px 18px',
      backgroundColor: bg,
      borderLeft: `4px solid ${color}`,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: '#0F1C2E', textTransform: 'uppercase', letterSpacing: '0.07em', flex: 1 }}>
        {label}
      </span>
      <span style={{ fontSize: 10.5, fontWeight: 700, color, backgroundColor: `rgba(${color === '#1A6FE8' ? '26,111,232' : color === '#D97706' ? '217,119,6' : '185,28,28'},0.12)`, padding: '2px 8px', borderRadius: 12 }}>
        {count}
      </span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LaporanPekananCard({ isAdmin, programs }: LaporanPekananCardProps) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [note, setNote] = useState<WeeklyNote | null>(null)
  const [loading, setLoading] = useState(true)
  const [weekLoading, setWeekLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [perProgram, setPerProgram] = useState<Record<string, LaporanPerProgram>>({})
  const [programMeta, setProgramMeta] = useState<Record<string, ProgramMeta>>({})
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set())
  const [pinnedPlanningIds, setPinnedPlanningIds] = useState<string[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const mountedRef = useRef(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const week = getWeekDates(weekOffset)
  const isPastWeek = weekOffset < 0

  // Current-week live program lists
  const activePrograms = programs.filter(p => p.status === 'On Going' && p.jenis_pekerjaan !== 'Operasional')
  const onHoldPrograms = programs.filter(p => p.status === 'On Hold' && p.jenis_pekerjaan !== 'Operasional')
  const planningPrograms = programs.filter(p => p.status === 'Perencanaan' && p.jenis_pekerjaan !== 'Operasional')
  const availablePlanning = planningPrograms.filter(p => !pinnedPlanningIds.includes(p.id))
  const pinnedPrograms = pinnedPlanningIds.map(id => planningPrograms.find(p => p.id === id)).filter(Boolean) as Program[]
  const displayedPlanningPrograms = isAdmin
    ? pinnedPrograms
    : planningPrograms.filter(p => { const d = perProgram[p.id]; return d && d.rencana.some(x => x.trim()) })

  // Past-week historical program lists (from saved meta + perProgram)
  const buildHistorical = (category: 'ongoing' | 'onhold' | 'planning'): DisplayProgram[] => {
    if (!isPastWeek) return []
    return Object.entries(perProgram)
      .filter(([id, data]) => {
        if (!hasAnyData(data)) return false
        const meta = programMeta[id]
        if (meta) return meta.category === category
        // v2 fallback: guess from live status
        const live = programs.find(p => p.id === id)
        if (!live) return category === 'ongoing'
        const s = live.status
        if (category === 'ongoing') return s === 'On Going' || s === 'Selesai'
        if (category === 'onhold') return s === 'On Hold'
        return s === 'Perencanaan'
      })
      .map(([id]) => {
        const meta = programMeta[id]
        const live = programs.find(p => p.id === id)
        return {
          id,
          nama_pekerjaan: meta?.name || live?.nama_pekerjaan || '[Program Tidak Ditemukan]',
          vendor: meta?.vendor !== undefined ? meta.vendor : live?.vendor,
          link_dokumentasi: meta?.link !== undefined ? meta.link : live?.link_dokumentasi,
          progress_percent: live?.progress_percent ?? null,
        }
      })
  }

  const histOngoing = buildHistorical('ongoing')
  const histOnhold = buildHistorical('onhold')
  const histPlanning = buildHistorical('planning')

  const setField = (programId: string, field: keyof LaporanPerProgram, items: string[]) => {
    setPerProgram(prev => ({ ...prev, [programId]: { ...(prev[programId] || empty()), [field]: items } }))
  }

  const toggleExpand = (id: string) => {
    setExpandedPrograms(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
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
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showDropdown])

  const load = async () => {
    if (!mountedRef.current) setLoading(true)
    else setWeekLoading(true)

    const { data } = await supabase
      .from('weekly_notes').select('*').eq('week_start', week.start).maybeSingle()

    if (data) {
      setNote(data as WeeklyNote)
      const { programs: parsed, pinnedPlanning, programMeta: meta } = parseContent(data.content)
      setPerProgram(parsed)
      setPinnedPlanningIds(pinnedPlanning)
      setProgramMeta(meta)
    } else {
      setNote(null)
      setPerProgram({})
      setPinnedPlanningIds([])
      setProgramMeta({})
    }
    setExpandedPrograms(new Set())
    mountedRef.current = true
    setLoading(false)
    setWeekLoading(false)
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

    // Build program meta for v3 format
    const meta: Record<string, ProgramMeta> = {}
    activePrograms.forEach(p => {
      meta[p.id] = { name: p.nama_pekerjaan, vendor: p.vendor, category: 'ongoing', link: p.link_dokumentasi }
    })
    onHoldPrograms.forEach(p => {
      meta[p.id] = { name: p.nama_pekerjaan, vendor: p.vendor, category: 'onhold', link: p.link_dokumentasi }
    })
    pinnedPrograms.forEach(p => {
      meta[p.id] = { name: p.nama_pekerjaan, vendor: p.vendor, category: 'planning', link: p.link_dokumentasi }
    })

    const content = JSON.stringify({ v: 3, programs: cleaned, pinned_planning: pinnedPlanningIds, program_meta: meta })
    const payload = { week_start: week.start, week_end: week.end, content }
    const result = note
      ? await adminUpdate('weekly_notes', payload, note.id)
      : await adminInsert('weekly_notes', payload)

    if (result.error) setError(result.error.message || 'Gagal menyimpan')
    else load()
    setSaving(false)
  }

  if (loading) return null

  const showCurrentWeekSave = !isPastWeek && isAdmin && (activePrograms.length > 0 || onHoldPrograms.length > 0 || pinnedPlanningIds.length > 0)
  const showPlanningSection = isPastWeek ? histPlanning.length > 0 : displayedPlanningPrograms.length > 0

  const histTotal = histOngoing.length + histOnhold.length + histPlanning.length
  const emptyPastWeek = isPastWeek && !note

  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: 14,
      border: '1px solid rgba(15,23,42,0.07)',
      boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 18px 14px', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F1C2E', letterSpacing: '-0.02em' }}>Laporan Pekanan</div>
            <div style={{ fontSize: 11, color: '#9CAABB', marginTop: 2 }}>Update progress mingguan per program</div>
          </div>
          {isPastWeek && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 20,
              backgroundColor: 'rgba(124,58,237,0.08)', color: '#7C3AED',
              fontSize: 10.5, fontWeight: 700,
            }}>
              <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M12 8v4l3 3"/><path d="M3.05 11a9 9 0 1 0 .5-4"/>
              </svg>
              Riwayat
            </div>
          )}
        </div>

        {/* Week navigator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid rgba(15,23,42,0.12)', backgroundColor: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5C6B82', padding: 0 }}
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div style={{ textAlign: 'center', opacity: weekLoading ? 0.45 : 1, transition: 'opacity 0.15s', minWidth: 160 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0F1C2E', whiteSpace: 'nowrap' }}>
              {formatWeekRange(week.start, week.end)}
            </div>
          </div>
          <button
            onClick={() => setWeekOffset(w => Math.min(0, w + 1))}
            disabled={weekOffset === 0}
            style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid rgba(15,23,42,0.12)', backgroundColor: '#fff', cursor: weekOffset === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: weekOffset === 0 ? 'rgba(15,23,42,0.2)' : '#5C6B82', padding: 0, opacity: weekOffset === 0 ? 0.35 : 1 }}
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
      </div>

      {/* Past week: no data */}
      {emptyPastWeek && (
        <div style={{ padding: '32px 20px', textAlign: 'center', color: '#9CAABB', fontSize: 13 }}>
          Belum ada laporan disimpan untuk minggu ini
        </div>
      )}

      {/* Past week: has data */}
      {isPastWeek && note && histTotal === 0 && (
        <div style={{ padding: '32px 20px', textAlign: 'center', color: '#9CAABB', fontSize: 13 }}>
          Laporan minggu ini belum memiliki catatan program
        </div>
      )}

      {/* ── PAST WEEK: READ-ONLY historical view ─────────────────────────── */}
      {isPastWeek && note && histTotal > 0 && (
        <>
          {histOngoing.length > 0 && (
            <>
              <SectionHeader label="Pekerjaan Berjalan" count={histOngoing.length} color="#1A6FE8" bg="rgba(26,111,232,0.05)" />
              {histOngoing.map((prog, idx) => (
                <ProgramRow
                  key={prog.id}
                  program={prog}
                  data={perProgram[prog.id] || empty()}
                  sectionColor="#1A6FE8"
                  isExpanded={expandedPrograms.has(prog.id)}
                  isLast={idx === histOngoing.length - 1 && histOnhold.length === 0 && histPlanning.length === 0}
                  isAdmin={false}
                  canEdit={false}
                  onToggle={() => toggleExpand(prog.id)}
                />
              ))}
            </>
          )}

          {histOnhold.length > 0 && (
            <>
              <SectionHeader label="On Hold" count={histOnhold.length} color="#D97706" bg="rgba(217,119,6,0.05)" />
              {histOnhold.map((prog, idx) => (
                <ProgramRow
                  key={prog.id}
                  program={prog}
                  data={perProgram[prog.id] || empty()}
                  sectionColor="#D97706"
                  isExpanded={expandedPrograms.has(prog.id)}
                  isLast={idx === histOnhold.length - 1 && histPlanning.length === 0}
                  isAdmin={false}
                  canEdit={false}
                  onToggle={() => toggleExpand(prog.id)}
                />
              ))}
            </>
          )}

          {histPlanning.length > 0 && (
            <>
              <SectionHeader label="Perencanaan" count={histPlanning.length} color="#B91C1C" bg="rgba(185,28,28,0.05)" />
              {histPlanning.map((prog, idx) => (
                <PlanningRow
                  key={prog.id}
                  program={prog}
                  data={perProgram[prog.id] || empty()}
                  isExpanded={expandedPrograms.has(prog.id)}
                  isLast={idx === histPlanning.length - 1}
                  isAdmin={false}
                  canEdit={false}
                  onToggle={() => toggleExpand(prog.id)}
                />
              ))}
            </>
          )}
        </>
      )}

      {/* ── CURRENT WEEK: editable view ────────────────────────────────────── */}
      {!isPastWeek && (
        <>
          {activePrograms.length === 0 && onHoldPrograms.length === 0 && !showPlanningSection && (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: '#9CAABB', fontSize: 13 }}>
              Tidak ada pekerjaan aktif
            </div>
          )}

          {activePrograms.length > 0 && (
            <>
              <SectionHeader label="Pekerjaan Berjalan" count={activePrograms.length} color="#1A6FE8" bg="rgba(26,111,232,0.05)" />
              {activePrograms.map((prog, idx) => (
                <ProgramRow
                  key={prog.id}
                  program={prog}
                  data={perProgram[prog.id] || empty()}
                  sectionColor="#1A6FE8"
                  isExpanded={expandedPrograms.has(prog.id)}
                  isLast={idx === activePrograms.length - 1 && onHoldPrograms.length === 0 && !showPlanningSection}
                  isAdmin={isAdmin}
                  canEdit={isAdmin}
                  onToggle={() => toggleExpand(prog.id)}
                  onFieldChange={(field, items) => setField(prog.id, field, items)}
                />
              ))}
            </>
          )}

          {onHoldPrograms.length > 0 && (
            <>
              <SectionHeader label="On Hold" count={onHoldPrograms.length} color="#D97706" bg="rgba(217,119,6,0.05)" />
              {onHoldPrograms.map((prog, idx) => (
                <ProgramRow
                  key={prog.id}
                  program={prog}
                  data={perProgram[prog.id] || empty()}
                  sectionColor="#D97706"
                  isExpanded={expandedPrograms.has(prog.id)}
                  isLast={idx === onHoldPrograms.length - 1 && !showPlanningSection}
                  isAdmin={isAdmin}
                  canEdit={isAdmin}
                  onToggle={() => toggleExpand(prog.id)}
                  onFieldChange={(field, items) => setField(prog.id, field, items)}
                />
              ))}
            </>
          )}

          {showPlanningSection && (
            <>
              <SectionHeader label="Perencanaan Pekan Depan" count={displayedPlanningPrograms.length} color="#B91C1C" bg="rgba(185,28,28,0.05)" />
              {displayedPlanningPrograms.map((prog, idx) => (
                <PlanningRow
                  key={prog.id}
                  program={prog}
                  data={perProgram[prog.id] || empty()}
                  isExpanded={expandedPrograms.has(prog.id)}
                  isLast={idx === displayedPlanningPrograms.length - 1 && !isAdmin}
                  isAdmin={isAdmin}
                  canEdit={isAdmin}
                  onToggle={() => toggleExpand(prog.id)}
                  onFieldChange={(field, items) => setField(prog.id, field, items)}
                  onUnpin={() => unpinProgram(prog.id)}
                />
              ))}

              {/* Add planning program (admin) */}
              {isAdmin && (
                <div style={{ padding: '10px 18px', position: 'relative' }} ref={dropdownRef}>
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
                      position: 'absolute', bottom: '100%', left: 18, right: 18, zIndex: 20,
                      backgroundColor: '#fff', borderRadius: 10,
                      border: '1px solid rgba(15,23,42,0.1)',
                      boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
                      overflow: 'hidden', maxHeight: 220, overflowY: 'auto', marginBottom: 4,
                    }}>
                      {availablePlanning.map((p, i) => (
                        <button
                          key={p.id}
                          onClick={() => pinProgram(p.id)}
                          style={{
                            width: '100%', textAlign: 'left', padding: '10px 14px',
                            border: 'none',
                            borderBottom: i < availablePlanning.length - 1 ? '1px solid rgba(15,23,42,0.05)' : 'none',
                            backgroundColor: 'transparent', color: '#0F1C2E',
                            fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'block',
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
        </>
      )}

      {/* Save button (current week, admin only) */}
      {showCurrentWeekSave && (
        <div style={{ padding: '12px 18px', borderTop: '1px solid rgba(15,23,42,0.06)' }}>
          {error && (
            <div style={{ marginBottom: 8, padding: 8, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)', color: '#991b1b', fontSize: 12 }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding: '8px 20px', borderRadius: 8, border: 'none', backgroundColor: '#1A6FE8', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}
            >
              {saving ? 'Menyimpan...' : 'Simpan Laporan'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
