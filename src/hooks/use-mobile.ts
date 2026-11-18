import * as React from "react"

const MOBILE_BREAKPOINT = 768
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function subscribe(callback: () => void) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches
}

// The server snapshot keeps the first (hydrated) render consistent with SSR;
// React re-renders with the real client value immediately after hydration.
function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
