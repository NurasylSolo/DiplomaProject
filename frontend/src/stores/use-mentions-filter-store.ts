import { create } from "zustand";

export interface MentionsFilters {
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
    preset: string;
  };
  sources: string[];
  sentiments: string[];
  influenceRange: [number, number];
  author: string;
  searchQuery: string;
  countries: string[];
  languages: string[];
  visited: "all" | "visited" | "unvisited";
  saved: "all" | "saved" | "unsaved";
}

interface MentionsFilterState {
  filters: MentionsFilters;
  setDateRange: (dateRange: MentionsFilters["dateRange"]) => void;
  setSources: (sources: string[]) => void;
  toggleSource: (sourceId: string) => void;
  setSentiments: (sentiments: string[]) => void;
  toggleSentiment: (sentimentId: string) => void;
  setInfluenceRange: (range: [number, number]) => void;
  setAuthor: (author: string) => void;
  setSearchQuery: (query: string) => void;
  setCountries: (countries: string[]) => void;
  setLanguages: (languages: string[]) => void;
  setVisited: (visited: MentionsFilters["visited"]) => void;
  setSaved: (saved: MentionsFilters["saved"]) => void;
  resetFilters: () => void;
  getActiveFiltersCount: () => number;
}

const defaultFilters: MentionsFilters = {
  dateRange: {
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    to: new Date(),
    preset: "7days",
  },
  sources: [],
  sentiments: [],
  influenceRange: [0, 10],
  author: "",
  searchQuery: "",
  countries: [],
  languages: [],
  visited: "all",
  saved: "all",
};

export const useMentionsFilterStore = create<MentionsFilterState>((set, get) => ({
  filters: defaultFilters,
  
  setDateRange: (dateRange) =>
    set((state) => ({ filters: { ...state.filters, dateRange } })),
  
  setSources: (sources) =>
    set((state) => ({ filters: { ...state.filters, sources } })),
  
  toggleSource: (sourceId) =>
    set((state) => {
      const currentSources = state.filters?.sources ?? [];
      return {
        filters: {
          ...state.filters,
          sources: currentSources.includes(sourceId)
            ? currentSources.filter((id) => id !== sourceId)
            : [...currentSources, sourceId],
        },
      };
    }),
  
  setSentiments: (sentiments) =>
    set((state) => ({ filters: { ...state.filters, sentiments } })),
  
  toggleSentiment: (sentimentId) =>
    set((state) => {
      const currentSentiments = state.filters?.sentiments ?? [];
      return {
        filters: {
          ...state.filters,
          sentiments: currentSentiments.includes(sentimentId)
            ? currentSentiments.filter((id) => id !== sentimentId)
            : [...currentSentiments, sentimentId],
        },
      };
    }),
  
  setInfluenceRange: (range) =>
    set((state) => ({ filters: { ...state.filters, influenceRange: range } })),
  
  setAuthor: (author) =>
    set((state) => ({ filters: { ...state.filters, author } })),
  
  setSearchQuery: (query) =>
    set((state) => ({ filters: { ...state.filters, searchQuery: query } })),
  
  setCountries: (countries) =>
    set((state) => ({ filters: { ...state.filters, countries } })),
  
  setLanguages: (languages) =>
    set((state) => ({ filters: { ...state.filters, languages } })),
  
  setVisited: (visited) =>
    set((state) => ({ filters: { ...state.filters, visited } })),
  
  setSaved: (saved) =>
    set((state) => ({ filters: { ...state.filters, saved } })),
  
  resetFilters: () => set({ filters: defaultFilters }),
  
  getActiveFiltersCount: () => {
    const { filters } = get();
    if (!filters) return 0;
    let count = 0;
    if (filters.sources?.length > 0) count++;
    if (filters.sentiments?.length > 0) count++;
    if (filters.influenceRange && (filters.influenceRange[0] > 0 || filters.influenceRange[1] < 10)) count++;
    if (filters.author) count++;
    if (filters.countries?.length > 0) count++;
    if (filters.languages?.length > 0) count++;
    if (filters.visited !== "all") count++;
    if (filters.saved !== "all") count++;
    return count;
  },
}));

