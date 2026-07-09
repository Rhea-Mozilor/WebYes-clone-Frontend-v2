import { useSyncExternalStore } from 'react'

let _scan: { jobId: string; url: string } | null = (() => {
  try {
    const raw = localStorage.getItem('webyes-bg-scan')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
})()

const _listeners = new Set<() => void>()

function notify() { _listeners.forEach(fn => fn()) }

export function getBgScan() { return _scan }

export function setBgScan(v: { jobId: string; url: string } | null) {
  _scan = v
  try {
    if (v) localStorage.setItem('webyes-bg-scan', JSON.stringify(v))
    else localStorage.removeItem('webyes-bg-scan')
  } catch { /* ok */ }
  notify()
}

export function useBgScan() {
  return useSyncExternalStore(
    (fn) => { _listeners.add(fn); return () => _listeners.delete(fn) },
    getBgScan
  )
}
