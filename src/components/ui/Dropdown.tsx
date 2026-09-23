import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export interface DropdownOption {
  value: string
  label: string
}

interface Props {
  value: string
  options: DropdownOption[]
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
  /** Match the trigger font-size to surrounding inputs (default 14). */
  fontSize?: number
  /** z-index for the portaled panel (default 600; raise inside high-z modals). */
  zIndex?: number
  /** Show a search box in the panel to filter long option lists (e.g. 25+ programs). */
  searchable?: boolean
  /** Placeholder for the search box (default "Cari..."). */
  searchPlaceholder?: string
}

/**
 * Shared custom dropdown — trigger + panel portaled to <body>, styled to the
 * app theme. Replaces native <select> everywhere so the option list never falls
 * back to the OS menu (which looks foreign, e.g. the dark macOS combobox).
 *
 * Value/onChange mirror a controlled <select>: `value` is the option value,
 * `onChange` fires with the chosen value.
 */
export default function Dropdown({
  value,
  options,
  onChange,
  placeholder = 'Pilih...',
  disabled = false,
  fontSize = 14,
  zIndex = 600,
  searchable = false,
  searchPlaceholder = 'Cari...',
}: Props) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const [search, setSearch] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const filteredOptions = searchable && search.trim()
    ? options.filter(o => o.label.toLowerCase().includes(search.trim().toLowerCase()))
    : options

  const reposition = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const searchBarHeight = searchable ? 50 : 0
    const panelHeight = Math.min(240, filteredOptions.length * 38 + 12) + searchBarHeight
    const fitsBelow = rect.bottom + 6 + panelHeight < window.innerHeight
    setPos({
      top: fitsBelow ? rect.bottom + 6 : Math.max(8, rect.top - panelHeight - 6),
      left: rect.left,
      width: rect.width,
    })
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node) && !panelRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    // Reposition on scroll/resize so the fixed panel stays glued to the trigger.
    const onScrollResize = () => reposition()
    document.addEventListener('mousedown', onDown)
    window.addEventListener('resize', onScrollResize)
    document.addEventListener('scroll', onScrollResize, { capture: true, passive: true })
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('resize', onScrollResize)
      document.removeEventListener('scroll', onScrollResize, { capture: true } as EventListenerOptions)
    }
  }, [open])

  useEffect(() => {
    if (open && searchable) setTimeout(() => searchRef.current?.focus({ preventScroll: true }), 50)
  }, [open, searchable])

  const selected = options.find(o => o.value === value)

  return (
    <div ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => { if (disabled) return; if (open) { setOpen(false); setSearch('') } else { reposition(); setOpen(true) } }}
        style={{
          width: '100%',
          padding: '10px 14px',
          borderRadius: 10,
          border: `1px solid ${open ? 'var(--blue)' : 'var(--border)'}`,
          backgroundColor: disabled ? 'var(--surface-subtle)' : 'var(--bg)',
          fontSize,
          color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
          fontFamily: 'inherit',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
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
          {selected?.label ?? placeholder}
        </span>
        <svg
          width="14" height="14" fill="none" stroke="#9CAABB" strokeWidth="2.5" viewBox="0 0 24 24"
          style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: pos.width,
            zIndex,
            backgroundColor: 'var(--card)',
            borderRadius: 12,
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 8px 32px rgba(13,24,41,0.14)',
            overflow: 'hidden',
          }}
        >
          {searchable && (
            <div style={{ padding: '10px 10px 6px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ position: 'relative' }}>
                <svg
                  width="13" height="13" fill="none" stroke="#9CAABB" strokeWidth="2" viewBox="0 0 24 24"
                  style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                >
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  style={{
                    width: '100%',
                    padding: '8px 10px 8px 30px',
                    borderRadius: 8,
                    border: '1px solid var(--border-subtle)',
                    fontSize: 14,
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                    backgroundColor: 'var(--surface-raised)',
                  }}
                />
              </div>
            </div>
          )}
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '16px 14px', fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center' }}>
                Tidak ada hasil
              </div>
            ) : filteredOptions.map((o, i) => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); setSearch('') }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: 'none',
                  borderBottom: i < filteredOptions.length - 1 ? '1px solid var(--surface-min)' : 'none',
                  backgroundColor: o.value === value ? 'rgba(26,111,232,0.06)' : 'transparent',
                  color: o.value === value ? 'var(--blue)' : 'var(--text-primary)',
                  fontSize: 13,
                  fontWeight: o.value === value ? 600 : 400,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
                onMouseEnter={e => { if (o.value !== value) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--surface-min)' }}
                onMouseLeave={e => { if (o.value !== value) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
              >
                {o.value === value && (
                  <svg width="13" height="13" fill="none" stroke="#1A6FE8" strokeWidth="2.5" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                <span title={o.label} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
