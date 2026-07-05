import { useState, useRef } from 'react'
import { useWindowWidth } from '../lib/useWindowWidth'

interface ModalShellProps {
  onClose: () => void
  children: React.ReactNode
  maxWidth?: number
  zIndex?: number
  backdropColor?: string
}

export default function ModalShell({
  onClose,
  children,
  maxWidth = 480,
  zIndex = 100,
  backdropColor = 'rgba(13,24,41,0.55)',
}: ModalShellProps) {
  const width = useWindowWidth()
  const isMobile = width < 600
  const [dragY, setDragY] = useState(0)
  const touchStartY = useRef<number | null>(null)
  const isDragging = useRef(false)

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
    if (dragY > 80) onClose()
    setDragY(0)
    isDragging.current = false
    touchStartY.current = null
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex,
        backgroundColor: backdropColor,
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : 16,
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--card)',
          borderRadius: isMobile ? '20px 20px 0 0' : 16,
          width: '100%',
          maxWidth: isMobile ? '100%' : maxWidth,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isMobile
            ? '0 -8px 32px rgba(0,0,0,0.15)'
            : '0 20px 60px rgba(13,24,41,0.2)',
          transform: `translateY(${dragY}px)`,
          transition: dragY === 0 ? 'transform 0.22s cubic-bezier(0.4,0,0.2,1)' : 'none',
          willChange: 'transform',
          overflow: 'hidden',
        }}
      >
        {isMobile && (
          <div
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{
              padding: '12px 0 8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, touchAction: 'none', cursor: 'grab',
              backgroundColor: 'var(--card)',
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 99, backgroundColor: 'var(--border)' }} />
          </div>
        )}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  )
}
