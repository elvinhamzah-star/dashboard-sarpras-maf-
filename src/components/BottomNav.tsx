/**
 * Mobile bottom navigation bar (Instagram / WhatsApp style).
 *
 * Rendered only on mobile, as a flex child below the scrolling content column,
 * so it never overlaps content and the scroll area shrinks to fit automatically.
 * "Pill" variant: the active tab's icon sits inside a soft blue capsule, with a
 * blue + bold label. Bottom padding respects the iPhone home-indicator safe area.
 */

type Tab = { id: string; label: string; icon: JSX.Element }

const ICON_LAPORAN_ASET = (
  <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3h18v4H3z" /><path d="M3 10h18v4H3z" /><path d="M3 17h18v4H3z" />
  </svg>
)

// Sarpras: Beranda, Pekerjaan, Galeri, Keuangan, Laporan Aset (Dokumen via PekerjaanDetail)
const TABS_SARPRAS: Tab[] = [
  {
    id: 'beranda',
    label: 'Beranda',
    icon: (
      <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    id: 'pekerjaan',
    label: 'Pekerjaan',
    icon: (
      <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="9" y1="16" x2="13" y2="16" />
      </svg>
    ),
  },
  {
    id: 'galeri',
    label: 'Galeri',
    icon: (
      <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    ),
  },
  {
    id: 'keuangan',
    label: 'Keuangan',
    icon: (
      <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12V8H6a2 2 0 0 1 0-4h12v4" />
        <path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
        <circle cx="16" cy="14" r="1.4" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  { id: 'laporan-aset', label: 'Laporan', icon: ICON_LAPORAN_ASET },
]

interface BottomNavProps {
  currentPage: string
  onNavigate: (page: string) => void
}

export default function BottomNav({ currentPage, onNavigate }: BottomNavProps) {
  const visibleTabs = TABS_SARPRAS
  return (
    <nav
      style={{
        flexShrink: 0,
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        backgroundColor: 'var(--card)',
        borderTop: '1px solid var(--border-subtle)',
        boxShadow: '0 -4px 20px rgba(15,28,46,0.05)',
        padding: '8px 6px calc(8px + env(safe-area-inset-bottom))',
        zIndex: 30,
      }}
    >
      {visibleTabs.map(tab => {
        const active = currentPage === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            aria-label={tab.label}
            aria-current={active ? 'page' : undefined}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              padding: '4px 2px 2px',
              cursor: 'pointer',
              color: active ? 'var(--blue)' : 'var(--text-muted)',
              fontFamily: 'inherit',
              transition: 'color 0.18s',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 56,
                height: 30,
                borderRadius: 99,
                backgroundColor: active ? 'var(--blue-light)' : 'transparent',
                transition: 'background-color 0.2s',
              }}
            >
              {tab.icon}
            </span>
            <span
              style={{
                fontSize: 9.5,
                fontWeight: active ? 800 : 600,
                letterSpacing: '0.01em',
                transition: 'font-weight 0.18s',
              }}
            >
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
