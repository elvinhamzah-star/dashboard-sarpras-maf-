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
}: Props) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const wrapRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const reposition = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const panelHeight = Math.min(240, options.length * 38 + 12)
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

  const selected = options.find(o => o.value === value)

  return (
    <div ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => { if (disabled) return; if (open) setOpen(false); else { reposition(); setOpen(true) } }}
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
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {options.map((o, i) => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false) }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: 'none',
                  borderBottom: i < options.length - 1 ? '1px solid var(--surface-min)' : 'none',
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
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
