interface SidebarProps {
  currentPage: string
  onNavigate: (page: string) => void
  isOpen: boolean
  isMobile?: boolean
  onToggle: () => void
  isAdmin: boolean
  role: 'pbb' | 'maf' | null
  onLogout: () => void
  onShowPinModal: () => void
  onLogoutDashboard: () => void
  isMaintenance?: boolean
  onToggleMaintenance?: () => void
  togglingMaintenance?: boolean
  onPresentasi?: () => void
}

const menuItems = [
  {
    id: 'beranda',
    label: 'Beranda',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
        <path d="M9 21V12h6v9"/>
      </svg>
    ),
  },
  {
    id: 'pekerjaan',
    label: 'Pekerjaan',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
        <rect x="9" y="3" width="6" height="4" rx="1"/>
        <line x1="9" y1="12" x2="15" y2="12"/>
        <line x1="9" y1="16" x2="13" y2="16"/>
      </svg>
    ),
  },
  {
    id: 'dokumen',
    label: 'Dokumen',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    id: 'galeri',
    label: 'Galeri Dokumentasi',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <path d="M21 15l-5-5L5 21"/>
      </svg>
    ),
  },
  {
    id: 'keuangan',
    label: 'Keuangan',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
    ),
  },
  {
    id: 'laporan-aset',
    label: 'Laporan Aset',
    adminOnly: false,
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <line x1="3" y1="9" x2="21" y2="9"/>
        <line x1="3" y1="15" x2="21" y2="15"/>
        <line x1="9" y1="9" x2="9" y2="21"/>
      </svg>
    ),
  },
  {
    id: 'riwayat',
    label: 'Riwayat Laporan',
    adminOnly: true,
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path d="M12 8v4l3 3"/>
        <path d="M3.05 11a9 9 0 1 0 .5-4"/>
        <polyline points="3 3 3 7 7 7"/>
      </svg>
    ),
  },
]

export default function Sidebar({ currentPage, onNavigate, isOpen, isMobile = false, onToggle, isAdmin, role, onLogout, onShowPinModal, onLogoutDashboard, isMaintenance = false, onToggleMaintenance, togglingMaintenance = false }: SidebarProps) {
  const expanded = isMobile ? true : isOpen

  // Tombol maintenance — tampil hanya kalau admin, dipakai di 3 layout variant
  const maintenanceBtn = isAdmin && onToggleMaintenance ? (
    <button
      onClick={onToggleMaintenance}
      disabled={togglingMaintenance}
      title={isMaintenance ? 'Nonaktifkan Maintenance' : 'Aktifkan Maintenance Mode'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        color: isMaintenance ? '#D97706' : 'rgba(255,255,255,0.45)',
        backgroundColor: isMaintenance ? 'rgba(217,119,6,0.14)' : 'transparent',
        border: `1px solid ${isMaintenance ? 'rgba(217,119,6,0.3)' : 'rgba(255,255,255,0.08)'}`,
        cursor: togglingMaintenance ? 'wait' : 'pointer',
        fontSize: 13,
        fontWeight: 600,
        padding: '10px 12px',
        borderRadius: 9,
        width: '100%',
        marginBottom: 8,
        transition: 'all 0.15s',
        opacity: togglingMaintenance ? 0.6 : 1,
      }}
    >
      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
      {isMaintenance ? 'Nonaktifkan Maintenance' : 'Maintenance Mode'}
      {isMaintenance && (
        <span style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', backgroundColor: '#D97706', flexShrink: 0 }} />
      )}
    </button>
  ) : null

  // Ikon kecil untuk mode collapsed
  const maintenanceBtnCollapsed = isAdmin && onToggleMaintenance ? (
    <button
      onClick={onToggleMaintenance}
      disabled={togglingMaintenance}
      title={isMaintenance ? 'Nonaktifkan Maintenance' : 'Aktifkan Maintenance Mode'}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 34,
        height: 34,
        borderRadius: 8,
        backgroundColor: isMaintenance ? 'rgba(217,119,6,0.14)' : 'transparent',
        border: `1px solid ${isMaintenance ? 'rgba(217,119,6,0.3)' : 'rgba(255,255,255,0.08)'}`,
        cursor: togglingMaintenance ? 'wait' : 'pointer',
        color: isMaintenance ? '#D97706' : 'rgba(255,255,255,0.25)',
        padding: 0,
        opacity: togglingMaintenance ? 0.6 : 1,
        transition: 'all 0.15s',
      }}
    >
      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
    </button>
  ) : null
  return (
    <div
      style={{
        width: isMobile ? 270 : isOpen ? 248 : 68,
        minHeight: '100vh',
        height: '100%',
        backgroundColor: '#0A1628',
        transition: isMobile
          ? 'transform 0.34s cubic-bezier(0.32,0.72,0,1)'
          : 'width 0.34s cubic-bezier(0.32,0.72,0,1)',
        transform: isMobile ? `translateX(${isOpen ? '0' : '-100%'})` : 'none',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 41,
        overflow: 'hidden',
        borderRight: '1px solid rgba(255,255,255,0.04)',
        boxShadow: isMobile && isOpen ? '0 0 40px rgba(0,0,0,0.4)' : 'none',
      }}
    >
      {/* Logo area */}
      <div
        onClick={isMobile ? undefined : onToggle}
        style={{
          padding: expanded ? '18px 16px 14px' : '18px 0 14px',
          display: 'flex',
          alignItems: 'center',
          gap: expanded ? 10 : 0,
          cursor: isMobile ? 'default' : 'pointer',
          justifyContent: expanded ? 'flex-start' : 'center',
          flexShrink: 0,
          minHeight: 68,
        }}
      >
        <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 9, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src="/pbb-app-icon-white.svg"
            alt="Logo PBB"
            style={{ width: 36, height: 36, objectFit: 'cover', display: 'block' }}
          />
        </div>
        <div style={{ overflow: 'hidden', minWidth: 0, maxWidth: expanded ? 180 : 0, opacity: expanded ? 1 : 0, transition: 'max-width 0.34s cubic-bezier(0.32,0.72,0,1), opacity 0.34s cubic-bezier(0.32,0.72,0,1)' }}>
          <div style={{ color: '#F1F5F9', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
            Peradaban Baik Bahagia
          </div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, whiteSpace: 'nowrap', marginTop: 1 }}>
            Sarpras MAF
          </div>
        </div>
      </div>

      {isMobile && (
        <button
          onClick={onToggle}
          aria-label="Tutup menu"
          style={{
            position: 'absolute', top: 16, right: 12,
            width: 32, height: 32, borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)',
            backgroundColor: 'rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}

      <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.05)', flexShrink: 0, marginBottom: 6 }} />

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '6px 8px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {menuItems.filter(item => (!item.adminOnly || isAdmin)).map(item => {
          const isActive = currentPage === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              title={!expanded ? item.label : undefined}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: expanded ? 10 : 0,
                padding: expanded ? '9px 10px' : '9px',
                justifyContent: expanded ? 'flex-start' : 'center',
                borderRadius: 9,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: isActive ? 'rgba(26,111,232,0.18)' : 'transparent',
                color: isActive ? '#60A5FA' : 'rgba(255,255,255,0.45)',
                marginBottom: 2,
                transition: 'background-color 0.15s ease, color 0.15s ease, padding 0.34s cubic-bezier(0.32,0.72,0,1), gap 0.34s cubic-bezier(0.32,0.72,0,1)',
                whiteSpace: 'nowrap',
                position: 'relative',
              }}
              onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.06)'
                if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.75)'
              }}
              onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
                if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.45)'
              }}
            >
              {isActive && (
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 3,
                    height: 18,
                    borderRadius: '0 3px 3px 0',
                    backgroundColor: '#60A5FA',
                  }}
                />
              )}
              <span style={{ flexShrink: 0, display: 'flex' }}>{item.icon}</span>
              <span style={{ fontSize: 13.5, fontWeight: isActive ? 600 : 400, letterSpacing: '-0.01em', overflow: 'hidden', maxWidth: expanded ? 170 : 0, opacity: expanded ? 1 : 0, transition: 'max-width 0.34s cubic-bezier(0.32,0.72,0,1), opacity 0.34s cubic-bezier(0.32,0.72,0,1)' }}>
                {item.label}
              </span>
            </button>
          )
        })}
        <div style={{ flex: 1, minHeight: 12 }} />
      </nav>

      {/* Bottom section */}
      <div style={{ padding: '10px 8px 16px', flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        {expanded && isMobile ? (
          <div>
            {maintenanceBtn}
            {role === 'maf' ? null : isAdmin ? (
              <button
                onClick={onLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: '#FCA5A5',
                  backgroundColor: 'rgba(224,62,62,0.16)',
                  border: '1px solid rgba(224,62,62,0.3)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '10px 12px',
                  borderRadius: 9,
                  width: '100%',
                  marginBottom: 8,
                  transition: 'all 0.15s',
                }}
              >
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Keluar Mode Admin
              </button>
            ) : (
              <button
                onClick={onShowPinModal}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: '#93C5FD',
                  backgroundColor: 'rgba(26,111,232,0.14)',
                  border: '1px solid rgba(26,111,232,0.25)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '10px 12px',
                  borderRadius: 9,
                  width: '100%',
                  marginBottom: 8,
                  transition: 'all 0.15s',
                }}
              >
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                Admin
              </button>
            )}
            <button
              onClick={onLogoutDashboard}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#F7A8A8',
                backgroundColor: 'rgba(224,62,62,0.16)',
                border: '1px solid rgba(224,62,62,0.3)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                padding: '10px 12px',
                borderRadius: 9,
                width: '100%',
                transition: 'all 0.15s',
              }}
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Keluar
            </button>
          </div>
        ) : expanded ? (
          <div>
            {maintenanceBtn}
            {role === 'maf' ? null : isAdmin ? (
              <button
                onClick={onLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: '#FCA5A5',
                  backgroundColor: 'rgba(224,62,62,0.16)',
                  border: '1px solid rgba(224,62,62,0.3)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '10px 12px',
                  borderRadius: 9,
                  width: '100%',
                  marginBottom: 8,
                  transition: 'all 0.15s',
                }}
              >
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Keluar Mode Admin
              </button>
            ) : (
              <button
                onClick={onShowPinModal}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: '#93C5FD',
                  backgroundColor: 'rgba(26,111,232,0.14)',
                  border: '1px solid rgba(26,111,232,0.25)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '10px 12px',
                  borderRadius: 9,
                  width: '100%',
                  marginBottom: 8,
                  transition: 'all 0.15s',
                }}
              >
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                Admin
              </button>
            )}
            <button
              onClick={onLogoutDashboard}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#F7A8A8',
                backgroundColor: 'rgba(224,62,62,0.16)',
                border: '1px solid rgba(224,62,62,0.3)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                padding: '10px 12px',
                borderRadius: 9,
                width: '100%',
                transition: 'all 0.15s',
              }}
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Keluar
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            {maintenanceBtnCollapsed}
            {role !== 'maf' && (
              <button
                onClick={isAdmin ? onLogout : onShowPinModal}
                title={isAdmin ? 'Keluar Mode Admin' : 'Masuk Mode Admin'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  backgroundColor: isAdmin ? 'rgba(248,113,113,0.1)' : 'rgba(26,111,232,0.15)',
                  border: `1px solid ${isAdmin ? 'rgba(248,113,113,0.2)' : 'rgba(26,111,232,0.2)'}`,
                  cursor: 'pointer',
                  color: isAdmin ? '#F87171' : '#60A5FA',
                  padding: 0,
                }}
              >
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
              </button>
            )}
            <button
              onClick={onLogoutDashboard}
              title="Keluar Dashboard"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 34,
                height: 34,
                borderRadius: 8,
                backgroundColor: 'transparent',
                border: '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.25)',
                padding: 0,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(248,113,113,0.1)'
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(248,113,113,0.2)'
                ;(e.currentTarget as HTMLButtonElement).style.color = '#F87171'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)'
                ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.25)'
              }}
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
