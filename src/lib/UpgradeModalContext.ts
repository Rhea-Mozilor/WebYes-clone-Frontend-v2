import { createContext, useContext } from 'react'

export const UpgradeModalContext = createContext<{
  openUpgradeModal: () => void
}>({ openUpgradeModal: () => {} })

export const useUpgradeModal = () => useContext(UpgradeModalContext)
