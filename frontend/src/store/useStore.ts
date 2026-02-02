import { create } from 'zustand';
import { getCountries, getCountry } from '../lib/api';

export type Country = {
  id: string;
  iso2: string;
  iso3: string;
  name: string;
};

export type QualitativeTag = {
  id: string;
  category: string;
  value: number;
  note: string | null;
  createdAt: string;
  user?: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
};

export type CountryMetrics = {
  id: string;
  year: number;
  population: string | null;
  immigrationRate: number | null;
  emigrationRate: number | null;
  murdersPerCapita: number | null;
  warDeathsPercent: number | null;
  famineDeathsPercent: number | null;
};

export type Industry = {
  id: string;
  industryName: string;
  gdpSharePercent: number;
  year: number;
};

export type Article = {
  id: string;
  url: string;
  title: string;
  source: string | null;
  publishDate: string | null;
  summary: string | null;
  keyNotes?: string | null;
  countryLinks: Array<{
    country: Country;
  }>;
  user?: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
};

export type Note = {
  id: string;
  content: string;
  updatedAt: string;
  user?: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
};

export type NetworkUser = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type ContextData = {
  country?: Country;
  tags: QualitativeTag[];
  metrics: CountryMetrics | null;
  industries: Industry[];
  articles: Article[];
  notes: Note[];
  aggregatedMetrics?: any;
};

export type ViewMode = 'my-analysis' | 'network';

type Store = {
  // Data
  countries: Country[];
  selectedCountryId: string | null;
  contextData: ContextData | null;
  loading: boolean;
  colorDimension: 'economic' | 'social' | 'political' | 'ideological';
  tagsVersion: number;
  
  // Network/Social
  viewMode: ViewMode;
  selectedNetworkUserId: string | null;
  networkUsers: NetworkUser[];
  networkUsersLoading: boolean;
  
  // Per-country user overrides (countryId -> userId, null means "my data")
  countryUserOverrides: Record<string, string | null>;
  
  // User credits
  creditBalance: number;
  
  // Auth state
  authReady: boolean;

  // Actions
  fetchCountries: () => Promise<void>;
  selectCountry: (id: string) => Promise<void>;
  clearSelection: () => void;
  setColorDimension: (dimension: 'economic' | 'social' | 'political' | 'ideological') => void;
  refreshContext: () => Promise<void>;
  bumpTagsVersion: () => void;
  
  // Network actions
  setViewMode: (mode: ViewMode) => void;
  setSelectedNetworkUserId: (userId: string | null) => void;
  setNetworkUsers: (users: NetworkUser[]) => void;
  setNetworkUsersLoading: (loading: boolean) => void;
  
  // Per-country override actions
  setCountryUserOverride: (countryId: string, userId: string | null) => void;
  clearCountryUserOverride: (countryId: string) => void;
  getEffectiveUserIdForCountry: (countryId: string) => string | null;
  
  // Credit actions
  setCreditBalance: (balance: number) => void;
  
  // Auth actions
  setAuthReady: (ready: boolean) => void;
};

export const useStore = create<Store>((set, get) => ({
  // Initial state
  countries: [],
  selectedCountryId: null,
  contextData: null,
  loading: false,
  colorDimension: 'economic',
  tagsVersion: 0,
  
  // Network state
  viewMode: 'my-analysis',
  selectedNetworkUserId: null,
  networkUsers: [],
  networkUsersLoading: true, // Start as loading until data is fetched
  
  // Per-country user overrides
  countryUserOverrides: {},
  
  // Credits
  creditBalance: 0,
  
  // Auth state
  authReady: false,

  // Actions
  fetchCountries: async () => {
    try {
      console.log('[useStore] fetchCountries start');
      const response = await getCountries();
      console.log('[useStore] fetchCountries success', { count: response.data?.length });
      set({ countries: response.data });
    } catch (error) {
      console.error('[useStore] fetchCountries error', error);
    }
  },

  selectCountry: async (id: string) => {
    console.log('[useStore] selectCountry', { id });
    set({ loading: true, selectedCountryId: id });
    try {
      const response = await getCountry(id);
      console.log('[useStore] selectCountry success', { id, hasData: !!response.data });
      set({ contextData: response.data, loading: false });
    } catch (error) {
      console.error('[useStore] selectCountry error', error);
      set({ loading: false });
    }
  },

  clearSelection: () => {
    set({
      selectedCountryId: null,
      contextData: null,
    });
  },

  setColorDimension: (dimension) => {
    set({ colorDimension: dimension });
  },

  bumpTagsVersion: () => {
    set((state) => ({ tagsVersion: state.tagsVersion + 1 }));
  },

  refreshContext: async () => {
    const { selectedCountryId } = get();
    if (selectedCountryId) {
      await get().selectCountry(selectedCountryId);
    }
  },
  
  // Network actions
  setViewMode: (mode) => {
    set({ viewMode: mode });
  },
  
  setSelectedNetworkUserId: (userId) => {
    set({ selectedNetworkUserId: userId });
  },
  
  setNetworkUsers: (users) => {
    set({ networkUsers: users });
  },
  
  setNetworkUsersLoading: (loading) => {
    set({ networkUsersLoading: loading });
  },
  
  // Per-country override actions
  setCountryUserOverride: (countryId, userId) => {
    set((state) => ({
      countryUserOverrides: {
        ...state.countryUserOverrides,
        [countryId]: userId,
      },
    }));
  },
  
  clearCountryUserOverride: (countryId) => {
    set((state) => {
      const { [countryId]: _, ...rest } = state.countryUserOverrides;
      return { countryUserOverrides: rest };
    });
  },
  
  getEffectiveUserIdForCountry: (countryId) => {
    const state = get();
    // Check if there's a per-country override first
    if (countryId in state.countryUserOverrides) {
      return state.countryUserOverrides[countryId];
    }
    // Otherwise use global view mode
    return state.viewMode === 'network' ? state.selectedNetworkUserId : null;
  },
  
  // Credit actions
  setCreditBalance: (balance) => {
    set({ creditBalance: balance });
  },
  
  // Auth actions
  setAuthReady: (ready) => {
    set({ authReady: ready });
  },
}));
