import { createContext, useContext, useEffect, useRef } from 'react'

export type BackHandler = (() => void) | null

/**
 * Lets any page's drill-down sub-view tell the mobile top bar to render a
 * ← back arrow (instead of the ☰ menu) that drives its "go back" action.
 * The provider (App) stores the currently-registered handler; `null` means
 * no sub-view is open, so the top bar shows the hamburger menu.
 */
export const BackNavContext = createContext<(handler: BackHandler) => void>(() => {})

/**
 * Register the active back handler for the mobile top bar.
 *
 * Pass a function while a drill-down sub-view is open (e.g. a Galeri folder,
 * a Dokumen subfolder, the Pekerjaan detail), or `null` when at the page's
 * top level. A stable wrapper is registered so the latest handler always runs
 * without re-registering on every render — the effect only re-runs when the
 * sub-view opens or closes.
 */
export function useBackHandler(handler: BackHandler) {
  const register = useContext(BackNavContext)
  const ref = useRef<BackHandler>(handler)
  ref.current = handler
  const active = handler !== null
  useEffect(() => {
    if (!active) return
    register(() => ref.current?.())
    return () => register(null)
  }, [active, register])
}
