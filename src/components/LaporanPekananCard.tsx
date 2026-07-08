import { useState, useEffect, useRef } from 'react'
import { useWindowWidth } from '../lib/useWindowWidth'
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
  category: 'ongoing' | 'onhold' | 'planning' | 'selesai'
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
  pinnedSelesai: string[]
  programMeta: Record<string, ProgramMeta>
} => {
  try {
    const p = JSON.parse(content)
    if (p.v === 2) return { programs: p.programs || {}, pinnedPlanning: p.pinned_planning || [], pinnedSelesai: [], programMeta: {} }
    if (p.v === 3) return { programs: p.programs || {}, pinnedPlanning: p.pinned_planning || [], pinnedSelesai: p.pinned_selesai || [], programMeta: p.program_meta || {} }
  } catch {}
  return { programs: {}, pinnedPlanning: [], pinnedSelesai: [], programMeta: {} }
}

const hasAnyData = (d: LaporanPerProgram) =>
  d.dikerjakan.some(x => x.trim()) || d.kendala.some(x => x.trim()) || d.rencana.some(x => x.trim())

const BulletList = ({ items }: { items: string[] }) => {
  const filtered = items.filter(i => i.trim())
  if (!filtered.length) return <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Belum ada catatan</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {filtered.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: 'var(--text-muted)', flexShrink: 0, marginTop: 8 }} />
          <span style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.55 }}>{item}</span>
        </div>
      ))}
    </div>
  )
}

const FolderLink = ({ href }: { href: string }) => (
  <a
    href={href} target="_blank" rel="noopener noreferrer"
    title="Buka folder dokumentasi"
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 6,
      backgroundColor: 'rgba(26,111,232,0.08)',
      color: 'var(--blue)', fontSize: 11, fontWeight: 600,
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
    placeholder: 'Progres Atau Pencapaian Pekan Ini...',
    color: '#059669',
    bg: 'rgba(5,150,105,0.07)',
  },
  {
    field: 'kendala' as const,
    label: 'Kendala / Update',
    placeholder: 'Kendala Atau Hal Penting Yang Perlu Dilaporkan...',
    color: '#D97706',
    bg: 'rgba(217,119,6,0.07)',
  },
  {
    field: 'rencana' as const,
    label: 'Rencana Pekan Depan',
    placeholder: 'Target Atau Rencana Untuk Pekan Berikutnya...',
    color: 'var(--blue)',
    bg: 'rgba(26,111,232,0.07)',
  },
]

// ── Left panel item ──────────────────────────────────────────────────────────

function LeftItem({
  program,
  isSelected,
  statusColor,
  statusBg,
  notePreview,
  onClick,
}: {
  program: DisplayProgram
  isSelected: boolean
  statusColor: string
  statusBg: string
  notePreview?: string
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const progress = program.progress_percent ?? 0
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '10px 14px',
        cursor: 'pointer',
        backgroundColor: isSelected ? statusBg : hovered ? 'rgba(255,255,255,0.025)' : 'transparent',
        borderLeft: `3px solid ${isSelected ? statusColor : 'transparent'}`,
        borderBottom: '1px solid var(--surface-subtle)',
        transition: 'background-color 0.1s',
        userSelect: 'none',
      }}
    >
      <div style={{ fontSize: 12.5, fontWeight: isSelected ? 700 : 500, color: 'var(--text-primary)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {program.nama_pekerjaan}
      </div>
      {program.vendor && (
        <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {program.vendor}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7 }}>
        <div style={{ flex: 1, height: 4, backgroundColor: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(100, progress)}%`, backgroundColor: statusColor, borderRadius: 99 }} />
        </div>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: isSelected ? statusColor : 'var(--text-muted)', minWidth: 28, textAlign: 'right' }}>
          {progress}%
        </span>
      </div>
      {notePreview && (
        <div style={{
          marginTop: 6,
          fontSize: 10.5,
          color: 'var(--text-secondary)',
          lineHeight: 1.4,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {notePreview}
        </div>
      )}
    </div>
  )
}

// ── Left panel section header ────────────────────────────────────────────────

function LeftSectionHeader({ label, count, color, bg }: { label: string; count: number; color: string; bg: string }) {
  return (
    <div style={{
      padding: '7px 14px',
      backgroundColor: bg,
      display: 'flex', alignItems: 'center', gap: 8,
      borderBottom: '1px solid var(--surface-subtle)',
      borderTop: '1px solid var(--surface-min)',
    }}>
      <span style={{ fontSize: 10.5, fontWeight: 700, color, flex: 1, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
      <span style={{
        fontSize: 10.5, fontWeight: 700, color,
        backgroundColor: `rgba(${color === 'var(--blue)' ? '26,111,232' : color === '#D97706' ? '217,119,6' : color === '#1B5E2B' ? '27,94,43' : '185,28,28'},0.12)`,
        padding: '1px 7px', borderRadius: 12,
      }}>{count}</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LaporanPekananCard({ isAdmin, programs }: LaporanPekananCardProps) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [note, setNote] = useState<WeeklyNote | null>(null)
  const [loading, setLoading] = useState(true)
  const [weekLoading, setWeekLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [perProgram, setPerProgram] = useState<Record<string, LaporanPerProgram>>({})
  const [programMeta, setProgramMeta] = useState<Record<string, ProgramMeta>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pinnedPlanningIds, setPinnedPlanningIds] = useState<string[]>([])
  const [pinnedSelesaiIds, setPinnedSelesaiIds] = useState<string[]>([])
  const [showDropdown, setShowDropdown] = useState<'planning' | 'selesai' | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [mobileDetailView, setMobileDetailView] = useState(false)
  const width = useWindowWidth()
  const isNarrow = width < 700
  const mountedRef = useRef(false)
  const dropdownPlanningRef = useRef<HTMLDivElement>(null)
  const dropdownSelesaiRef = useRef<HTMLDivElement>(null)

  const week = getWeekDates(weekOffset)
  const isPastWeek = weekOffset < 0

  const activePrograms = programs.filter(p => p.status === 'On Going' && p.jenis_pekerjaan !== 'Operasional')
  const onHoldPrograms = programs.filter(p => p.status === 'On Hold' && p.jenis_pekerjaan !== 'Operasional')
  const planningPrograms = programs.filter(p => p.status === 'Perencanaan' && p.jenis_pekerjaan !== 'Operasional')
  const selesaiPrograms = programs.filter(p => p.status === 'Selesai' && p.jenis_pekerjaan !== 'Operasional')
  const availablePlanning = planningPrograms.filter(p => !pinnedPlanningIds.includes(p.id))
  const availableSelesai = selesaiPrograms.filter(p => !pinnedSelesaiIds.includes(p.id))
  const pinnedPrograms = pinnedPlanningIds.map(id => planningPrograms.find(p => p.id === id)).filter(Boolean) as Program[]
  const pinnedSelesaiPrograms = pinnedSelesaiIds.map(id => selesaiPrograms.find(p => p.id === id)).filter(Boolean) as Program[]
  const displayedPlanningPrograms = isAdmin
    ? pinnedPrograms
    : planningPrograms.filter(p => { const d = perProgram[p.id]; return d && d.rencana.some(x => x.trim()) })
  const displayedSelesaiPrograms = isAdmin
    ? pinnedSelesaiPrograms
    : selesaiPrograms.filter(p => { const d = perProgram[p.id]; return d && hasAnyData(d) })

  const buildHistorical = (category: 'ongoing' | 'onhold' | 'planning' | 'selesai'): DisplayProgram[] => {
    if (!isPastWeek) return []
    return Object.entries(perProgram)
      .filter(([id, data]) => {
        if (!hasAnyData(data)) return false
        const meta = programMeta[id]
        if (meta) return meta.category === category
        const live = programs.find(p => p.id === id)
        if (!live) return category === 'ongoing'
        const s = live.status
        if (category === 'ongoing') return s === 'On Going'
        if (category === 'onhold') return s === 'On Hold'
        if (category === 'selesai') return s === 'Selesai'
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
  const histSelesai = buildHistorical('selesai')
  const histOnhold = buildHistorical('onhold')
  const histPlanning = buildHistorical('planning')

  const setField = (programId: string, field: keyof LaporanPerProgram, items: string[]) => {
    setPerProgram(prev => ({ ...prev, [programId]: { ...(prev[programId] || empty()), [field]: items } }))
  }

  const pinProgram = (id: string) => {
    setPinnedPlanningIds(prev => [...prev, id])
    setShowDropdown(null)
    setSelectedId(id)
  }

  const unpinProgram = (id: string) => {
    setPinnedPlanningIds(prev => prev.filter(x => x !== id))
    setPerProgram(prev => { const n = { ...prev }; delete n[id]; return n })
    if (selectedId === id) {
      const next = [...activePrograms, ...onHoldPrograms].find(p => p.id !== id)
      setSelectedId(next?.id || null)
    }
  }

  const pinSelesai = (id: string) => {
    setPinnedSelesaiIds(prev => [...prev, id])
    setShowDropdown(null)
    setSelectedId(id)
  }

  const unpinSelesai = (id: string) => {
    setPinnedSelesaiIds(prev => prev.filter(x => x !== id))
    setPerProgram(prev => { const n = { ...prev }; delete n[id]; return n })
    if (selectedId === id) {
      const next = activePrograms.find(p => p.id !== id)
      setSelectedId(next?.id || null)
    }
  }

  useEffect(() => {
    if (!showDropdown) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      const inPlanning = dropdownPlanningRef.current?.contains(target)
      const inSelesai = dropdownSelesaiRef.current?.contains(target)
      if (!inPlanning && !inSelesai) setShowDropdown(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showDropdown])

  const load = async () => {
    if (!mountedRef.current) setLoading(true)
    else setWeekLoading(true)

    const { data } = await supabase
      .from('weekly_notes').select('*').eq('week_start', week.start).maybeSingle()

    let defaultId: string | null = null

    if (data) {
      setNote(data as WeeklyNote)
      const { programs: parsed, pinnedPlanning, pinnedSelesai, programMeta: meta } = parseContent(data.content)
      setPerProgram(parsed)
      setPinnedPlanningIds(pinnedPlanning)
      setPinnedSelesaiIds(pinnedSelesai)
      setProgramMeta(meta)
      if (weekOffset < 0) {
        defaultId = Object.entries(parsed).find(([_, d]) => hasAnyData(d))?.[0] || null
      }
    } else {
      setNote(null)
      setPerProgram({})
      setPinnedPlanningIds([])
      setPinnedSelesaiIds([])
      setProgramMeta({})
    }

    // Default selection: first active program (current or past week fallback)
    if (!defaultId) {
      const first = programs.find(p => p.status === 'On Going' && p.jenis_pekerjaan !== 'Operasional')
      defaultId = first?.id || null
    }

    setSelectedId(defaultId)
    setIsEditing(false)
    setMobileDetailView(false)
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

    const meta: Record<string, ProgramMeta> = {}
    activePrograms.forEach(p => { meta[p.id] = { name: p.nama_pekerjaan, vendor: p.vendor, category: 'ongoing', link: p.link_dokumentasi } })
    onHoldPrograms.forEach(p => { meta[p.id] = { name: p.nama_pekerjaan, vendor: p.vendor, category: 'onhold', link: p.link_dokumentasi } })
    pinnedPrograms.forEach(p => { meta[p.id] = { name: p.nama_pekerjaan, vendor: p.vendor, category: 'planning', link: p.link_dokumentasi } })
    pinnedSelesaiPrograms.forEach(p => { meta[p.id] = { name: p.nama_pekerjaan, vendor: p.vendor, category: 'selesai', link: p.link_dokumentasi } })

    const content = JSON.stringify({ v: 3, programs: cleaned, pinned_planning: pinnedPlanningIds, pinned_selesai: pinnedSelesaiIds, program_meta: meta })
    const payload = { week_start: week.start, week_end: week.end, content }
    const result = note
      ? await adminUpdate('weekly_notes', payload, note.id)
      : await adminInsert('weekly_notes', payload)

    if (result.error) setError(result.error.message || 'Gagal menyimpan')
    else { setIsEditing(false); load() }
    setSaving(false)
  }

  if (loading) return null

  const canEdit = isAdmin && isEditing
  const showSaveBar = isAdmin && (activePrograms.length > 0 || pinnedPlanningIds.length > 0 || pinnedSelesaiIds.length > 0 || isPastWeek)

  const allCurrentPrograms: DisplayProgram[] = [...activePrograms, ...displayedSelesaiPrograms, ...displayedPlanningPrograms]
  const allHistPrograms: DisplayProgram[] = [...histOngoing, ...histSelesai, ...histOnhold, ...histPlanning]
  // Admin always sees current programs (can fill past weeks retroactively)
  // Viewer past week: only programs that have saved data
  const allPrograms = (isPastWeek && !isAdmin) ? allHistPrograms : allCurrentPrograms
  const hasAnyPrograms = allPrograms.length > 0

  const selectedProgram = allPrograms.find(p => p.id === selectedId) || null
  const selectedData = selectedId ? (perProgram[selectedId] || empty()) : empty()

  const isSelectedPlanning = !!selectedId && (
    (isPastWeek && !isAdmin)
      ? histPlanning.some(p => p.id === selectedId)
      : displayedPlanningPrograms.some(p => p.id === selectedId)
  )

  const isSelectedSelesai = !!selectedId && (
    (isPastWeek && !isAdmin)
      ? histSelesai.some(p => p.id === selectedId)
      : displayedSelesaiPrograms.some(p => p.id === selectedId)
  )

  const getNotePreview = (progId: string) =>
    perProgram[progId]?.dikerjakan.find(x => x.trim()) ?? undefined

  const getStatusColor = (id: string) => {
    if (isPastWeek && !isAdmin) {
      if (histOnhold.some(p => p.id === id)) return '#D97706'
      if (histPlanning.some(p => p.id === id)) return '#660000'
      if (histSelesai.some(p => p.id === id)) return '#1B5E2B'
      return 'var(--blue)'
    }
    if (onHoldPrograms.some(p => p.id === id)) return '#D97706'
    if (displayedPlanningPrograms.some(p => p.id === id)) return '#660000'
    if (displayedSelesaiPrograms.some(p => p.id === id)) return '#1B5E2B'
    return 'var(--blue)'
  }

  const statusBgMap: Record<string, string> = {
    'var(--blue)': 'rgba(26,111,232,0.07)',
    '#D97706': 'rgba(217,119,6,0.07)',
    '#660000': 'rgba(102,0,0,0.07)',
    '#1B5E2B': 'rgba(27,94,43,0.07)',
  }

  return (
    <div style={{
      backgroundColor: 'var(--card)',
      borderRadius: 14,
      border: '1px solid var(--border-subtle)',
      boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
      overflow: 'hidden',
    }}>
      {/* ── Header ── */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Laporan Pekanan</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Update progress mingguan per program</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {isPastWeek && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 20, backgroundColor: 'rgba(124,58,237,0.08)', color: '#7C3AED', fontSize: 10.5, fontWeight: 700 }}>
              <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M12 8v4l3 3"/><path d="M3.05 11a9 9 0 1 0 .5-4"/>
              </svg>
              Riwayat
            </div>
          )}
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border-strong)', backgroundColor: 'var(--card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', padding: 0 }}
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div style={{ textAlign: 'center', opacity: weekLoading ? 0.45 : 1, transition: 'opacity 0.15s', minWidth: 150 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              {formatWeekRange(week.start, week.end)}
            </span>
          </div>
          <button
            onClick={() => setWeekOffset(w => Math.min(0, w + 1))}
            disabled={weekOffset === 0}
            style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border-strong)', backgroundColor: 'var(--card)', cursor: weekOffset === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', padding: 0, opacity: weekOffset === 0 ? 0.3 : 1 }}
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
      </div>

      {/* ── Empty states ── */}
      {isPastWeek && !note && !isAdmin && (
        <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Belum Ada Laporan Disimpan Untuk Minggu Ini
        </div>
      )}
      {isPastWeek && note && !hasAnyPrograms && !isAdmin && (
        <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Laporan Minggu Ini Belum Memiliki Catatan Program
        </div>
      )}
      {!isPastWeek && activePrograms.length === 0 && displayedPlanningPrograms.length === 0 && !isAdmin && (
        <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Tidak Ada Pekerjaan Aktif
        </div>
      )}

      {/* ── Two-pane (list + detail) ── */}
      {(hasAnyPrograms || isAdmin) && (
        <div style={{ display: 'flex', minHeight: isNarrow ? 0 : 380, flexDirection: isNarrow ? 'column' : 'row' }}>

          {/* Left panel — list of programs */}
          {(!isNarrow || !mobileDetailView) && (
          <div style={{
            width: isNarrow ? '100%' : 242,
            flexShrink: 0,
            borderRight: isNarrow ? 'none' : '1px solid var(--border-subtle)',
            overflowY: 'auto',
          }}>
            {(isPastWeek && !isAdmin) ? (
              // Viewer past week: only programs with saved data
              <>
                {histOngoing.length > 0 && (
                  <>
                    <LeftSectionHeader label="Pekerjaan Berjalan" count={histOngoing.length} color="#1A6FE8" bg="rgba(26,111,232,0.04)" />
                    {histOngoing.map(prog => (
                      <LeftItem key={prog.id} program={prog} isSelected={selectedId === prog.id} statusColor="#1A6FE8" statusBg="rgba(26,111,232,0.07)" notePreview={getNotePreview(prog.id)} onClick={() => { setSelectedId(prog.id); if (isNarrow) setMobileDetailView(true) }} />
                    ))}
                  </>
                )}
                {histSelesai.length > 0 && (
                  <>
                    <LeftSectionHeader label="Selesai" count={histSelesai.length} color="#1B5E2B" bg="rgba(27,94,43,0.04)" />
                    {histSelesai.map(prog => (
                      <LeftItem key={prog.id} program={prog} isSelected={selectedId === prog.id} statusColor="#1B5E2B" statusBg="rgba(27,94,43,0.07)" notePreview={getNotePreview(prog.id)} onClick={() => { setSelectedId(prog.id); if (isNarrow) setMobileDetailView(true) }} />
                    ))}
                  </>
                )}
                {histOnhold.length > 0 && (
                  <>
                    <LeftSectionHeader label="On Hold" count={histOnhold.length} color="#D97706" bg="rgba(217,119,6,0.04)" />
                    {histOnhold.map(prog => (
                      <LeftItem key={prog.id} program={prog} isSelected={selectedId === prog.id} statusColor="#D97706" statusBg="rgba(217,119,6,0.07)" notePreview={getNotePreview(prog.id)} onClick={() => { setSelectedId(prog.id); if (isNarrow) setMobileDetailView(true) }} />
                    ))}
                  </>
                )}
                {histPlanning.length > 0 && (
                  <>
                    <LeftSectionHeader label="Perencanaan" count={histPlanning.length} color="#660000" bg="rgba(102,0,0,0.04)" />
                    {histPlanning.map(prog => (
                      <LeftItem key={prog.id} program={prog} isSelected={selectedId === prog.id} statusColor="#660000" statusBg="rgba(102,0,0,0.07)" notePreview={getNotePreview(prog.id)} onClick={() => { setSelectedId(prog.id); if (isNarrow) setMobileDetailView(true) }} />
                    ))}
                  </>
                )}
              </>
            ) : (
              // Current week OR admin past week: always show all current programs
              <>
                {activePrograms.length > 0 && (
                  <>
                    <LeftSectionHeader label="Pekerjaan Berjalan" count={activePrograms.length} color="#1A6FE8" bg="rgba(26,111,232,0.04)" />
                    {activePrograms.map(prog => (
                      <LeftItem key={prog.id} program={prog} isSelected={selectedId === prog.id} statusColor="#1A6FE8" statusBg="rgba(26,111,232,0.07)" notePreview={getNotePreview(prog.id)} onClick={() => { setSelectedId(prog.id); if (isNarrow) setMobileDetailView(true) }} />
                    ))}
                  </>
                )}
                {(displayedSelesaiPrograms.length > 0 || isAdmin) && (
                  <>
                    <LeftSectionHeader label="Selesai" count={displayedSelesaiPrograms.length} color="#1B5E2B" bg="rgba(27,94,43,0.04)" />
                    {displayedSelesaiPrograms.map(prog => (
                      <LeftItem key={prog.id} program={prog} isSelected={selectedId === prog.id} statusColor="#1B5E2B" statusBg="rgba(27,94,43,0.07)" notePreview={getNotePreview(prog.id)} onClick={() => { setSelectedId(prog.id); if (isNarrow) setMobileDetailView(true) }} />
                    ))}
                    {isAdmin && (
                      <div style={{ padding: '10px 12px', position: 'relative' }} ref={dropdownSelesaiRef}>
                        <button
                          onClick={() => setShowDropdown(v => v === 'selesai' ? null : 'selesai')}
                          disabled={availableSelesai.length === 0}
                          style={{
                            width: '100%', padding: '6px 10px',
                            borderRadius: 7, border: '1px dashed var(--border-strong)',
                            backgroundColor: 'transparent', color: 'var(--text-secondary)',
                            fontSize: 11.5, fontWeight: 600,
                            cursor: availableSelesai.length > 0 ? 'pointer' : 'default',
                            display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center',
                            fontFamily: 'inherit', opacity: availableSelesai.length === 0 ? 0.4 : 1,
                          }}
                        >
                          <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                          {availableSelesai.length === 0 ? 'Semua Sudah Ditambahkan' : 'Tambah Pekerjaan'}
                        </button>
                        {showDropdown === 'selesai' && availableSelesai.length > 0 && (
                          <div style={{
                            position: 'absolute', bottom: '100%', left: 12, right: 12, zIndex: 20,
                            backgroundColor: 'var(--card)', borderRadius: 10,
                            border: '1px solid var(--border)',
                            boxShadow: '0 8px 24px var(--border-strong)',
                            overflow: 'hidden', maxHeight: 240, overflowY: 'auto', marginBottom: 4,
                          }}>
                            {availableSelesai.map((p, i) => (
                              <button
                                key={p.id}
                                onClick={() => pinSelesai(p.id)}
                                style={{
                                  width: '100%', textAlign: 'left', padding: '8px 12px',
                                  border: 'none',
                                  borderBottom: i < availableSelesai.length - 1 ? '1px solid var(--surface-subtle)' : 'none',
                                  backgroundColor: 'transparent', color: 'var(--text-primary)',
                                  fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'block',
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
                {(displayedPlanningPrograms.length > 0 || isAdmin) && (
                  <>
                    <LeftSectionHeader label="Perencanaan Pekan Depan" count={displayedPlanningPrograms.length} color="#660000" bg="rgba(102,0,0,0.04)" />
                    {displayedPlanningPrograms.map(prog => (
                      <LeftItem key={prog.id} program={prog} isSelected={selectedId === prog.id} statusColor="#660000" statusBg="rgba(102,0,0,0.07)" notePreview={getNotePreview(prog.id)} onClick={() => { setSelectedId(prog.id); if (isNarrow) setMobileDetailView(true) }} />
                    ))}
                    {isAdmin && (
                      <div style={{ padding: '10px 12px', position: 'relative' }} ref={dropdownPlanningRef}>
                        <button
                          onClick={() => setShowDropdown(v => v === 'planning' ? null : 'planning')}
                          disabled={availablePlanning.length === 0}
                          style={{
                            width: '100%', padding: '6px 10px',
                            borderRadius: 7, border: '1px dashed var(--border-strong)',
                            backgroundColor: 'transparent', color: 'var(--text-secondary)',
                            fontSize: 11.5, fontWeight: 600,
                            cursor: availablePlanning.length > 0 ? 'pointer' : 'default',
                            display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center',
                            fontFamily: 'inherit', opacity: availablePlanning.length === 0 ? 0.4 : 1,
                          }}
                        >
                          <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                          {availablePlanning.length === 0 ? 'Semua Sudah Ditambahkan' : 'Tambah Pekerjaan'}
                        </button>
                        {showDropdown === 'planning' && availablePlanning.length > 0 && (
                          <div style={{
                            position: 'absolute', bottom: '100%', left: 12, right: 12, zIndex: 20,
                            backgroundColor: 'var(--card)', borderRadius: 10,
                            border: '1px solid var(--border)',
                            boxShadow: '0 8px 24px var(--border-strong)',
                            overflow: 'hidden', maxHeight: 240, overflowY: 'auto', marginBottom: 4,
                          }}>
                            {availablePlanning.map((p, i) => (
                              <button
                                key={p.id}
                                onClick={() => pinProgram(p.id)}
                                style={{
                                  width: '100%', textAlign: 'left', padding: '8px 12px',
                                  border: 'none',
                                  borderBottom: i < availablePlanning.length - 1 ? '1px solid var(--surface-subtle)' : 'none',
                                  backgroundColor: 'transparent', color: 'var(--text-primary)',
                                  fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'block',
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
          </div>
          )}

          {/* Right panel — detail view */}
          {(!isNarrow || mobileDetailView) && (
          <div style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
            {isNarrow && (
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
                <button
                  onClick={() => setMobileDetailView(false)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', background: 'var(--card)', border: '1px solid var(--border-subtle)', borderRadius: 99, padding: '6px 14px 6px 8px', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s' }}
                  onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = '#fff'; b.style.background = 'var(--blue)'; b.style.borderColor = 'var(--blue)'; const ic = b.querySelector('.bk-ic') as HTMLElement | null; if (ic) ic.style.background = 'rgba(255,255,255,0.2)' }}
                  onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = 'var(--text-secondary)'; b.style.background = 'var(--card)'; b.style.borderColor = 'var(--border-subtle)'; const ic = b.querySelector('.bk-ic') as HTMLElement | null; if (ic) ic.style.background = 'rgba(0,0,0,0.06)' }}
                >
                  <span className="bk-ic" style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s', flexShrink: 0 }}>
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
                  </span>
                  Kembali ke Daftar
                </button>
              </div>
            )}
            {!selectedProgram ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200, color: 'var(--text-muted)', fontSize: 13 }}>
                Pilih program di sebelah kiri
              </div>
            ) : (
              <div style={{ padding: isNarrow ? '16px 14px' : '20px 24px' }}>
                {/* Program header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.3 }}>
                      {selectedProgram.nama_pekerjaan}
                    </div>
                    {selectedProgram.vendor && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{selectedProgram.vendor}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {isSelectedSelesai && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 5, backgroundColor: 'rgba(27,94,43,0.1)', color: '#1B5E2B', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.03em', flexShrink: 0 }}>
                        <svg width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                        Selesai
                      </span>
                    )}
                    {selectedProgram.link_dokumentasi && <FolderLink href={selectedProgram.link_dokumentasi} />}
                    {canEdit && (isSelectedPlanning || isSelectedSelesai) && (
                      <button
                        onClick={() => selectedId && (isSelectedPlanning ? unpinProgram(selectedId) : unpinSelesai(selectedId))}
                        title="Hapus dari laporan"
                        style={{ background: 'none', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11, borderRadius: 6, padding: '3px 8px', fontFamily: 'inherit' }}
                      >
                        Hapus
                      </button>
                    )}
                    <span style={{ fontSize: 26, fontWeight: 700, color: getStatusColor(selectedProgram.id), letterSpacing: '-0.03em' }}>
                      {selectedProgram.progress_percent ?? 0}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: 6, backgroundColor: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden', marginBottom: 22 }}>
                  <div style={{ height: '100%', width: `${Math.min(100, selectedProgram.progress_percent ?? 0)}%`, backgroundColor: getStatusColor(selectedProgram.id), borderRadius: 99, transition: 'width 0.3s ease' }} />
                </div>

                {/* Sections */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {(isSelectedPlanning ? [SECTIONS[2]] : SECTIONS).map(s => {
                    const sColor = isSelectedPlanning ? '#660000' : s.color
                    const sBg = isSelectedPlanning ? 'rgba(102,0,0,0.07)' : s.bg
                    const sLabel = isSelectedPlanning ? 'Rencana Pekan Depan' : s.label
                    return (
                    <div key={s.field}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', backgroundColor: sBg, borderRadius: 8, marginBottom: 10 }}>
                        <div style={{ width: 3, height: 13, borderRadius: 2, backgroundColor: sColor, flexShrink: 0 }} />
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: sColor, textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1 }}>
                          {sLabel}
                        </span>
                        {s.field === 'dikerjakan' && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#059669' }}>
                            {selectedProgram.progress_percent ?? 0}%
                          </span>
                        )}
                      </div>
                      {canEdit ? (
                        <BulletInput
                          items={selectedData[s.field]}
                          onChange={items => selectedId && setField(selectedId, s.field, items)}
                          placeholder={s.placeholder}
                        />
                      ) : (
                        <BulletList items={selectedData[s.field]} />
                      )}
                    </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          )}
        </div>
      )}

      {/* ── Save / Edit bar ── */}
      {showSaveBar && (
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border-subtle)' }}>
          {error && (
            <div style={{ marginBottom: 8, padding: 8, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)', color: '#E53E3E', fontSize: 12 }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-strong)', backgroundColor: 'var(--card)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{ padding: '8px 20px', borderRadius: 8, border: 'none', backgroundColor: 'var(--blue)', color: 'var(--card)', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}
                >
                  {saving ? 'Menyimpan...' : 'Simpan Laporan'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(26,111,232,0.3)', backgroundColor: 'rgba(26,111,232,0.06)', color: 'var(--blue)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Edit Laporan
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
