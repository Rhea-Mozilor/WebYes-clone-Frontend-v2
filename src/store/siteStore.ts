import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ScanStrategy } from '../types';

interface PendingScan {
  desktopJobId: string | null;
  mobileJobId: string | null;
  url: string;
  websiteName: string;
  websiteId: string;
}

interface SiteStore {
  websiteId: string | null;
  strategy: ScanStrategy;
  maxPages: number;
  // latest & previous scan IDs keyed by websiteId
  scansByWebsite: Record<string, { scanId: string; prevScanId?: string }>;
  // onboarding scan running in background (set when user clicks "Back to Dashboard")
  activeScanJob: { jobId: string; url: string } | null;
  // scan triggered from AddNewWebsiteModal — AppLayout picks this up and opens the modal
  pendingScan: PendingScan | null;
  setWebsiteId: (id: string | null) => void;
  setStrategy: (s: ScanStrategy) => void;
  setMaxPages: (n: number) => void;
  setScanForWebsite: (websiteId: string, newScanId: string) => void;
  setActiveScanJob: (job: { jobId: string; url: string } | null) => void;
  setPendingScan: (scan: PendingScan | null) => void;
}

export const useSiteStore = create<SiteStore>()(
  persist(
    (set, get) => ({
      websiteId: null,
      strategy: 'mobile',
      maxPages: 5,
      scansByWebsite: {},
      activeScanJob: null,
      pendingScan: null,
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
      setPendingScan: (scan) => set({ pendingScan: scan }),
    }),
    { name: 'webyes-site' }
  )
);
