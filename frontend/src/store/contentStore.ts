import { create } from "zustand";

type ViewMode = "grid" | "list";
type SortMode = "newest" | "seo" | "longest";

interface ContentStore {
  search: string;
  status: string;
  viewMode: ViewMode;
  sortMode: SortMode;
  setSearch: (search: string) => void;
  setStatus: (status: string) => void;
  setViewMode: (viewMode: ViewMode) => void;
  setSortMode: (sortMode: SortMode) => void;
}

export const useContentStore = create<ContentStore>((set) => ({
  search: "",
  status: "all",
  viewMode: "grid",
  sortMode: "newest",
  setSearch: (search) => set({ search }),
  setStatus: (status) => set({ status }),
  setViewMode: (viewMode) => set({ viewMode }),
  setSortMode: (sortMode) => set({ sortMode }),
}));
