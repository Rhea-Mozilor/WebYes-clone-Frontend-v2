import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ScanStrategy } from '../types';

interface SiteStore {
  websiteId: string | null;
  strategy: ScanStrategy;
  maxPages: number;
  // latest & previous scan IDs keyed by websiteId
  scansByWebsite: Record<string, { scanId: string; prevScanId?: string }>;
  setWebsiteId: (id: string | null) => void;
  setStrategy: (s: ScanStrategy) => void;
  setMaxPages: (n: number) => void;
  setScanForWebsite: (websiteId: string, newScanId: string) => void;
}

export const useSiteStore = create<SiteStore>()(
  persist(
    (set, get) => ({
      websiteId: null,
      strategy: 'mobile',
      maxPages: 5,
      scansByWebsite: {},
      setWebsiteId: (id) => set({ websiteId: id }),
      setStrategy: (s) => set({ strategy: s }),
      setMaxPages: (n) => set({ maxPages: n }),
      setScanForWebsite: (websiteId, newScanId) => {
        const prev = get().scansByWebsite[websiteId]?.scanId
        set((s) => ({
          scansByWebsite: {
            ...s.scansByWebsite,
            [websiteId]: { scanId: newScanId, prevScanId: prev },
          },
        }))
      },
    }),
    { name: 'webyes-site' }
  )
);
