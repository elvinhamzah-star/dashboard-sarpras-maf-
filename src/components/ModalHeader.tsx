import { ReactNode } from 'react'

interface ModalHeaderProps {
  title: string
  subtitle?: ReactNode
  onClose: () => void
  /** Icon chip shown before the title (e.g. MetricDetailModal's metric icon). */
  icon?: ReactNode
  iconBg?: string
  iconColor?: string
  /** Extra content between the title block and the close button — e.g. an
   *  accent-colored total value (MetricDetailModal). */
  right?: ReactNode
  isMobile?: boolean
  padding?: string
}

/**
 * Shared modal header: title/subtitle on the left, optional icon before it
 * and optional extra content before the close button, close button always
 * on the far right — the single layout every modal header should use.
 */
export default function ModalHeader({ title, subtitle, onClose, icon, iconBg, iconColor, right, isMobile, padding }: ModalHeaderProps) {
  return (
    <div style={{
      padding: padding ?? (isMobile ? '14px 16px' : '18px 20px'),
      borderBottom: '1px solid var(--border-subtle)',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      {icon && (
        <div style={{
          width: isMobile ? 36 : 40, height: isMobile ? 36 : 40, borderRadius: 10,
          backgroundColor: iconBg ?? 'var(--surface-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: iconColor ?? 'var(--text-secondary)', flexShrink: 0,
        }}>
          {icon}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: isMobile ? 11 : 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {subtitle}
          </div>
        )}
      </div>
      {right}
      <button
        onClick={onClose}
        style={{
          width: 40, height: 40, borderRadius: 10,
          border: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-subtle)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-secondary)', flexShrink: 0,
        }}
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  )
}
