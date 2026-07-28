import { useEffect, useRef } from 'react'
import { forcePageRepaint } from './forceRepaint'

/**
 * Call forcePageRepaint() the moment `isOpen` flips true → false — i.e. right
 * when a full-viewport overlay (ModalShell: fixed + backdrop-filter) closes.
 * Without this, Chrome leaves stale compositor tiles behind it: hover state
 * on cards underneath (opacity-driven action buttons, etc.) updates in the
 * DOM but stops visually repainting until a stray mousemove or tab switch
 * forces a recomposite — buttons look like they vanished and need pixel-
 * precise clicks to hit.
 */
export function useRepaintOnClose(isOpen: boolean) {
  const wasOpen = useRef(false)
  useEffect(() => {
    if (wasOpen.current && !isOpen) forcePageRepaint()
    wasOpen.current = isOpen
  }, [isOpen])
}
