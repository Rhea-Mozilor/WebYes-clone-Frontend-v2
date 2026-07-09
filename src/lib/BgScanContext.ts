import { createContext } from 'react'

export interface BgScanJob {
  jobId: string
  url: string
}

export interface BgScanContextType {
  bgScan: BgScanJob | null
  setBgScan: (v: BgScanJob | null) => void
}

export const BgScanContext = createContext<BgScanContextType>({
  bgScan: null,
  setBgScan: () => {},
})
