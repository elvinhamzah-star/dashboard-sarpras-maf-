import { useState, useRef, useEffect } from 'react'
import { monthLabelFromYM } from '../lib/data'

interface MonthSelectorProps {
  /** Selected month as 'YYYY-MM', or null for "Semua Bulan" (all). */
  value: string | null
  onChange: (ym: string | null) => void
  /** Available months as 'YYYY-MM', expected sorted newest-first. */
  months: string[]
  allLabel?: string
}

/**
 * Compact month picker: a styled trigger + custom dropdown panel (never the
 * native <select>), flanked by prev/next arrows that step through `months`.
 */
export default function MonthSelector({ value, onChange, months, allLabel = 'Semua Bulan' }: MonthSelectorProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const wrapRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const openPanel = () => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 6, left: r.left, width: Math.max(r.width, 180) })
    }
    setOpen(true)
  }

  // Index in months[] of the current value (-1 if "all" or not present)
  const idx = value ? months.indexOf(value) : -1
  // months are newest-first: "older" = idx+1, "newer" = idx-1
  const canOlder = idx === -1 ? months.length > 0 : idx < months.length - 1
  const canNewer = idx > 0
  const stepOlder = () => { if (idx === -1) { if (months[0]) onChange(months[0]) } else if (idx < months.length - 1) onChange(months[idx + 1]) }
  const stepNewer = () => { if (idx > 0) onChange(months[idx - 1]) }

  const arrowBtn = (dir: 'older' | 'newer', enabled: boolean, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      disabled={!enabled}
      aria-label={dir === 'older' ? 'Bulan sebelumnya' : 'Bulan berikutnya'}
      style={{
        width: 30, height: 32, borderRadius: 8, flexShrink: 0,
        border: '1px solid var(--border-strong)', backgroundColor: 'var(--card)',
        cursor: enabled ? 'pointer' : 'default', opacity: enabled ? 1 : 0.35,
        color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
      }}
    >
      <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
        style={{ transform: dir === 'older' ? 'none' : 'rotate(180deg)' }}>
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  )

  return (
    <div ref={wrapRef} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {arrowBtn('older', canOlder, stepOlder)}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        style={{
          minWidth: 150, height: 32, padding: '0 12px', borderRadius: 8,
          border: `1px solid ${open ? 'var(--blue)' : 'var(--border-strong)'}`,
          backgroundColor: 'var(--card)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
          boxShadow: open ? '0 0 0 3px rgba(26,111,232,0.12)' : 'none', transition: 'all 0.15s',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <svg width="14" height="14" fill="none" stroke="#1A6FE8" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {value ? monthLabelFromYM(value) : allLabel}
        </span>
        <svg width="13" height="13" fill="none" stroke="#9CAABB" strokeWidth="2.5" viewBox="0 0 24 24"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {arrowBtn('newer', canNewer, stepNewer)}

      {open && (
        <div style={{
          position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 200,
          backgroundColor: 'var(--card)', borderRadius: 12, border: '1px solid rgba(26,43,94,0.12)',
          boxShadow: '0 8px 32px rgba(13,24,41,0.14)', overflow: 'hidden',
          maxHeight: 280, overflowY: 'auto',
        }}>
          {[null, ...months].map((m, i) => {
            const active = m === value
            return (
              <button
                key={m ?? '__all__'}
                type="button"
                onClick={() => { onChange(m); setOpen(false) }}
                style={{
                  width: '100%', padding: '10px 14px', border: 'none',
                  borderBottom: i === 0 ? '1px solid var(--border-subtle)' : 'none',
                  backgroundColor: active ? 'rgba(26,111,232,0.06)' : 'transparent',
                  color: active ? 'var(--blue)' : 'var(--text-primary)', fontSize: 13,
                  fontWeight: active ? 700 : 500, fontFamily: 'inherit', cursor: 'pointer',
                  textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8,
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--surface-min)' }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
              >
                {active && (
                  <svg width="13" height="13" fill="none" stroke="#1A6FE8" strokeWidth="2.5" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                <span style={{ marginLeft: active ? 0 : 21 }}>{m ? monthLabelFromYM(m) : allLabel}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
