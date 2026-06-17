interface SidebarProps {
  currentPage: string
  onNavigate: (page: string) => void
  isOpen: boolean
  isMobile?: boolean
  onToggle: () => void
  isAdmin: boolean
  onLogout: () => void
  onShowPinModal: () => void
  onLogoutDashboard: () => void
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
    id: 'galeri',
    label: 'Galeri',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <path d="M21 15l-5-5L5 21"/>
      </svg>
    ),
  },
  {
    id: 'laporan',
    label: 'Laporan',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
  },
]

export default function Sidebar({ currentPage, onNavigate, isOpen, isMobile = false, onToggle, isAdmin, onLogout, onShowPinModal, onLogoutDashboard }: SidebarProps) {
  const expanded = isMobile ? true : isOpen
  return (
    <div
      style={{
        width: isMobile ? 270 : isOpen ? 248 : 68,
        minHeight: '100vh',
        height: '100%',
        backgroundColor: '#0A1628',
        transition: isMobile
          ? 'transform 0.28s cubic-bezier(0.4,0,0.2,1)'
          : 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
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
          gap: 10,
          cursor: isMobile ? 'default' : 'pointer',
          justifyContent: expanded ? 'flex-start' : 'center',
          flexShrink: 0,
          minHeight: 68,
        }}
      >
        <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 9, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src="/LogoPBB.svg"
            alt="Logo PBB"
            style={{ width: 36, height: 36, objectFit: 'cover', display: 'block' }}
          />
        </div>
        {expanded && (
          <div style={{ overflow: 'hidden', minWidth: 0 }}>
            <div style={{ color: '#F1F5F9', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
              Peradaban Baik Bahagia
            </div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, whiteSpace: 'nowrap', marginTop: 1 }}>
              Sarpras MAF
            </div>
          </div>
        )}
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
      <nav style={{ flex: 1, padding: '6px 8px', overflowY: 'auto' }}>
        {menuItems.map(item => {
          const isActive = currentPage === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: expanded ? '9px 10px' : '9px',
                justifyContent: expanded ? 'flex-start' : 'center',
                borderRadius: 9,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: isActive ? 'rgba(26,111,232,0.18)' : 'transparent',
                color: isActive ? '#60A5FA' : 'rgba(255,255,255,0.45)',
                marginBottom: 2,
                transition: 'all 0.15s ease',
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
              {expanded && (
                <span style={{ fontSize: 13.5, fontWeight: isActive ? 600 : 450, letterSpacing: '-0.01em' }}>
                  {item.label}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div style={{ padding: '10px 8px 16px', flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        {expanded ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 6px', marginBottom: 4 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  backgroundColor: isAdmin ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.06)',
                  color: isAdmin ? '#60A5FA' : 'rgba(255,255,255,0.4)',
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 20,
                  letterSpacing: '0.01em',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: isAdmin ? '#60A5FA' : 'rgba(255,255,255,0.3)', display: 'inline-block' }} />
                {isAdmin ? 'Mode Admin' : 'Mode Viewer'}
              </div>
              {!isAdmin && (
                <button
                  onClick={onShowPinModal}
                  title="Masuk Mode Admin"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    backgroundColor: 'rgba(26,111,232,0.15)',
                    border: '1px solid rgba(26,111,232,0.2)',
                    cursor: 'pointer',
                    color: '#60A5FA',
                    padding: 0,
                    flexShrink: 0,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(26,111,232,0.25)'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(26,111,232,0.15)'
                  }}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                </button>
              )}
            </div>
            {isAdmin && (
              <button
                onClick={onLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  color: 'rgba(248,113,113,0.7)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 500,
                  padding: '6px 6px',
                  borderRadius: 7,
                  width: '100%',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(248,113,113,0.08)'
                  ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(248,113,113,1)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
                  ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(248,113,113,0.7)'
                }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Keluar Mode Admin
              </button>
            )}
            <div style={{ color: 'rgba(255,255,255,0.18)', fontSize: 10, padding: '6px 6px 0', letterSpacing: '0.02em' }}>
              Dashboard Sarpras MAF v2
            </div>
            <button
              onClick={onLogoutDashboard}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                color: 'rgba(255,255,255,0.25)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 11.5,
                fontWeight: 500,
                padding: '5px 6px',
                borderRadius: 7,
                width: '100%',
                marginTop: 4,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(248,113,113,0.08)'
                ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(248,113,113,0.9)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
                ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.25)'
              }}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Keluar
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
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
