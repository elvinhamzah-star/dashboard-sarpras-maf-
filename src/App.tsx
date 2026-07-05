import { useState, useEffect, useRef } from 'react'
import Sidebar from './components/Sidebar'
import Beranda from './components/Beranda'
import Pekerjaan from './components/Pekerjaan'
import PekerjaanDetail from './components/PekerjaanDetail'
import Keuangan from './components/Keuangan'
import Galeri from './components/Galeri'
import Dokumen from './components/Dokumen'
import type { DocCategory } from './lib/supabase'
import RiwayatLaporan from './components/RiwayatLaporan'
import LaporanBulanan from './components/LaporanBulanan'
import PinModal from './components/PinModal'
import LoginPage from './components/LoginPage'
import AddPekerjaanModal from './components/AddPekerjaanModal'
import { clearAdminPin } from './lib/adminApi'
import { clearMafCredentials } from './lib/supabase'

type Page = 'beranda' | 'pekerjaan' | 'keuangan' | 'dokumen' | 'galeri' | 'riwayat' | 'laporan'

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => sessionStorage.getItem('dashboard_auth') === '1')
  const [role, setRole] = useState<'pbb' | 'maf' | null>(
    () => (sessionStorage.getItem('dashboard_role') as 'pbb' | 'maf' | null) ?? null,
  )
  const [currentPage, setCurrentPage] = useState<Page>('beranda')
  const [isAdmin, setIsAdmin] = useState(false)
  const edgeSwipeStartX = useRef<number | null>(null)
  const edgeSwipeStartY = useRef<number | null>(null)
  const [showPinModal, setShowPinModal] = useState(false)
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addModalKey, setAddModalKey] = useState(0)
  // Shared month filter ('YYYY-MM' or null for all). Used across pages.
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  // Pekerjaan filter state — persisted across detail navigation
  const [pekerjaanStatus, setPekerjaanStatus] = useState('Semua')
  const [pekerjaanSearch, setPekerjaanSearch] = useState('')
  // Deep link state for Dokumen and Galeri pages (set by PekerjaanDetail onNavigate)
  const [dokumenProgramId, setDokumenProgramId] = useState<string | null>(null)
  const [dokumenCategory, setDokumenCategory] = useState<DocCategory | null>(null)
  const [galeriProgramId, setGaleriProgramId] = useState<string | null>(null)
  const [berandaReturnDetailId, setBerandaReturnDetailId] = useState<string | null>(null)

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
    setDokumenProgramId(null)
    setDokumenCategory(null)
    setGaleriProgramId(null)
    if (page !== 'beranda') setBerandaReturnDetailId(null)
    if (isMobile) setSidebarOpen(false)
  }

  const handleSelectProgram = (id: string) => {
    if (role === 'maf' && id === 'P-024') return
    setSelectedProgramId(id)
  }

  const handleAddPekerjaan = () => {
    setShowAddModal(true)
    setAddModalKey(k => k + 1)
  }

  const handleAdded = () => {
    setShowAddModal(false)
  }

  const handleLogoutDashboard = () => {
    sessionStorage.removeItem('dashboard_auth')
    sessionStorage.removeItem('dashboard_role')
    clearAdminPin()
    clearMafCredentials()
    setIsAdmin(false)
    setIsLoggedIn(false)
    setRole(null)
  }

  const sidebarWidth = isMobile ? 0 : sidebarOpen ? 248 : 68

  const renderPage = () => {
    if (currentPage === 'pekerjaan' && selectedProgramId) {
      return (
        <PekerjaanDetail
          programId={selectedProgramId}
          isAdmin={isAdmin}
          onBack={() => setSelectedProgramId(null)}
          onNavigate={(page, pid, cat) => {
            setSelectedProgramId(null)
            setCurrentPage(page as Page)
            if (page === 'dokumen') {
              setDokumenProgramId(pid ?? null)
              setDokumenCategory((cat as DocCategory) ?? null)
            } else if (page === 'galeri') {
              setGaleriProgramId(pid ?? null)
            }
          }}
        />
      )
    }

    switch (currentPage) {
      case 'beranda':
        return <Beranda isAdmin={isAdmin} role={role} initialDetailId={berandaReturnDetailId} onInitialDetailConsumed={() => setBerandaReturnDetailId(null)} onNavigate={(page, pid, cat) => {
          setCurrentPage(page as Page)
          if (page === 'dokumen') { setDokumenProgramId(pid ?? null); setDokumenCategory((cat as DocCategory) ?? null) }
          if (page === 'galeri') { setGaleriProgramId(pid ?? null); setBerandaReturnDetailId(pid ?? null) }
        }} />
      case 'pekerjaan':
        return (
          <Pekerjaan
            isAdmin={isAdmin}
            onSelectProgram={handleSelectProgram}
            onAddPekerjaan={handleAddPekerjaan}
            activeStatus={pekerjaanStatus}
            onStatusChange={setPekerjaanStatus}
            search={pekerjaanSearch}
            onSearchChange={setPekerjaanSearch}
          />
        )
      case 'keuangan':
        return <Keuangan isAdmin={isAdmin} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} role={role} />
      case 'dokumen':
        return <Dokumen isAdmin={isAdmin} role={role} initialProgramId={dokumenProgramId} initialCategory={dokumenCategory} />
      case 'galeri':
        return <Galeri isAdmin={isAdmin} initialProgramId={galeriProgramId} />
      case 'riwayat':
        return role === 'maf' ? <Beranda isAdmin={isAdmin} role={role} /> : <RiwayatLaporan />
      case 'laporan':
        return role === 'maf'
          ? <Beranda isAdmin={isAdmin} role={role} />
          : <LaporanBulanan isAdmin={isAdmin} />
      default:
        return <Beranda isAdmin={isAdmin} role={role} />
    }
  }

  const pageTitles: Record<Page, string> = {
    beranda: 'Beranda',
    pekerjaan: 'Pekerjaan',
    keuangan: 'Keuangan',
    dokumen: 'Dokumen',
    galeri: 'Galeri Dokumentasi',
    riwayat: 'Riwayat Laporan',
    laporan: 'Laporan Bulanan',
  }

  if (!isLoggedIn) {
    return (
      <LoginPage
        onLogin={resolvedRole => {
          setRole(resolvedRole)
          setIsLoggedIn(true)
        }}
      />
    )
  }

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', backgroundColor: 'var(--bg)', transition: 'background-color 0.2s ease' }}>
      {/* Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        isOpen={isMobile ? sidebarOpen : sidebarOpen}
        isMobile={isMobile}
        onToggle={() => setSidebarOpen(o => !o)}
        isAdmin={isAdmin}
        role={role}
        onLogout={() => { clearAdminPin(); setIsAdmin(false) }}
        onLogoutDashboard={handleLogoutDashboard}
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
          height: '100dvh',
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
              backgroundColor: 'var(--bg-glass)',
              backdropFilter: 'saturate(150%) blur(16px)',
              borderBottom: '1px solid var(--border)',
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
                border: '1px solid var(--border)',
                backgroundColor: 'var(--card)',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                flexShrink: 0,
              }}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {pageTitles[currentPage]}
            </span>
            <div style={{ flex: 1 }} />
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                backgroundColor: isAdmin ? 'rgba(26,111,232,0.1)' : 'rgba(15,23,42,0.05)',
                color: isAdmin ? 'var(--blue)' : '#9CAABB',
                fontSize: 10.5,
                fontWeight: 700,
                padding: '4px 9px',
                borderRadius: 20,
                flexShrink: 0,
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: isAdmin ? 'var(--blue)' : '#9CAABB' }} />
              {role === 'maf' ? 'MAF' : isAdmin ? 'Admin' : 'Viewer'}
            </span>
            <button
              onClick={handleLogoutDashboard}
              title="Keluar"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 34,
                height: 34,
                borderRadius: 9,
                border: '1px solid var(--border)',
                backgroundColor: 'var(--card)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </header>
        )}

        {/* Page content */}
        <div
          style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}
          onTouchStart={e => {
            if (e.touches[0].clientX < 28) {
              edgeSwipeStartX.current = e.touches[0].clientX
              edgeSwipeStartY.current = e.touches[0].clientY
            }
          }}
          onTouchEnd={e => {
            if (edgeSwipeStartX.current === null) return
            const dx = e.changedTouches[0].clientX - edgeSwipeStartX.current
            const dy = Math.abs(e.changedTouches[0].clientY - (edgeSwipeStartY.current || 0))
            if (dx > 72 && dy < 80) {
              if (currentPage === 'pekerjaan' && selectedProgramId) setSelectedProgramId(null)
            }
            edgeSwipeStartX.current = null
            edgeSwipeStartY.current = null
          }}
        >
          <div
            key={currentPage + (selectedProgramId || '')}
            style={{ animation: 'pageSlideIn 0.22s cubic-bezier(0.4,0,0.2,1)', minHeight: '100%' }}
          >
            {renderPage()}
          </div>
        </div>
      </div>

      {/* Mobile FAB for admin access */}
      {isMobile && !isAdmin && role !== 'maf' && !showPinModal && !showAddModal && (
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
            backgroundColor: 'var(--blue)',
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
