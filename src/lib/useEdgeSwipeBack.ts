import { useRef } from 'react'

/**
 * Left-edge swipe-right → back gesture, matching native mobile behavior.
 *
 * Usage:
 *   const swipeBack = useEdgeSwipeBack(() => goBack())
 *   <div {...swipeBack}>...</div>
 *
 * Pass `enabled: false` (e.g. on desktop or when nothing to go back to)
 * to render no handlers at all.
 */
export function useEdgeSwipeBack(onBack: () => void, enabled = true) {
  const startX = useRef<number | null>(null)
  const startY = useRef<number | null>(null)

  if (!enabled) return {}

  return {
    onTouchStart: (e: React.TouchEvent) => {
      if (e.touches[0].clientX < 28) {
        startX.current = e.touches[0].clientX
        startY.current = e.touches[0].clientY
      }
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (startX.current === null) return
      const dx = e.changedTouches[0].clientX - startX.current
      const dy = Math.abs(e.changedTouches[0].clientY - (startY.current || 0))
      if (dx > 72 && dy < 80) onBack()
      startX.current = null
      startY.current = null
    },
  }
}
