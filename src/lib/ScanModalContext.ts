import { createContext, useContext } from 'react'

export interface ScanArgs {
  desktopJobId: string | null
  mobileJobId: string | null
  url: string
  websiteName: string
  websiteId: string
}

export const ScanModalContext = createContext<{
  openScanModal: (args: ScanArgs) => void
}>({ openScanModal: () => {} })

export const useScanModal = () => useContext(ScanModalContext)
