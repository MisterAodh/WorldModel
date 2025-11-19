import { create } from 'zustand';
import { getCountries, getCountry, getRegion } from '../lib/api';

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
  countryLinks: Array<{
    country: Country;
  }>;
};

export type Note = {
  id: string;
  content: string;
  updatedAt: string;
};

export type ContextData = {
  country?: Country;
  region?: any;
  tags: QualitativeTag[];
  metrics: CountryMetrics | null;
  industries: Industry[];
  articles: Article[];
  notes: Note[];
  aggregatedMetrics?: any;
};

type Store = {
  // Data
  countries: Country[];
  selectedCountryId: string | null;
  selectedRegionId: string | null;
  contextData: ContextData | null;
  loading: boolean;
  colorDimension: 'economic' | 'social' | 'political' | 'ideological';

  // Actions
  fetchCountries: () => Promise<void>;
  selectCountry: (id: string) => Promise<void>;
  selectRegion: (id: string) => Promise<void>;
  clearSelection: () => void;
  setColorDimension: (dimension: 'economic' | 'social' | 'political' | 'ideological') => void;
  refreshContext: () => Promise<void>;
};

export const useStore = create<Store>((set, get) => ({
  // Initial state
  countries: [],
  selectedCountryId: null,
  selectedRegionId: null,
  contextData: null,
  loading: false,
  colorDimension: 'economic',

  // Actions
  fetchCountries: async () => {
    try {
      const response = await getCountries();
      set({ countries: response.data });
    } catch (error) {
      console.error('Error fetching countries:', error);
    }
  },

  selectCountry: async (id: string) => {
    set({ loading: true, selectedCountryId: id, selectedRegionId: null });
    try {
      const response = await getCountry(id);
      set({ contextData: response.data, loading: false });
    } catch (error) {
      console.error('Error fetching country:', error);
      set({ loading: false });
    }
  },

  selectRegion: async (id: string) => {
    set({ loading: true, selectedRegionId: id, selectedCountryId: null });
    try {
      const response = await getRegion(id);
      set({ contextData: response.data, loading: false });
    } catch (error) {
      console.error('Error fetching region:', error);
      set({ loading: false });
    }
  },

  clearSelection: () => {
    set({
      selectedCountryId: null,
      selectedRegionId: null,
      contextData: null,
    });
  },

  setColorDimension: (dimension) => {
    set({ colorDimension: dimension });
  },

  refreshContext: async () => {
    const { selectedCountryId, selectedRegionId } = get();
    if (selectedCountryId) {
      await get().selectCountry(selectedCountryId);
    } else if (selectedRegionId) {
      await get().selectRegion(selectedRegionId);
    }
  },
}));
