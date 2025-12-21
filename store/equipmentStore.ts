import { create } from 'zustand';
import { Equipment } from '../types';

// Filter state type
export interface FilterState {
    workArea: string[];
    neighborhood: string[];
    shelterModel: string[];
    riskArea: string[];
    hasPhoto: boolean;
    panelType: string[]; // 'digital', 'static', 'none'
}

// Sort state type
export interface SortState {
    field: string;
    direction: 'asc' | 'desc';
}

// Equipment store interface
interface EquipmentStore {
    // Data
    equipment: Equipment[];
    fullDataCache: Equipment[];
    isLoading: boolean;
    isSyncing: boolean;
    isCacheReady: boolean;
    error: string | null;

    // Filters & Sort
    filters: FilterState;
    sort: SortState;
    searchQuery: string;

    // UI State
    activeTab: 'list' | 'dashboard' | 'map';
    selectedEquipment: Equipment | null;
    isFilterOpen: boolean;
    visibleCount: number;

    // Data Actions
    setEquipment: (data: Equipment[]) => void;
    setFullDataCache: (data: Equipment[]) => void;
    appendToCache: (chunk: Equipment[]) => void;
    setLoading: (loading: boolean) => void;
    setSyncing: (syncing: boolean) => void;
    setCacheReady: (ready: boolean) => void;
    setError: (error: string | null) => void;

    // Filter Actions
    setFilters: (filters: Partial<FilterState>) => void;
    setFilter: (key: keyof FilterState, value: any) => void;
    clearFilters: () => void;

    // Sort Actions
    setSort: (sort: SortState) => void;
    toggleSortDirection: () => void;

    // Search Actions
    setSearchQuery: (query: string) => void;

    // UI Actions
    setActiveTab: (tab: 'list' | 'dashboard' | 'map') => void;
    setSelectedEquipment: (item: Equipment | null) => void;
    setFilterOpen: (open: boolean) => void;
    setVisibleCount: (count: number) => void;
    incrementVisibleCount: (amount?: number) => void;
    resetVisibleCount: () => void;

    // Computed helpers
    getFilteredData: () => Equipment[];
    getTotal: () => number;
}

// Default filter state
const defaultFilters: FilterState = {
    workArea: [],
    neighborhood: [],
    shelterModel: [],
    riskArea: [],
    hasPhoto: false,
    panelType: [],
};

// Default sort state
const defaultSort: SortState = {
    field: '',
    direction: 'asc',
};

// Create the Zustand store
export const useEquipmentStore = create<EquipmentStore>((set, get) => ({
    // Initial Data State
    equipment: [],
    fullDataCache: [],
    isLoading: false,
    isSyncing: false,
    isCacheReady: false,
    error: null,

    // Initial Filter & Sort State
    filters: defaultFilters,
    sort: defaultSort,
    searchQuery: '',

    // Initial UI State
    activeTab: 'list',
    selectedEquipment: null,
    isFilterOpen: false,
    visibleCount: 24,

    // Data Actions
    setEquipment: (data) => set({ equipment: data }),

    setFullDataCache: (data) => set({ fullDataCache: data }),

    appendToCache: (chunk) => set((state) => {
        // Deduplicate using a Map based on "Nº Eletro"
        const uniqueMap = new Map<string, Equipment>();

        // Add existing items
        state.fullDataCache.forEach(item => {
            if (item["Nº Eletro"]) uniqueMap.set(item["Nº Eletro"], item);
        });

        // Add/Update with new items
        chunk.forEach(item => {
            if (item["Nº Eletro"]) uniqueMap.set(item["Nº Eletro"], item);
        });

        const newData = Array.from(uniqueMap.values());

        return {
            fullDataCache: newData,
            // Also update equipment if it was empty
            equipment: state.equipment.length === 0 ? newData : state.equipment
        };
    }),

    setLoading: (loading) => set({ isLoading: loading }),
    setSyncing: (syncing) => set({ isSyncing: syncing }),
    setCacheReady: (ready) => set({ isCacheReady: ready }),
    setError: (error) => set({ error }),

    // Filter Actions
    setFilters: (filters) => set((state) => ({
        filters: { ...state.filters, ...filters },
        visibleCount: 24 // Reset pagination on filter change
    })),

    setFilter: (key, value) => set((state) => ({
        filters: { ...state.filters, [key]: value },
        visibleCount: 24
    })),

    clearFilters: () => set({
        filters: defaultFilters,
        sort: defaultSort,
        visibleCount: 24
    }),

    // Sort Actions
    setSort: (sort) => set({ sort, visibleCount: 24 }),

    toggleSortDirection: () => set((state) => ({
        sort: {
            ...state.sort,
            direction: state.sort.direction === 'asc' ? 'desc' : 'asc'
        }
    })),

    // Search Actions
    setSearchQuery: (query) => set({ searchQuery: query, visibleCount: 24 }),

    // UI Actions
    setActiveTab: (tab) => set({ activeTab: tab }),
    setSelectedEquipment: (item) => set({ selectedEquipment: item }),
    setFilterOpen: (open) => set({ isFilterOpen: open }),
    setVisibleCount: (count) => set({ visibleCount: count }),
    incrementVisibleCount: (amount = 24) => set((state) => ({
        visibleCount: state.visibleCount + amount
    })),
    resetVisibleCount: () => set({ visibleCount: 24 }),

    // Computed: Get filtered and sorted data
    getFilteredData: () => {
        const state = get();
        let result = [...state.equipment];

        // Apply filters
        if (state.filters.workArea.length > 0) {
            result = result.filter(item =>
                item["Área de Trabalho"] && state.filters.workArea.includes(item["Área de Trabalho"])
            );
        }
        if (state.filters.neighborhood.length > 0) {
            result = result.filter(item =>
                item["Bairro"] && state.filters.neighborhood.includes(item["Bairro"])
            );
        }
        if (state.filters.shelterModel.length > 0) {
            result = result.filter(item =>
                item["Modelo de Abrigo"] && state.filters.shelterModel.includes(item["Modelo de Abrigo"])
            );
        }
        if (state.filters.riskArea.length > 0) {
            result = result.filter(item =>
                item["Área de Risco"] && state.filters.riskArea.includes(item["Área de Risco"])
            );
        }
        if (state.filters.hasPhoto) {
            result = result.filter(item =>
                item["Foto Referência"] && item["Foto Referência"].length > 0
            );
        }

// Apply sort
        if (state.sort.field) {
            result.sort((a, b) => {
                const aValue = a[state.sort.field];
                const bValue = b[state.sort.field];
                
                // Convert to strings for comparison
                const aStr = aValue != null ? String(aValue) : '';
                const bStr = bValue != null ? String(bValue) : '';

                if (state.sort.direction === 'asc') {
                    return aStr.localeCompare(bStr);
                } else {
                    return bStr.localeCompare(aStr);
                }
            });
        }

        return result;
    },

    getTotal: () => get().equipment.length,
}));

// Selector hooks for optimized re-renders
export const useActiveTab = () => useEquipmentStore((state) => state.activeTab);
export const useFilters = () => useEquipmentStore((state) => state.filters);
export const useSort = () => useEquipmentStore((state) => state.sort);
export const useIsLoading = () => useEquipmentStore((state) => state.isLoading);
export const useIsSyncing = () => useEquipmentStore((state) => state.isSyncing);
export const useEquipment = () => useEquipmentStore((state) => state.equipment);
export const useSelectedEquipment = () => useEquipmentStore((state) => state.selectedEquipment);
