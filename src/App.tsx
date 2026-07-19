import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import { BackNavContext, TopBarTitleContext, type BackHandler } from './lib/backNav'
import Sidebar from './components/Sidebar'
import BottomNav from './components/BottomNav'
import MobileAccountMenu from './components/MobileAccountMenu'
import Beranda from './components/Beranda'
import Pekerjaan from './components/Pekerjaan'
import PekerjaanDetail from './components/PekerjaanDetail'
import Keuangan from './components/Keuangan'
import Galeri from './components/Galeri'
import Dokumen from './components/Dokumen'
import type { DocCategory } from './lib/supabase'
import RiwayatLaporan from './components/RiwayatLaporan'
import LaporanBulanan from './components/LaporanBulanan'
import LaporanAset from './components/LaporanAset'
import PinModal from './components/PinModal'
import LoginPage from './components/LoginPage'
import AddPekerjaanModal from './components/AddPekerjaanModal'
import PresentationMode from './components/PresentationMode'
import { clearAdminPin, adminUpsertConfig } from './lib/adminApi'
import { clearMafCredentials, invalidateCache, fetchAppConfig } from './lib/supabase'
import { prefetchAll } from './lib/prefetch'
import MaintenanceScreen from './components/MaintenanceScreen'

type Page = 'beranda' | 'pekerjaan' | 'keuangan' | 'dokumen' | 'galeri' | 'riwayat' | 'laporan' | 'laporan-aset'

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
  // Default sidebar tertutup (rail 68px di desktop, off-canvas di mobile).
  // User bisa membukanya lewat tombol toggle.
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false
  )
  const [showAddModal, setShowAddModal] = useState(false)
  const [addModalKey, setAddModalKey] = useState(0)
  const [showPresentation, setShowPresentation] = useState(false)
  // null = belum dicek, true = maintenance aktif, false = normal
  const [isMaintenance, setIsMaintenance] = useState<boolean | null>(null)
  const [togglingMaintenance, setTogglingMaintenance] = useState(false)
  // Shared month filter ('YYYY-MM' or null for all). Used across pages.
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  // Pekerjaan filter state — persisted across detail navigation
  const [pekerjaanFilter, setPekerjaanFilter] = useState('')
  // Deep link state for Dokumen dan Galeri pages (set by PekerjaanDetail onNavigate)
  const [dokumenProgramId, setDokumenProgramId] = useState<string | null>(null)
  const [dokumenCategory, setDokumenCategory] = useState<DocCategory | null>(null)
  const [galeriProgramId, setGaleriProgramId] = useState<string | null>(null)
  // When Galeri was entered via the "Dokumentasi" folder card in Dokumen,
  // its back button should return to Dokumen instead of Galeri's own list.
  const [galeriReturnToDokumen, setGaleriReturnToDokumen] = useState(false)
  // When Galeri was entered from PekerjaanDetail, back returns to that program's detail.
  const [galeriReturnProgramId, setGaleriReturnProgramId] = useState<string | null>(null)
  const [berandaReturnDetailId, setBerandaReturnDetailId] = useState<string | null>(null)
  // When a program detail is opened from Beranda (not the Pekerjaan menu), Back
  // returns to Beranda and reopens the status list at the tab we came from.
  const [pekerjaanFromBeranda, setPekerjaanFromBeranda] = useState(false)
  const [berandaReturnTab, setBerandaReturnTab] = useState<string | null>(null)
  // Back handler registered by the current page's drill-down sub-view (Galeri
  // folder, Dokumen subfolder, etc.) so the mobile top bar can drive it.
  const [childBack, setChildBack] = useState<BackHandler>(null)
  const registerBack = useCallback((h: BackHandler) => setChildBack(() => h), [])
  const [childTitle, setChildTitle] = useState<string | null>(null)
  const registerTitle = useCallback((t: string | null) => setChildTitle(t), [])

  // Warm the data cache on mount for sessions restored from sessionStorage
  // (e.g. a page reload). Fresh logins warm it via the onLogin callback instead,
  // so this only fires when we're already authenticated at mount — avoiding the
  // cold-cache network buffering on the first visit to each page after a reload.
  useEffect(() => {
    if (isLoggedIn) prefetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cek maintenance mode dari Supabase saat pertama load
  useEffect(() => {
    const check = async () => {
      try {
        const { data } = await fetchAppConfig('maintenance_mode')
        setIsMaintenance(data?.value === 'true')
      } catch {
        setIsMaintenance(false) // kalau gagal fetch, jangan blokir akses
      }
    }
    check()
  }, [])

  // Responsive: collapse to off-canvas drawer on small screens
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const update = () => {
      setIsMobile(mq.matches)
      if (mq.matches) setSidebarOpen(false) // mobile: paksa tertutup; desktop: biarkan pilihan user
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
    setGaleriReturnToDokumen(false)
    if (page !== 'beranda') setBerandaReturnDetailId(null)
    setPekerjaanFromBeranda(false)
    setBerandaReturnTab(null)
    if (isMobile) setSidebarOpen(false)
  }

  const handleSelectProgram = (id: string) => {
    if (role === 'maf' && id === 'P-024') return
    setPekerjaanFromBeranda(false)
    setSelectedProgramId(id)
  }

  // Back from the full-page program detail. If we arrived from Beranda, return
  // there (Beranda reopens the status list at berandaReturnTab); otherwise fall
  // back to the Pekerjaan menu list.
  const handlePekerjaanBack = () => {
    setSelectedProgramId(null)
    if (pekerjaanFromBeranda) {
      setPekerjaanFromBeranda(false)
      setCurrentPage('beranda')
    }
  }

  const handleAddPekerjaan = () => {
    setShowAddModal(true)
    setAddModalKey(k => k + 1)
  }

  const handleAdded = () => {
    setShowAddModal(false)
  }

  const handleToggleMaintenance = async () => {
    if (togglingMaintenance) return
    setTogglingMaintenance(true)
    const newVal = !isMaintenance
    const { error } = await adminUpsertConfig('maintenance_mode', newVal ? 'true' : 'false')
    if (!error) setIsMaintenance(newVal)
    setTogglingMaintenance(false)
  }

  const handleLogoutDashboard = () => {
    sessionStorage.removeItem('dashboard_auth')
    sessionStorage.removeItem('dashboard_role')
    clearAdminPin()
    clearMafCredentials()
    invalidateCache() // clear all cached data on logout
    setIsAdmin(false)
    setIsLoggedIn(false)
    setRole(null)
  }

  const sidebarWidth = isMobile ? 0 : sidebarOpen ? 248 : 68

  // FLIP animation for the main content when the sidebar toggles.
  //
  // Animating `margin-left` reflows the entire (heavy, unmemoized) content tree
  // on every frame → visible judder. Instead we snap the margin to its final
  // value in a single reflow, then GPU-slide the content into place with a
  // `transform: translateX` that never touches layout. The sidebar keeps its
  // own width transition on the identical easing/duration, so both move as one.
  const mainRef = useRef<HTMLDivElement>(null)
  const prevSidebarWidth = useRef(sidebarWidth)

  useLayoutEffect(() => {
    const el = mainRef.current
    const prev = prevSidebarWidth.current
    prevSidebarWidth.current = sidebarWidth
    if (!el || prev === sidebarWidth) return

    // margin already snapped to the new (final) value in this same paint.
    // Compensate by translating back to where the content visually was…
    const delta = prev - sidebarWidth
    el.style.transition = 'none'
    el.style.transform = `translateX(${delta}px)`
    el.style.willChange = 'transform'
    // force a single reflow so the browser commits the start position
    void el.offsetWidth
    // …then release to 0 on the next frame — a pure compositor slide.
    const raf = requestAnimationFrame(() => {
      el.style.transition = 'transform 0.34s cubic-bezier(0.32,0.72,0,1)'
      el.style.transform = 'translateX(0)'
    })
    const onEnd = () => {
      el.style.transition = ''
      el.style.transform = ''
      el.style.willChange = ''
    }
    el.addEventListener('transitionend', onEnd, { once: true })
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('transitionend', onEnd)
    }
  }, [sidebarWidth])

  // The mobile top bar swaps its hamburger (☰) for a back arrow (←) whenever a
  // drill-down view is open. The Pekerjaan detail is owned by App directly;
  // every other page (Galeri, Dokumen, …) registers its own back handler via
  // BackNavContext, which surfaces here as `childBack`.
  const backAction: (() => void) | null =
    currentPage === 'pekerjaan' && selectedProgramId
      ? handlePekerjaanBack
      : childBack

  const renderPage = () => {
    if (currentPage === 'pekerjaan' && selectedProgramId) {
      return (
        <PekerjaanDetail
          programId={selectedProgramId}
          isAdmin={isAdmin}
          role={role}
          onBack={handlePekerjaanBack}
          onNavigate={(page, pid, cat) => {
            setSelectedProgramId(null)
            setCurrentPage(page as Page)
            if (page === 'dokumen') {
              setDokumenProgramId(pid ?? null)
              setDokumenCategory((cat as DocCategory) ?? null)
            } else if (page === 'galeri') {
              setGaleriProgramId(pid ?? null)
              setGaleriReturnProgramId(selectedProgramId)  // remember where to return
            }
          }}
        />
      )
    }

    switch (currentPage) {
      case 'beranda':
        return <Beranda
          isAdmin={isAdmin}
          role={role}
          initialDetailId={berandaReturnDetailId}
          onInitialDetailConsumed={() => setBerandaReturnDetailId(null)}
          initialStatusTab={berandaReturnTab}
          onInitialStatusConsumed={() => setBerandaReturnTab(null)}
          onOpenDetail={(id, tab) => {
            setPekerjaanFromBeranda(true)
            setBerandaReturnTab(tab)
            setSelectedProgramId(id)
            setCurrentPage('pekerjaan')
          }}
          onNavigate={(page, pid, cat) => {
            setCurrentPage(page as Page)
            if (page === 'dokumen') { setDokumenProgramId(pid ?? null); setDokumenCategory((cat as DocCategory) ?? null) }
            if (page === 'galeri') { setGaleriProgramId(pid ?? null); setBerandaReturnDetailId(pid ?? null) }
          }}
        />
      case 'pekerjaan':
        return (
          <Pekerjaan
            isAdmin={isAdmin}
            role={role}
            activeStatus={pekerjaanFilter}
            onFilterChange={setPekerjaanFilter}
            onSelectProgram={handleSelectProgram}
            onAddPekerjaan={handleAddPekerjaan}
          />
        )
      case 'keuangan':
        return <Keuangan isAdmin={isAdmin} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} role={role} />
      case 'dokumen':
        return (
          <Dokumen
            isAdmin={isAdmin}
            role={role}
            initialProgramId={dokumenProgramId}
            initialCategory={dokumenCategory}
            onNavigate={(page, pid) => {
              if (page === 'galeri') {
                setDokumenProgramId(pid ?? null)
                setGaleriProgramId(pid ?? null)
                setGaleriReturnToDokumen(true)
                setCurrentPage('galeri')
              }
            }}
          />
        )
      case 'galeri':
        return (
          <Galeri
            isAdmin={isAdmin}
            initialProgramId={galeriProgramId}
            onExit={
              galeriReturnToDokumen
                ? () => { setGaleriReturnToDokumen(false); setCurrentPage('dokumen') }
                : galeriReturnProgramId
                  ? () => {
                      const pid = galeriReturnProgramId
                      setGaleriReturnProgramId(null)
                      setGaleriProgramId(null)
                      setSelectedProgramId(pid)
                      setCurrentPage('pekerjaan')
                    }
                  : undefined
            }
          />
        )
      case 'riwayat':
        return (role === 'maf' || !isAdmin) ? <Beranda isAdmin={isAdmin} role={role} /> : <RiwayatLaporan />
      case 'laporan-aset':
        return isAdmin ? <LaporanAset /> : <Beranda isAdmin={isAdmin} role={role} />
      case 'laporan':
        return role === 'maf'
          ? <Beranda isAdmin={isAdmin} role={role} />
          : <LaporanBulanan isAdmin={isAdmin} />
      default:
        return <Beranda isAdmin={isAdmin} role={role} />
    }
  }

  // Judul deskriptif untuk top bar mobile (di samping tombol ☰).
  // Sidebar TIDAK memakai map ini — label sidebar tetap pendek.
  const pageTitles: Record<Page, string> = {
    beranda: 'Dashboard Sarpras MAF',
    pekerjaan: 'Daftar 25 Pekerjaan',
    keuangan: 'Riwayat Keuangan',
    dokumen: 'Dokumen Pekerjaan',
    galeri: 'Galeri Dokumentasi',
    riwayat: 'Riwayat Laporan',
    laporan: 'Laporan Bulanan',
    'laporan-aset': 'Laporan Perolehan Aset',
  }

  if (isMaintenance === null) return null

  // ── MAINTENANCE GATE ─────────────────────────────────────────────────────────
  // Blokir semua user yang bukan admin (PIN verified).
  // Admin bypass: klik tombol kunci → masukkan PIN → isAdmin=true → lanjut login.
  if (isMaintenance && !isAdmin) {
    return <MaintenanceScreen onAdminAccess={() => setIsAdmin(true)} />
  }
  // ─────────────────────────────────────────────────────────────────────────────

  if (!isLoggedIn) {
    return (
      <LoginPage
        onLogin={resolvedRole => {
          setRole(resolvedRole)
          // Ensure sidebar is closed on mobile — viewport meta reset during login
          // can briefly trigger the mq listener and open the sidebar
          if (window.matchMedia('(max-width: 768px)').matches) setSidebarOpen(false)
          setIsLoggedIn(true)
          // Pre-warm data cache in background — by the time user navigates to
          // any page, data is already cached and the page renders instantly.
          prefetchAll()
        }}
      />
    )
  }

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', backgroundColor: 'var(--bg)', transition: 'background-color 0.2s ease', paddingTop: 'env(safe-area-inset-top, 0px)', boxSizing: 'border-box' }}>
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
        isMaintenance={isMaintenance ?? false}
        onToggleMaintenance={isAdmin ? handleToggleMaintenance : undefined}
        togglingMaintenance={togglingMaintenance}
        onPresentasi={isAdmin ? () => setShowPresentation(true) : undefined}
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
        ref={mainRef}
        style={{
          marginLeft: sidebarWidth,
          flex: 1,
          minWidth: 0,
          height: '100dvh',
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
            {backAction && (
              <button
                onClick={() => backAction()}
                aria-label="Kembali"
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
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
              </button>
            )}
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {childTitle ?? pageTitles[currentPage]}
            </span>
            <div style={{ flex: 1 }} />
            <MobileAccountMenu
              isAdmin={isAdmin}
              role={role}
              isMaintenance={isMaintenance ?? false}
              togglingMaintenance={togglingMaintenance}
              onRiwayat={() => handleNavigate('riwayat')}
              onShowPinModal={() => setShowPinModal(true)}
              onLogoutAdmin={() => { clearAdminPin(); setIsAdmin(false) }}
              onLogoutDashboard={handleLogoutDashboard}
              onToggleMaintenance={isAdmin ? handleToggleMaintenance : undefined}
              onPresentasi={isAdmin ? () => setShowPresentation(true) : undefined}
            />
          </header>
        )}

        {/* Page content */}
        <div
          style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}
          onTouchStart={e => {
            if (e.touches[0].clientX < 44) {
              edgeSwipeStartX.current = e.touches[0].clientX
              edgeSwipeStartY.current = e.touches[0].clientY
            }
          }}
          onTouchEnd={e => {
            if (edgeSwipeStartX.current === null) return
            const dx = e.changedTouches[0].clientX - edgeSwipeStartX.current
            const dy = Math.abs(e.changedTouches[0].clientY - (edgeSwipeStartY.current || 0))
            if (dx > 55 && dy < 90) {
              // Swipe left→right from left edge = back, same as iPhone
              if (currentPage === 'pekerjaan' && selectedProgramId) {
                // Detail → daftar pekerjaan
                setSelectedProgramId(null)
              } else if (currentPage === 'galeri') {
                // Galeri → dokumen (jika masuk via dokumen), pekerjaan detail, atau beranda
                if (galeriReturnToDokumen) {
                  setGaleriReturnToDokumen(false)
                  setCurrentPage('dokumen')
                } else if (galeriReturnProgramId) {
                  const pid = galeriReturnProgramId
                  setGaleriReturnProgramId(null)
                  setGaleriProgramId(null)
                  setSelectedProgramId(pid)
                  setCurrentPage('pekerjaan')
                } else {
                  setGaleriProgramId(null)
                  setCurrentPage('beranda')
                }
              } else if (currentPage !== 'beranda') {
                // Semua halaman lain → beranda
                setCurrentPage('beranda')
                setSelectedProgramId(null)
                if (isMobile) setSidebarOpen(false)
              }
            }
            edgeSwipeStartX.current = null
            edgeSwipeStartY.current = null
          }}
        >
          <div
            key={currentPage + (selectedProgramId || '')}
            style={{
              animation: 'pageSlideIn 0.28s cubic-bezier(0.25, 0.8, 0.35, 1)',
              minHeight: '100%',
              // Promote to its own compositor layer so the transform/opacity slide
              // runs on the GPU, not the main thread (which is busy mounting the
              // heavy detail tree). Keeps the page-open motion from stuttering.
              willChange: 'transform, opacity',
            }}
          >
            <div style={{ maxWidth: isMobile ? undefined : 1060, margin: '0 auto' }}>
              <BackNavContext.Provider value={registerBack}>
                <TopBarTitleContext.Provider value={registerTitle}>
                  {renderPage()}
                </TopBarTitleContext.Provider>
              </BackNavContext.Provider>
            </div>
          </div>
        </div>

        {/* Mobile bottom navigation */}
        {isMobile && <BottomNav currentPage={currentPage} onNavigate={handleNavigate} role={role} />}
      </div>


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

      {showPresentation && (
        <PresentationMode onClose={() => setShowPresentation(false)} />
      )}
    </div>
  )
}
