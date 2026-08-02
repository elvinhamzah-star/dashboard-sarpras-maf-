import { useEffect, useRef, useState } from 'react'

/**
 * Mobile top-bar account menu (avatar + dropdown).
 *
 * Replaces the old hamburger drawer for account/admin actions once page
 * navigation moved to the bottom nav. Holds: Riwayat Laporan (admin, non-MAF),
 * Maintenance toggle (admin), Admin login/logout (non-MAF), and Keluar.
 * Closes on outside click or Escape.
 */

interface MobileAccountMenuProps {
  isAdmin: boolean
  role: 'pbb' | 'maf' | null
  isMaintenance: boolean
  togglingMaintenance: boolean
  onRiwayat: () => void
  onShowPinModal: () => void
  onShowChangePinModal: () => void
  onBackupDatabase: () => void
  backingUp: boolean
  onLogoutAdmin: () => void
  onLogoutDashboard: () => void
  onToggleMaintenance?: () => void
  onPresentasi?: () => void
}

export default function MobileAccountMenu({
  isAdmin,
  role,
  isMaintenance,
  togglingMaintenance,
  onRiwayat,
  onShowPinModal,
  onShowChangePinModal,
  onBackupDatabase,
  backingUp,
  onLogoutAdmin,
  onLogoutDashboard,
  onToggleMaintenance,
  onPresentasi: _onPresentasi,
}: MobileAccountMenuProps) {
  const [open, setOpen] = useState(false)
  const [showAdminTools, setShowAdminTools] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const close = () => setOpen(false)
  const run = (fn: () => void) => () => { fn(); close() }

  const item = (
    key: string,
    label: string,
    icon: JSX.Element,
    onClick: () => void,
    opts?: { danger?: boolean; badge?: string; disabled?: boolean },
  ) => (
    <button
      key={key}
      onClick={opts?.disabled ? undefined : onClick}
      disabled={opts?.disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        width: '100%',
        padding: '10px 11px',
        borderRadius: 9,
        border: 'none',
        background: 'none',
        cursor: opts?.disabled ? 'default' : 'pointer',
        fontFamily: 'inherit',
        fontSize: 13,
        fontWeight: 600,
        color: opts?.danger ? '#dc2626' : 'var(--text-secondary)',
        opacity: opts?.disabled ? 0.5 : 1,
        transition: 'background-color 0.15s',
        textAlign: 'left',
      }}
      onMouseEnter={e => { if (!opts?.disabled) e.currentTarget.style.backgroundColor = 'var(--surface-raised)' }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
    >
      <span style={{ display: 'flex', flexShrink: 0, color: opts?.danger ? '#dc2626' : 'var(--text-muted)' }}>{icon}</span>
      {label}
      {opts?.badge && (
        <span style={{ marginLeft: 'auto', fontSize: 8.5, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--blue)', backgroundColor: 'var(--blue-light)', padding: '2px 7px', borderRadius: 99 }}>
          {opts.badge}
        </span>
      )}
    </button>
  )

  return (
    <div ref={rootRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Menu akun"
        aria-expanded={open}
        style={{
          position: 'relative',
          width: 30,
          height: 30,
          borderRadius: '50%',
          border: 'none',
          background: 'none',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: 'none',
          padding: 0,
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
      >
        <svg width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        {isAdmin && (
          <span style={{ position: 'absolute', top: -1, right: -1, width: 9, height: 9, borderRadius: '50%', backgroundColor: '#16a34a', border: '2px solid var(--bg-glass)' }} />
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 46,
            right: 0,
            width: 218,
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 14,
            boxShadow: '0 12px 34px rgba(15,28,46,0.18)',
            padding: 6,
            zIndex: 50,
            animation: 'menuPop 0.16s ease',
          }}
        >
          {isAdmin && role !== 'maf' && item(
            'riwayat', 'Laporan Progress',
            <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 8v4l3 3" /><path d="M3.05 11a9 9 0 1 0 .5-4" /><polyline points="3 3 3 7 7 7" /></svg>,
            run(onRiwayat), { badge: 'Admin' },
          )}

          {isAdmin && role !== 'maf' && (
            <>
              <button
                onClick={() => setShowAdminTools(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 11, width: '100%',
                  padding: '10px 11px', borderRadius: 9, border: 'none',
                  background: showAdminTools ? 'var(--surface-raised)' : 'none',
                  cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                  color: 'var(--text-secondary)', transition: 'background-color 0.15s', textAlign: 'left',
                }}
              >
                <span style={{ display: 'flex', flexShrink: 0, color: 'var(--text-muted)' }}>
                  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                </span>
                Alat Admin
                <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"
                  style={{ marginLeft: 'auto', flexShrink: 0, transform: showAdminTools ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.18s' }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {showAdminTools && (
                <div style={{ paddingLeft: 8, borderLeft: '2px solid var(--border-subtle)', marginLeft: 11 }}>
                  {onToggleMaintenance && item(
                    'maintenance', isMaintenance ? 'Nonaktifkan Maintenance' : 'Mode Maintenance',
                    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2-2 2.5-2.5z" /></svg>,
                    run(onToggleMaintenance), { disabled: togglingMaintenance },
                  )}
                  {item(
                    'change-pin', 'Ganti PIN',
                    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /><circle cx="12" cy="16.5" r="1.2" /></svg>,
                    run(onShowChangePinModal),
                  )}
                  {item(
                    'backup', backingUp ? 'Menyiapkan Backup...' : 'Backup Database',
                    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
                    run(onBackupDatabase), { disabled: backingUp },
                  )}
                </div>
              )}
            </>
          )}

          {role !== 'maf' && (isAdmin
            ? item('admin-out', 'Keluar Mode Admin',
                <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg>,
                run(onLogoutAdmin))
            : item('admin-in', 'Masuk Mode Admin',
                <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
                run(onShowPinModal))
          )}

          <div style={{ height: 1, backgroundColor: 'var(--border-subtle)', margin: '5px 8px' }} />

          {item('logout', 'Keluar',
            <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
            run(onLogoutDashboard), { danger: true })}
        </div>
      )}
    </div>
  )
}
