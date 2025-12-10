import React, { createContext, useContext, ReactNode } from 'react';

/**
 * ChartFilterContext - Manages chart-driven filtering state
 * 
 * This context tracks which chart element the user clicked most recently
 * and provides utilities for applying chart-to-filter interactions.
 */

interface ChartFilterState {
    // Which chart element is currently "active/highlighted" for visual feedback
    activeChart: 'workArea' | 'branch' | 'neighborhood' | 'shelterModel' | 'features' | null;
    activeValue: string | null;
}

interface ChartFilterContextValue {
    activeFilter: ChartFilterState;
    // Handler to toggle a filter value from a chart click
    handleChartClick: (filterKey: string, value: string) => void;
    // Check if a specific value is currently selected in filters
    isValueSelected: (filterKey: string, value: string) => boolean;
    // Clear all active chart filters
    clearChartFilters: () => void;
}

const ChartFilterContext = createContext<ChartFilterContextValue | undefined>(undefined);

interface ChartFilterProviderProps {
    children: ReactNode;
    filters: {
        workArea: string[];
        neighborhood: string[];
        shelterModel: string[];
        riskArea: string[];
        hasPhoto: boolean;
        [key: string]: string[] | boolean;
    };
    onFilterChange: (key: string, value: any) => void;
    onClearFilters: () => void;
}

export const ChartFilterProvider: React.FC<ChartFilterProviderProps> = ({
    children,
    filters,
    onFilterChange,
    onClearFilters,
}) => {
    const [activeFilter, setActiveFilter] = React.useState<ChartFilterState>({
        activeChart: null,
        activeValue: null,
    });

    /**
     * Handle chart element click - implements toggle behavior
     * If value is already selected → remove it
     * If value is not selected → add it
     */
    const handleChartClick = React.useCallback((filterKey: string, value: string) => {
        const currentValues = filters[filterKey];

        if (Array.isArray(currentValues)) {
            // Toggle behavior: add or remove from array
            const isSelected = currentValues.includes(value);
            const newValues = isSelected
                ? currentValues.filter((v: string) => v !== value)
                : [...currentValues, value];

            onFilterChange(filterKey, newValues);

            // Update active filter indicator for visual feedback
            setActiveFilter({
                activeChart: filterKey as ChartFilterState['activeChart'],
                activeValue: isSelected ? null : value,
            });
        } else if (typeof currentValues === 'boolean') {
            // Toggle boolean filter
            onFilterChange(filterKey, !currentValues);
            setActiveFilter({
                activeChart: filterKey as ChartFilterState['activeChart'],
                activeValue: !currentValues ? value : null,
            });
        }
    }, [filters, onFilterChange]);

    /**
     * Check if a specific value is currently selected
     */
    const isValueSelected = React.useCallback((filterKey: string, value: string): boolean => {
        const currentValues = filters[filterKey];
        if (Array.isArray(currentValues)) {
            return currentValues.includes(value);
        }
        if (typeof currentValues === 'boolean') {
            return currentValues;
        }
        return false;
    }, [filters]);

    /**
     * Clear all chart filters and reset active state
     */
    const clearChartFilters = React.useCallback(() => {
        onClearFilters();
        setActiveFilter({ activeChart: null, activeValue: null });
    }, [onClearFilters]);

    const value: ChartFilterContextValue = {
        activeFilter,
        handleChartClick,
        isValueSelected,
        clearChartFilters,
    };

    return (
        <ChartFilterContext.Provider value={value}>
            {children}
        </ChartFilterContext.Provider>
    );
};

/**
 * Hook to use chart filter context
 */
export const useChartFilter = (): ChartFilterContextValue => {
    const context = useContext(ChartFilterContext);
    if (context === undefined) {
        throw new Error('useChartFilter must be used within a ChartFilterProvider');
    }
    return context;
};

/**
 * Hook to get filter state for a specific chart
 * Returns selected values and handler for that chart type
 */
export const useChartFilterState = (filterKey: string) => {
    const { handleChartClick, isValueSelected, activeFilter } = useChartFilter();

    const onFilterClick = React.useCallback((value: string) => {
        handleChartClick(filterKey, value);
    }, [handleChartClick, filterKey]);

    const checkSelected = React.useCallback((value: string) => {
        return isValueSelected(filterKey, value);
    }, [isValueSelected, filterKey]);

    const isActiveChart = activeFilter.activeChart === filterKey;

    return {
        onFilterClick,
        checkSelected,
        isActiveChart,
        activeValue: isActiveChart ? activeFilter.activeValue : null,
    };
};

export default ChartFilterContext;
