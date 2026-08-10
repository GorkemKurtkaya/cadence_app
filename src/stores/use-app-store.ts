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
  // Raporun daraltıldığı proje (null = tüm projeler). Proje kartından "Rapor Üret" ile set edilir.
  reportProjectScope: string | null;
  setReportProjectScope: (project: string | null) => void;
  openDrawerForProject: (project: string) => void;
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
  // Commitlerim ekranında kopyala için seçili commit'ler (opt-in). Boş → hepsi.
  selectedShas: Set<string>;
  toggleCommitSelected: (sha: string) => void;
  setCommitSelection: (shas: string[]) => void;
  clearCommitSelection: () => void;
  // "Commitlerimi Çek" ile seçilen görüntüleme aralığı (null = header periyot toggle'ı belirler).
  commitRange: { from: string; to: string } | null;
  setCommitRange: (r: { from: string; to: string } | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedDate: todayKey(),
  setSelectedDate: (date) => set({ selectedDate: date }),

  period: "weekly",
  setPeriod: (period) => set({ period }),

  drawerOpen: false,
  // Genel açılış → scope sıfırlanır (tüm projeler dahil).
  openDrawer: () => set({ drawerOpen: true, reportProjectScope: null }),
  closeDrawer: () => set({ drawerOpen: false }),
  toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),
  reportProjectScope: null,
  setReportProjectScope: (reportProjectScope) => set({ reportProjectScope }),
  openDrawerForProject: (project) => set({ drawerOpen: true, reportProjectScope: project }),
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
  selectedShas: new Set<string>(),
  toggleCommitSelected: (sha) =>
    set((s) => {
      const next = new Set(s.selectedShas);
      if (next.has(sha)) next.delete(sha);
      else next.add(sha);
      return { selectedShas: next };
    }),
  setCommitSelection: (shas) => set({ selectedShas: new Set(shas) }),
  clearCommitSelection: () => set({ selectedShas: new Set<string>() }),
  commitRange: null,
  setCommitRange: (commitRange) => set({ commitRange }),
}));
