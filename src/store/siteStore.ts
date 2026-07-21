import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ScanStrategy } from '../types';

interface SiteStore {
  websiteId: string | null;
  strategy: ScanStrategy;
  maxPages: number;
  // latest & previous scan IDs keyed by websiteId
  scansByWebsite: Record<string, { scanId: string; prevScanId?: string }>;
  // onboarding scan running in background (set when user clicks "Back to Dashboard")
  activeScanJob: { jobId: string; url: string } | null;
  setWebsiteId: (id: string | null) => void;
  setStrategy: (s: ScanStrategy) => void;
  setMaxPages: (n: number) => void;
  setScanForWebsite: (websiteId: string, newScanId: string) => void;
  setActiveScanJob: (job: { jobId: string; url: string } | null) => void;
  reset: () => void;
}

export const useSiteStore = create<SiteStore>()(
  persist(
    (set, get) => ({
      websiteId: null,
      strategy: 'mobile',
      maxPages: 5,
      scansByWebsite: {},
      activeScanJob: null,
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
      setActiveScanJob: (job) => set({ activeScanJob: job }),
      reset: () => set({
        websiteId: null,
        strategy: 'mobile',
        maxPages: 5,
        scansByWebsite: {},
        activeScanJob: null,
      }),
    }),
    { name: 'webyes-site' }
  )
);
