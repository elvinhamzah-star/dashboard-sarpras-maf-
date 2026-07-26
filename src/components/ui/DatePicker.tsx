import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const DAYS = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'] // week starts Sunday

// Format a YYYY-MM-DD value as "24 Juli 2026" without touching Date (TZ-safe).
function displayLabel(v: string): string {
  const p = v.split('-')
  if (p.length !== 3) return ''
  const [y, m, d] = p.map(Number)
  if (!y || !m || !d) return ''
  return `${d} ${MONTHS[m - 1]} ${y}`
}

function pad(n: number): string { return String(n).padStart(2, '0') }
function todayYMD(): string { const t = new Date(); return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}` }

interface Props {
  value: string                 // YYYY-MM-DD (or '')
  onChange: (v: string) => void
  placeholder?: string
  fontSize?: number
  zIndex?: number
}

/**
 * Shared custom date picker — a theme-styled calendar portaled to <body>,
 * replacing native <input type="date"> so every date field looks identical
 * across the app (no OS-native calendar). Value/onChange use YYYY-MM-DD.
 */
export default function DatePicker({
  value,
  onChange,
  placeholder = 'Pilih tanggal',
  fontSize = 14,
  zIndex = 600,
}: Props) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const wrapRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Which month the calendar is showing (independent of the selected value).
  const initial = value && value.split('-').length === 3 ? value : todayYMD()
  const [vy, setVy] = useState(Number(initial.split('-')[0]))
  const [vm, setVm] = useState(Number(initial.split('-')[1]) - 1) // 0-indexed

  const reposition = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const panelH = 340
    const fitsBelow = rect.bottom + 6 + panelH < window.innerHeight
    setPos({
      top: fitsBelow ? rect.bottom + 6 : Math.max(8, rect.top - panelH - 6),
      left: Math.min(rect.left, window.innerWidth - 300),
      width: rect.width,
    })
  }

  const openPanel = () => {
    // Re-anchor the view to the selected month each time we open.
    const base = value && value.split('-').length === 3 ? value : todayYMD()
    setVy(Number(base.split('-')[0]))
    setVm(Number(base.split('-')[1]) - 1)
    reposition()
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node) && !panelRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onSR = () => reposition()
    document.addEventListener('mousedown', onDown)
    window.addEventListener('resize', onSR)
    document.addEventListener('scroll', onSR, { capture: true, passive: true })
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('resize', onSR)
      document.removeEventListener('scroll', onSR, { capture: true } as EventListenerOptions)
    }
  }, [open])

  const daysInMonth = new Date(vy, vm + 1, 0).getDate()
  const firstWeekday = new Date(vy, vm, 1).getDay() // 0=Sun
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  const today = todayYMD()

  const prevMonth = () => { if (vm === 0) { setVm(11); setVy(vy - 1) } else setVm(vm - 1) }
  const nextMonth = () => { if (vm === 11) { setVm(0); setVy(vy + 1) } else setVm(vm + 1) }
  const pick = (d: number) => { onChange(`${vy}-${pad(vm + 1)}-${pad(d)}`); setOpen(false) }

  const navBtn = (dir: 'prev' | 'next') => (
    <button type="button" onClick={dir === 'prev' ? prevMonth : nextMonth}
      style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <polyline points={dir === 'prev' ? '15 18 9 12 15 6' : '9 18 15 12 9 6'} />
      </svg>
    </button>
  )

  return (
    <div ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        style={{
          width: '100%',
          padding: '10px 14px',
          borderRadius: 10,
          border: `1px solid ${open ? 'var(--blue)' : 'var(--border)'}`,
          backgroundColor: 'var(--bg)',
          fontSize,
          color: value ? 'var(--text-primary)' : 'var(--text-muted)',
          fontFamily: 'inherit',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          textAlign: 'left',
          outline: 'none',
          boxSizing: 'border-box',
          boxShadow: open ? '0 0 0 3px rgba(26,111,232,0.12)' : 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value ? displayLabel(value) : placeholder}
        </span>
        <svg width="15" height="15" fill="none" stroke="#9CAABB" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
          <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>

      {open && createPortal(
        <div ref={panelRef}
          style={{
            position: 'fixed', top: pos.top, left: pos.left, width: 288, zIndex,
            backgroundColor: 'var(--card)', borderRadius: 14, border: '1px solid var(--border-subtle)',
            boxShadow: '0 8px 32px rgba(13,24,41,0.16)', padding: 14, boxSizing: 'border-box',
          }}
        >
          {/* Header: month + nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            {navBtn('prev')}
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              {MONTHS[vm]} {vy}
            </div>
            {navBtn('next')}
          </div>

          {/* Weekday labels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', padding: '2px 0' }}>{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells.map((d, i) => {
              if (d === null) return <div key={`e${i}`} />
              const ymd = `${vy}-${pad(vm + 1)}-${pad(d)}`
              const isSel = ymd === value
              const isToday = ymd === today
              return (
                <button key={ymd} type="button" onClick={() => pick(d)}
                  style={{
                    height: 34, borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontFamily: 'inherit',
                    fontWeight: isSel ? 700 : 500,
                    backgroundColor: isSel ? 'var(--blue)' : 'transparent',
                    color: isSel ? '#fff' : isToday ? 'var(--blue)' : 'var(--text-primary)',
                    outline: isToday && !isSel ? '1px solid rgba(26,111,232,0.4)' : 'none',
                    outlineOffset: -1,
                    transition: 'background-color 0.1s',
                  }}
                  onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--surface-min)' }}
                  onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
                >
                  {d}
                </button>
              )
            })}
          </div>

          {/* Footer: Hari Ini / Hapus */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--surface-min)' }}>
            <button type="button" onClick={() => { onChange(''); setOpen(false) }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 4 }}>
              Hapus
            </button>
            <button type="button" onClick={() => { onChange(today); setOpen(false) }}
              style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 4 }}>
              Hari Ini
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
