import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

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

interface WeeklyNote {
  id: string
  week_start: string
  week_end: string
  content: string
}

interface LiveProgram {
  id: string
  nama_pekerjaan: string
  status?: string | null
  vendor?: string | null
  link_dokumentasi?: string | null
  progress_percent?: number | null
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const MONTHS_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

const formatWeekRange = (start: string, end: string) => {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  if (s.getMonth() === e.getMonth()) {
    return `${s.getDate()} – ${e.getDate()} ${MONTHS[e.getMonth()]} ${e.getFullYear()}`
  }
  return `${s.getDate()} ${MONTHS[s.getMonth()]} – ${e.getDate()} ${MONTHS[e.getMonth()]} ${e.getFullYear()}`
}

const getMonthYear = (weekStart: string) => {
  const d = new Date(weekStart + 'T00:00:00')
  return `${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`
}

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

function BulletList({ items, color }: { items: string[]; color: string }) {
  const filtered = items.filter(i => i.trim())
  if (!filtered.length) {
    return <span style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>Belum ada catatan</span>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {filtered.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: color, flexShrink: 0, marginTop: 7 }} />
          <span style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}>{item}</span>
        </div>
      ))}
    </div>
  )
}

interface ProgramCardProps {
  id: string
  data: LaporanPerProgram
  meta: ProgramMeta | undefined
  livePrograms: LiveProgram[]
  accentColor: string
}

function ProgramCard({ id, data, meta, livePrograms, accentColor }: ProgramCardProps) {
  const live = livePrograms.find(p => p.id === id)
  const name = meta?.name || live?.nama_pekerjaan || '[Program Tidak Ditemukan]'
  const vendor = meta?.vendor !== undefined ? meta?.vendor : live?.vendor
  const link = meta?.link !== undefined ? meta?.link : live?.link_dokumentasi
  const progress = live?.progress_percent ?? null

  const sections = [
    { key: 'dikerjakan', label: 'Sudah Dikerjakan', color: '#059669', bg: 'rgba(5,150,105,0.07)', items: data.dikerjakan },
    { key: 'kendala', label: 'Kendala / Update', color: '#D97706', bg: 'rgba(217,119,6,0.07)', items: data.kendala },
    { key: 'rencana', label: 'Rencana Pekan Depan', color: '#1A6FE8', bg: 'rgba(26,111,232,0.07)', items: data.rencana },
  ]

  return (
    <div style={{
      backgroundColor: 'var(--card)',
      borderRadius: 12,
      border: `1px solid var(--border)`,
      borderLeft: `4px solid ${accentColor}`,
      overflow: 'hidden',
      boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
      marginBottom: 12,
    }}>
      {/* Program header */}
      <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.35, letterSpacing: '-0.01em' }}>
              {name}
            </div>
            {vendor && (
              <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 3 }}>{vendor}</div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {link && (
              <a
                href={link} target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px', borderRadius: 6,
                  backgroundColor: 'rgba(26,111,232,0.08)',
                  color: '#1A6FE8', fontSize: 11, fontWeight: 600,
                  textDecoration: 'none',
                  border: '1px solid rgba(26,111,232,0.15)',
                }}
              >
                <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                </svg>
                Docs
              </a>
            )}
            {progress !== null && (
              <span style={{ fontSize: 13, fontWeight: 700, color: accentColor }}>
                {progress}%
              </span>
            )}
          </div>
        </div>
        {progress !== null && (
          <div style={{ height: 3, backgroundColor: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden', marginTop: 10 }}>
            <div style={{ height: '100%', width: `${Math.min(100, progress)}%`, backgroundColor: accentColor, borderRadius: 99, transition: 'width 0.3s ease' }} />
          </div>
        )}
      </div>

      {/* Sections */}
      {sections.map((s, idx) => (
        <div key={s.key} style={{ borderTop: idx > 0 ? '1px solid var(--surface-subtle)' : 'none' }}>
          <div style={{ padding: '10px 18px 8px', backgroundColor: s.bg, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {s.label}
            </span>
          </div>
          <div style={{ padding: '10px 18px 12px' }}>
            <BulletList items={s.items} color={s.color} />
          </div>
        </div>
      ))}
    </div>
  )
}

interface WeekReportProps {
  note: WeeklyNote
  livePrograms: LiveProgram[]
}

function WeekReport({ note, livePrograms }: WeekReportProps) {
  const { programs, pinnedPlanning, programMeta } = parseContent(note.content)

  const build = (category: 'ongoing' | 'onhold' | 'planning') =>
    Object.entries(programs)
      .filter(([id, data]) => {
        if (!hasAnyData(data)) return false
        const meta = programMeta[id]
        if (meta) return meta.category === category
        const live = livePrograms.find(p => p.id === id)
        if (!live) return category === 'ongoing'
        if (category === 'ongoing') return live.status === 'On Going' || !['On Hold', 'Perencanaan'].includes(live.status || '')
        return false
      })

  const ongoingEntries = Object.entries(programs).filter(([id, data]) => {
    if (!hasAnyData(data)) return false
    const meta = programMeta[id]
    if (meta) return meta.category === 'ongoing'
    return !pinnedPlanning.includes(id)
  })

  const onholdEntries = Object.entries(programs).filter(([id, data]) => {
    if (!hasAnyData(data)) return false
    const meta = programMeta[id]
    if (!meta) return false
    return meta.category === 'onhold'
  })

  const planningEntries = Object.entries(programs).filter(([id, data]) => {
    if (!hasAnyData(data)) return false
    const meta = programMeta[id]
    if (meta) return meta.category === 'planning'
    return pinnedPlanning.includes(id)
  })

  void build

  const totalPrograms = ongoingEntries.length + onholdEntries.length + planningEntries.length

  if (totalPrograms === 0) {
    return (
      <div style={{ padding: '48px 32px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }}>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <div style={{ fontSize: 14 }}>Belum ada program tercatat minggu ini</div>
      </div>
    )
  }

  const SectionDivider = ({ label, count, color, bg }: { label: string; count: number; color: string; bg: string }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      marginBottom: 12, marginTop: 4,
    }}>
      <div style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: color, flexShrink: 0 }} />
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
      <div style={{
        fontSize: 11, fontWeight: 700, color, backgroundColor: bg,
        padding: '2px 8px', borderRadius: 20,
      }}>{count} program</div>
    </div>
  )

  return (
    <div>
      {ongoingEntries.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionDivider label="Pekerjaan Berjalan" count={ongoingEntries.length} color="#1A6FE8" bg="rgba(26,111,232,0.1)" />
          {ongoingEntries.map(([id, data]) => (
            <ProgramCard key={id} id={id} data={data} meta={programMeta[id]} livePrograms={livePrograms} accentColor="#1A6FE8" />
          ))}
        </div>
      )}

      {onholdEntries.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionDivider label="On Hold" count={onholdEntries.length} color="#D97706" bg="rgba(217,119,6,0.1)" />
          {onholdEntries.map(([id, data]) => (
            <ProgramCard key={id} id={id} data={data} meta={programMeta[id]} livePrograms={livePrograms} accentColor="#D97706" />
          ))}
        </div>
      )}

      {planningEntries.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionDivider label="Perencanaan" count={planningEntries.length} color="#B91C1C" bg="rgba(185,28,28,0.1)" />
          {planningEntries.map(([id, data]) => (
            <ProgramCard key={id} id={id} data={data} meta={programMeta[id]} livePrograms={livePrograms} accentColor="#B91C1C" />
          ))}
        </div>
      )}
    </div>
  )
}

export default function RiwayatLaporan() {
  const [notes, setNotes] = useState<WeeklyNote[]>([])
  const [programs, setPrograms] = useState<LiveProgram[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [showList, setShowList] = useState(true)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const load = async () => {
      const [notesRes, programsRes] = await Promise.all([
        supabase.from('weekly_notes').select('*').order('week_start', { ascending: false }),
        supabase.from('programs').select('id, nama_pekerjaan, vendor, link_dokumentasi, progress_percent'),
      ])
      const fetchedNotes = (notesRes.data || []) as WeeklyNote[]
      setNotes(fetchedNotes)
      setPrograms((programsRes.data || []) as LiveProgram[])
      if (fetchedNotes.length > 0) setSelectedId(fetchedNotes[0].id)
      setLoading(false)
    }
    load()
  }, [])

  const selectedNote = notes.find(n => n.id === selectedId) || null

  // Group notes by month
  const grouped: { monthYear: string; notes: WeeklyNote[] }[] = []
  notes.forEach(n => {
    const my = getMonthYear(n.week_start)
    const last = grouped[grouped.length - 1]
    if (last && last.monthYear === my) {
      last.notes.push(n)
    } else {
      grouped.push({ monthYear: my, notes: [n] })
    }
  })

  if (loading) {
    return (
      <div style={{ padding: 32, color: 'var(--text-muted)', fontSize: 14, textAlign: 'center' }}>
        Memuat riwayat laporan...
      </div>
    )
  }

  const SIDEBAR_W = 220

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      {/* Page header */}
      <div style={{ padding: '24px 28px 0', flexShrink: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
          Riwayat Laporan
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
          Arsip laporan pekanan per minggu
        </div>
      </div>

      {notes.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--text-muted)', padding: 32 }}>
          <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.25" viewBox="0 0 24 24">
            <path d="M12 8v4l3 3"/>
            <path d="M3.05 11a9 9 0 1 0 .5-4"/>
            <polyline points="3 3 3 7 7 7"/>
          </svg>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Belum ada laporan tersimpan</div>
          <div style={{ fontSize: 13 }}>Isi laporan pekanan di Beranda untuk mulai membangun riwayat</div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', marginTop: 20, minHeight: 0, padding: '0 28px 28px', gap: 16 }}>
          {/* Week list (sidebar) */}
          {(!isMobile || showList) && (
            <div style={{
              width: isMobile ? '100%' : SIDEBAR_W,
              flexShrink: 0,
              backgroundColor: 'var(--card)',
              borderRadius: 14,
              border: '1px solid var(--border-subtle)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              overflowY: 'auto',
              maxHeight: 'calc(100vh - 160px)',
            }}>
              <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Daftar Minggu
                </div>
              </div>
              {grouped.map(({ monthYear, notes: mNotes }) => (
                <div key={monthYear}>
                  <div style={{ padding: '10px 16px 6px', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {monthYear}
                  </div>
                  {mNotes.map(n => {
                    const isSelected = n.id === selectedId
                    return (
                      <button
                        key={n.id}
                        onClick={() => {
                          setSelectedId(n.id)
                          if (isMobile) setShowList(false)
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '9px 16px',
                          border: 'none',
                          borderLeft: `3px solid ${isSelected ? '#1A6FE8' : 'transparent'}`,
                          backgroundColor: isSelected ? 'rgba(26,111,232,0.06)' : 'transparent',
                          color: isSelected ? '#1A6FE8' : '#3D5070',
                          fontSize: 12.5,
                          fontWeight: isSelected ? 700 : 450,
                          cursor: 'pointer',
                          letterSpacing: '-0.01em',
                          display: 'block',
                          fontFamily: 'inherit',
                          transition: 'all 0.12s',
                        }}
                        onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--surface-min)' }}
                        onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
                      >
                        {formatWeekRange(n.week_start, n.week_end)}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}

          {/* Report content */}
          {(!isMobile || !showList) && (
            <div style={{ flex: 1, minWidth: 0 }}>
              {isMobile && (
                <button
                  onClick={() => setShowList(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    marginBottom: 16, padding: '7px 14px',
                    borderRadius: 8, border: '1px solid var(--border)',
                    backgroundColor: 'var(--card)', cursor: 'pointer',
                    fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'inherit',
                  }}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  Daftar Minggu
                </button>
              )}

              {selectedNote && (
                <div>
                  {/* Report header */}
                  <div style={{
                    backgroundColor: 'var(--card)',
                    borderRadius: 14,
                    border: '1px solid var(--border-subtle)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    padding: '18px 22px',
                    marginBottom: 16,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
                          Laporan Pekanan
                        </div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                          {formatWeekRange(selectedNote.week_start, selectedNote.week_end)}
                        </div>
                      </div>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '5px 12px', borderRadius: 20,
                        backgroundColor: 'rgba(5,150,105,0.1)',
                        color: '#059669', fontSize: 11, fontWeight: 700,
                      }}>
                        <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path d="M12 8v4l3 3"/><path d="M3.05 11a9 9 0 1 0 .5-4"/><polyline points="3 3 3 7 7 7"/>
                        </svg>
                        Arsip
                      </div>
                    </div>
                  </div>

                  {/* Report body */}
                  <div style={{
                    backgroundColor: 'var(--card)',
                    borderRadius: 14,
                    border: '1px solid var(--border-subtle)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    padding: '20px 22px',
                    overflowY: 'auto',
                    maxHeight: 'calc(100vh - 280px)',
                  }}>
                    <WeekReport note={selectedNote} livePrograms={programs} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
