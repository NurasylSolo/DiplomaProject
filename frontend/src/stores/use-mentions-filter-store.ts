import { create } from "zustand";

function _fmtDate(d: Date, time: string): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}T${time}`;
}

export function buildFilterQuery(filters: MentionsFilters | null | undefined): Record<string, unknown> {
  const q: Record<string, unknown> = {};
  if (!filters) return q;
  // All time: no date filter — show all mentions in DB
  const preset = filters.dateRange?.preset ?? "all";
  if (preset !== "all") {
    if (filters.dateRange?.from) q.date_from = _fmtDate(filters.dateRange.from, "00:00:00");
    if (filters.dateRange?.to) q.date_to = _fmtDate(filters.dateRange.to, "23:59:59");
  }
  if (filters.sentiments?.length) q.sentiment = filters.sentiments.join(",");
  if (filters.sources?.length) q.sources = filters.sources.join(",");
  if (filters.searchQuery) q.search = filters.searchQuery;
  else if (filters.author) q.search = filters.author;
  if (filters.influenceRange && (filters.influenceRange[0] > 0 || filters.influenceRange[1] < 10)) {
    q.influence_min = filters.influenceRange[0] * 10;
    q.influence_max = filters.influenceRange[1] * 10;
  }
  if (filters.languages?.length) q.languages = filters.languages.join(",");
  if (filters.countries?.length) q.countries = filters.countries.join(",");
  if (filters.visited === "visited") q.visited = true;
  else if (filters.visited === "unvisited") q.visited = false;
  if (filters.saved === "saved") q.saved = true;
  else if (filters.saved === "unsaved") q.saved = false;
  return q;
}

/** Format date range for display (e.g. "Jan 1 – Jan 15, 2025") */
export function formatDateRangeLabel(
  dateRange: MentionsFilters["dateRange"] | null | undefined
): string {
  if (!dateRange?.from && !dateRange?.to) return "All time";
  const preset = dateRange.preset ?? "all";
  if (preset === "all") return "All time";
  const from = dateRange.from;
  const to = dateRange.to;
  if (!from && !to) return "All time";
  const fmt = (d: Date) =>
    `${d.toLocaleDateString("default", { month: "short" })} ${d.getDate()}, ${d.getFullYear()}`;
  if (from && to) return `${fmt(from)} – ${fmt(to)}`;
  if (from) return `From ${fmt(from)}`;
  if (to) return `Until ${fmt(to)}`;
  return "Custom range";
}

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
    from: undefined,
    to: undefined,
    preset: "all",
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
    if (filters.dateRange?.preset !== "all" && (filters.dateRange?.from || filters.dateRange?.to)) count++;
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

