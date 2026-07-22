import { createContext, useContext } from 'react'

export interface ScanArgs {
  desktopJobId: string | null
  mobileJobId: string | null
  url: string
  websiteName: string
  websiteId: string
  // True when this website was just created for this scan (not an existing
  // website being rescanned) — if the scan fails, it should be deleted rather
  // than left as a broken, never-scanned entry.
  isNewWebsite?: boolean
}

export const ScanModalContext = createContext<{
  openScanModal: (args: ScanArgs) => void
  showViewerError: () => void
}>({ openScanModal: () => {}, showViewerError: () => {} })

export const useScanModal = () => useContext(ScanModalContext)
