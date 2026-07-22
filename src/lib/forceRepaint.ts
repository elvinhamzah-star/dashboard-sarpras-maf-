/**
 * Clear the stale compositor tiles that a fixed / backdrop-filter overlay can
 * leave behind when it unmounts. In Chrome especially, removing such a layer
 * fails to invalidate the pixels underneath — hover STATE and the DOM update
 * fine, but the page beneath stops repainting, so hover looks "dead" until a
 * tab switch or ~6s idle forces a recomposite.
 *
 * This is a PAINT-stage bug, so no JS that touches hover state can fix it.
 * An imperceptible opacity nudge (0.999 → '') across two animation frames
 * dirties the whole page and forces the browser to repaint it, clearing the
 * frozen tiles. Call this right when any full-viewport overlay closes.
 */
export function forcePageRepaint() {
  const b = document.body
  b.style.willChange = 'opacity'
  b.style.opacity = '0.999'
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      b.style.opacity = ''
      b.style.willChange = ''
    })
  })
}
