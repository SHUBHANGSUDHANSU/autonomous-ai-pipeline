import { create } from "zustand";

interface CommandPaletteStore {
  isOpen: boolean;
  query: string;
  openPalette: () => void;
  closePalette: () => void;
  togglePalette: () => void;
  setQuery: (query: string) => void;
}

export const useCommandPaletteStore = create<CommandPaletteStore>((set) => ({
  isOpen: false,
  query: "",
  openPalette: () => set({ isOpen: true, query: "" }),
  closePalette: () => set({ isOpen: false, query: "" }),
  togglePalette: () => set((state) => ({ isOpen: !state.isOpen, query: state.isOpen ? state.query : "" })),
  setQuery: (query) => set({ query }),
}));
