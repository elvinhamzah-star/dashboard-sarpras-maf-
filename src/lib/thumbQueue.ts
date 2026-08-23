// Google's lh3.googleusercontent.com thumbnail endpoint throttles/fails requests
// when many distinct Drive file IDs are requested concurrently from the same
// client — confirmed by testing: 8 thumbnails fired at once (a gallery's normal
// page-load behavior) all failed, while the exact same 8 URLs requested one
// after another all succeeded. A fixed single retry doesn't help because every
// failed image retries around the same time, recreating the same burst.
// This queue caps how many thumbnail loads are in flight app-wide so a gallery
// with many photos loads them in small waves instead of one big burst.
const MAX_CONCURRENT = 3
let active = 0
const queue: (() => void)[] = []

function runNext() {
  if (active >= MAX_CONCURRENT) return
  const next = queue.shift()
  if (!next) return
  active++
  next()
}

// Resolves with a release function once a load slot is free. Call the release
// function exactly once (on load, on error, or on cleanup/unmount) or the
// queue permanently loses a slot.
export function acquireThumbSlot(): Promise<() => void> {
  return new Promise(resolve => {
    let released = false
    queue.push(() => resolve(() => {
      if (released) return
      released = true
      active--
      runNext()
    }))
    runNext()
  })
}
