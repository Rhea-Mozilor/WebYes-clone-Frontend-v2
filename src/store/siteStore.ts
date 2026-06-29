import { create } from 'zustand';
import type { ScanStrategy } from '../types';

interface SiteStore {
  websiteId: string | null;
  strategy: ScanStrategy;
  maxPages: number;
  setWebsiteId: (id: string | null) => void;
  setStrategy: (s: ScanStrategy) => void;
  setMaxPages: (n: number) => void;
}

export const useSiteStore = create<SiteStore>((set) => ({
  websiteId: null,
  strategy: 'mobile',
  maxPages: 5,
  setWebsiteId: (id) => set({ websiteId: id }),
  setStrategy: (s) => set({ strategy: s }),
  setMaxPages: (n) => set({ maxPages: n }),
}));
