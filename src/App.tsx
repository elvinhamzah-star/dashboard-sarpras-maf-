import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Beranda from './components/Beranda'
import Pekerjaan from './components/Pekerjaan'
import PekerjaanDetail from './components/PekerjaanDetail'
import Keuangan from './components/Keuangan'
import Galeri from './components/Galeri'
import PinModal from './components/PinModal'
import AddPekerjaanModal from './components/AddPekerjaanModal'
import { clearAdminPin } from './lib/adminApi'

type Page = 'beranda' | 'pekerjaan' | 'keuangan' | 'galeri'

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('beranda')
  const [isAdmin, setIsAdmin] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addModalKey, setAddModalKey] = useState(0)

  // Responsive: collapse to off-canvas drawer on small screens
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const update = () => {
      setIsMobile(mq.matches)
      setSidebarOpen(!mq.matches)
    }
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const handleNavigate = (page: string) => {
    setCurrentPage(page as Page)
    setSelectedProgramId(null)
    if (isMobile) setSidebarOpen(false)
  }

  const handleSelectProgram = (id: string) => {
    setSelectedProgramId(id)
  }

  const handleAddPekerjaan = () => {
    setShowAddModal(true)
    setAddModalKey(k => k + 1)
  }

  const handleAdded = () => {
    setShowAddModal(false)
  }

  const sidebarWidth = isMobile ? 0 : sidebarOpen ? 248 : 68

  const renderPage = () => {
    if (currentPage === 'pekerjaan' && selectedProgramId) {
      return (
        <PekerjaanDetail
          programId={selectedProgramId}
          isAdmin={isAdmin}
          onBack={() => setSelectedProgramId(null)}
        />
      )
    }

    switch (currentPage) {
      case 'beranda':
        return <Beranda isAdmin={isAdmin} />
      case 'pekerjaan':
        return (
          <Pekerjaan
            isAdmin={isAdmin}
            onSelectProgram={handleSelectProgram}
            onAddPekerjaan={handleAddPekerjaan}
          />
        )
      case 'keuangan':
        return <Keuangan isAdmin={isAdmin} />
      case 'galeri':
        return <Galeri isAdmin={isAdmin} />
      default:
        return <Beranda isAdmin={isAdmin} />
    }
  }

  const pageTitles: Record<Page, string> = {
    beranda: 'Beranda',
    pekerjaan: 'Pekerjaan',
    keuangan: 'Keuangan',
    galeri: 'Galeri',
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F1F4F9' }}>
      {/* Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        isOpen={isMobile ? sidebarOpen : sidebarOpen}
        isMobile={isMobile}
        onToggle={() => setSidebarOpen(o => !o)}
        isAdmin={isAdmin}
        onLogout={() => { clearAdminPin(); setIsAdmin(false) }}
        onShowPinModal={() => setShowPinModal(true)}
      />

      {/* Mobile backdrop */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(10,22,40,0.5)',
            backdropFilter: 'blur(2px)',
            zIndex: 39,
            transition: 'opacity 0.2s ease',
          }}
        />
      )}

      {/* Main content */}
      <div
        style={{
          marginLeft: sidebarWidth,
          flex: 1,
          minWidth: 0,
          minHeight: '100vh',
          transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Mobile top bar */}
        {isMobile && (
          <header
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 30,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              backgroundColor: 'rgba(255,255,255,0.85)',
              backdropFilter: 'saturate(180%) blur(12px)',
              borderBottom: '1px solid rgba(15,23,42,0.07)',
            }}
          >
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Buka menu"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 38,
                height: 38,
                borderRadius: 10,
                border: '1px solid rgba(15,23,42,0.08)',
                backgroundColor: '#fff',
                cursor: 'pointer',
                color: '#0F1C2E',
                flexShrink: 0,
              }}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
              <img src="/LogoPBB.svg" alt="Logo" style={{ height: 38, width: 'auto', flexShrink: 0, filter: 'grayscale(1) brightness(0) contrast(1)', mixBlendMode: 'multiply' }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: '#0F1C2E', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {pageTitles[currentPage]}
              </span>
            </div>
            <div style={{ flex: 1 }} />
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                backgroundColor: isAdmin ? 'rgba(26,111,232,0.1)' : 'rgba(15,23,42,0.05)',
                color: isAdmin ? '#1A6FE8' : '#9CAABB',
                fontSize: 10.5,
                fontWeight: 700,
                padding: '4px 9px',
                borderRadius: 20,
                flexShrink: 0,
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: isAdmin ? '#1A6FE8' : '#9CAABB' }} />
              {isAdmin ? 'Admin' : 'Viewer'}
            </span>
          </header>
        )}

        {/* Page content */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {renderPage()}
        </div>
      </div>

      {/* Mobile FAB for admin access */}
      {isMobile && !isAdmin && !showPinModal && !showAddModal && (
        <button
          onClick={() => setShowPinModal(true)}
          aria-label="Masuk Mode Admin"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 20,
            width: 48,
            height: 48,
            borderRadius: 14,
            border: 'none',
            backgroundColor: '#1A6FE8',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(26,111,232,0.4), 0 1px 3px rgba(0,0,0,0.1)',
            zIndex: 35,
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
        </button>
      )}

      {/* Modals */}
      {showPinModal && (
        <PinModal
          onSuccess={() => {
            setIsAdmin(true)
            setShowPinModal(false)
          }}
          onClose={() => setShowPinModal(false)}
        />
      )}

      {showAddModal && (
        <AddPekerjaanModal
          key={addModalKey}
          onClose={() => setShowAddModal(false)}
          onAdded={handleAdded}
        />
      )}
    </div>
  )
}
