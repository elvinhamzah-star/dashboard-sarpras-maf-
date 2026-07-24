import { useState, useRef, useEffect, useCallback, createContext, useContext } from 'react'
import { createPortal } from 'react-dom'
import { useWindowWidth } from '../lib/useWindowWidth'
import { forcePageRepaint } from '../lib/forceRepaint'

/**
 * Shared close trigger for children rendered inside a ModalShell.
 * Calling it plays the exit animation before actually unmounting,
 * so Batal buttons etc. get the same smooth close as backdrop taps.
 */
const ModalCloseContext = createContext<(() => void) | null>(null)
export const useModalClose = () => useContext(ModalCloseContext)

interface ModalShellProps {
  onClose: () => void
  children: React.ReactNode | ((close: () => void) => React.ReactNode)
  maxWidth?: number
  zIndex?: number
  backdropColor?: string
  panelColor?: string
  /** false = children manage their own scroll (pinned header/footer layouts) */
  contentScroll?: boolean
}

const EXIT_MS = 220

export default function ModalShell({
  onClose,
  children,
  maxWidth = 480,
  zIndex = 100,
  backdropColor = 'rgba(13,24,41,0.55)',
  panelColor = 'var(--card)',
  contentScroll = true,
}: ModalShellProps) {
  const width = useWindowWidth()
  const isMobile = width < 600
  const [dragY, setDragY] = useState(0)
  const touchStartY = useRef<number | null>(null)
  const touchStartX = useRef<number | null>(null)
  const gestureMode = useRef<'none' | 'scroll' | 'drag'>('none')
  const isDragging = useRef(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Double RAF: ensure browser has painted the initial off-screen state before
  // triggering the enter transition (prevents "animation with no start state").
  const [entered, setEntered] = useState(false)
  const [closing, setClosing] = useState(false)
  const closeTimer = useRef<number | null>(null)

  useEffect(() => {
    let raf1 = 0, raf2 = 0
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setEntered(true))
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current)
    }
  }, [])

  // On unmount, force a repaint to clear the stale compositor tiles this
  // fixed backdrop-filter overlay can leave behind (which freeze hover on the
  // page beneath until a tab switch). See forcePageRepaint for the full why.
  useEffect(() => {
    return () => forcePageRepaint()
  }, [])

  // Native touchmove listener with { passive: false } so we can call
  // preventDefault() when the panel is being dragged — this stops iOS
  // rubber-banding the background page through a fixed overlay.
  useEffect(() => {
    if (!isMobile) return
    const panel = panelRef.current
    if (!panel) return

    const preventBgScroll = (e: TouchEvent) => {
      if (!isDragging.current) return
      const scrollTop = scrollContainerRef.current?.scrollTop ?? 0
      if (scrollTop === 0) e.preventDefault()
    }

    panel.addEventListener('touchmove', preventBgScroll, { passive: false })
    return () => panel.removeEventListener('touchmove', preventBgScroll)
  }, [isMobile])

  const closeStarted = useRef(false)
  const close = useCallback(() => {
    if (closeStarted.current) return
    closeStarted.current = true
    setClosing(true)
    closeTimer.current = window.setTimeout(onClose, EXIT_MS)
  }, [onClose])

  // Drag-handle touch handlers (always fully captured, touchAction:none on handle)
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    isDragging.current = true
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || touchStartY.current === null) return
    const delta = e.touches[0].clientY - touchStartY.current
    if (delta > 0) setDragY(delta)
  }
  const onTouchEnd = () => {
    if (dragY > 80) close()
    setDragY(0)
    isDragging.current = false
    touchStartY.current = null
    touchStartX.current = null
    gestureMode.current = 'none'
  }

  // Panel-level swipe-to-close. Only wired when ModalShell owns the scroll
  // container (contentScroll=true); for contentScroll=false layouts the real
  // scroller is a child we can't measure, so scrollTop reads 0 and every downward
  // swipe would falsely dismiss — those use the top drag-handle instead.
  const onPanelTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    touchStartX.current = e.touches[0].clientX
    isDragging.current = false
    gestureMode.current = 'none'
  }
  const onPanelTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return
    const scrollTop = scrollContainerRef.current?.scrollTop ?? 0
    const delta = e.touches[0].clientY - touchStartY.current
    const dx = Math.abs(e.touches[0].clientX - (touchStartX.current ?? 0))
    // Decide once per gesture, then latch — stops the scroll/dismiss flip-flop
    // mid-swipe that let an intended scroll accidentally close the sheet.
    if (gestureMode.current === 'none') {
      if (Math.abs(delta) < 14 && dx < 14) return          // wait for a clear intent
      // Dismiss only when: at content top, moving downward, vertical dominates.
      if (scrollTop === 0 && delta > 0 && delta > dx) {
        gestureMode.current = 'drag'
        isDragging.current = true
      } else {
        gestureMode.current = 'scroll'                      // hand off to native scroll
        return
      }
    }
    if (gestureMode.current === 'scroll') return
    if (scrollTop > 0) { gestureMode.current = 'scroll'; isDragging.current = false; setDragY(0); return }
    if (delta > 0) setDragY(delta)
    else setDragY(0)
  }

  const visible = entered && !closing

  const panelTransform = dragY > 0
    ? `translateY(${dragY}px)`
    : isMobile
      ? (visible ? 'translateY(0)' : 'translateY(100%)')
      : (visible ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(8px)')

  return createPortal(
    <div
      onClick={e => { if (e.target === e.currentTarget) close() }}
      style={{
        position: 'fixed', inset: 0, zIndex,
        backgroundColor: backdropColor,
        // Animate the blur radius with opacity: full glass while open, but
        // ramped to 0 on exit so no active backdrop-filter layer survives to
        // unmount — that lingering layer is what leaves Chrome's stale
        // compositor tiles and freezes hover on the page behind.
        backdropFilter: visible ? 'blur(6px)' : 'blur(0px)',
        WebkitBackdropFilter: visible ? 'blur(6px)' : 'blur(0px)',
        opacity: visible ? 1 : 0,
        pointerEvents: closing ? 'none' : 'auto',
        transition: `opacity ${closing ? EXIT_MS : 200}ms ease, backdrop-filter ${closing ? EXIT_MS : 200}ms ease, -webkit-backdrop-filter ${closing ? EXIT_MS : 200}ms ease`,
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : 16,
      }}
    >
      <div
        ref={panelRef}
        onTouchStart={isMobile && contentScroll ? onPanelTouchStart : undefined}
        onTouchMove={isMobile && contentScroll ? onPanelTouchMove : undefined}
        onTouchEnd={isMobile && contentScroll ? onTouchEnd : undefined}
        style={{
          backgroundColor: panelColor,
          borderRadius: isMobile ? '20px 20px 0 0' : 16,
          width: '100%',
          maxWidth: isMobile ? '100%' : maxWidth,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isMobile
            ? '0 -8px 32px rgba(0,0,0,0.15)'
            : '0 20px 60px rgba(13,24,41,0.2)',
          opacity: isMobile ? 1 : (visible ? 1 : 0),
          transform: panelTransform,
          transition: dragY > 0
            ? 'none'
            : `transform ${closing ? EXIT_MS : 280}ms cubic-bezier(0.16, 1, 0.3, 1), opacity ${closing ? EXIT_MS : 200}ms ease`,
          // Promote to its own layer only while actually animating (enter/exit/drag);
          // a permanent will-change keeps a stale compositor layer alive that can
          // freeze hover repaints on the page behind after the modal unmounts.
          willChange: !entered || closing || dragY > 0 ? 'transform' : 'auto',
          overflow: 'hidden',
        }}
      >
        {isMobile && (
          <div
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{
              padding: '14px 0 10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, touchAction: 'none', cursor: 'grab',
              backgroundColor: panelColor,
            }}
          >
            <div style={{ width: 40, height: 4, borderRadius: 99, backgroundColor: 'var(--border)' }} />
          </div>
        )}
        <div
          ref={scrollContainerRef}
          style={contentScroll
            ? { overflowY: 'auto', flex: 1, overscrollBehavior: 'contain' }
            : { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }
          }>
          <ModalCloseContext.Provider value={close}>
            {typeof children === 'function' ? children(close) : children}
          </ModalCloseContext.Provider>
        </div>
      </div>
    </div>,
    document.body
  )
}
