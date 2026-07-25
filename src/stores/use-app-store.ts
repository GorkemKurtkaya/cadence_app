import { create } from "zustand";
import { todayKey } from "@/lib/date";
import type { CommitArea, ReportLength, ReportPeriod, ReportTone } from "@/types";
import { DEFAULT_TONE } from "@/types";

// Yalnız client-side UI state (seçili tarih, drawer, filtreler). Veri state'i TanStack Query'de.
interface AppState {
  selectedDate: string; // YYYY-MM-DD
  setSelectedDate: (date: string) => void;

  // Header/Commitler periyot toggle'ı (Gün/Hafta/Ay/Yıl).
  period: ReportPeriod;
  setPeriod: (p: ReportPeriod) => void;

  // Rapor drawer'ı ve seçimleri.
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  reportLength: ReportLength;
  setReportLength: (l: ReportLength) => void;
  reportTone: ReportTone;
  setReportTone: (t: ReportTone) => void;

  // Commitlerim filtreleri.
  commitSearch: string;
  setCommitSearch: (q: string) => void;
  commitProject: string | null; // null = tümü
  setCommitProject: (p: string | null) => void;
  commitArea: CommitArea | null; // null = tümü
  setCommitArea: (a: CommitArea | null) => void;
  commitsExpandedAll: boolean;
  toggleExpandAll: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedDate: todayKey(),
  setSelectedDate: (date) => set({ selectedDate: date }),

  period: "weekly",
  setPeriod: (period) => set({ period }),

  drawerOpen: false,
  openDrawer: () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),
  toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),
  reportLength: "detailed",
  setReportLength: (reportLength) => set({ reportLength }),
  reportTone: DEFAULT_TONE,
  setReportTone: (reportTone) => set({ reportTone }),

  commitSearch: "",
  setCommitSearch: (commitSearch) => set({ commitSearch }),
  commitProject: null,
  setCommitProject: (commitProject) => set({ commitProject }),
  commitArea: null,
  setCommitArea: (commitArea) => set({ commitArea }),
  commitsExpandedAll: false,
  toggleExpandAll: () => set((s) => ({ commitsExpandedAll: !s.commitsExpandedAll })),
}));
