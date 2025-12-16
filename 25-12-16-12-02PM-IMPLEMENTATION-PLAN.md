Final Implementation Plan
Based on your confirmations, here's the complete implementation plan:

---

Task Breakdown
[ ] Update color palette in Tailwind config (index.html) and CSS
[ ] Update CHART_COLORS in useDashboardStats.ts with new palette
[ ] Create ToastContext.tsx for toast state management
[ ] Create Toast.tsx component with Eletromidia styling (bottom-right, responsive)
[ ] Wrap App with ToastProvider in index.tsx
[ ] Add dynamic panelTypes counts to filterOptions in App.tsx
[ ] Update FilterBar.tsx to accept and use dynamic panelTypes options
[ ] Update Dashboard.tsx to pass panelType filter and handlers to panel charts
[ ] Wire PanelDistributionChart to panelType filter with toast notifications
[ ] Wire PanelsByShelterChart to shelterModel filter with toast notifications
[ ] Wire PanelsByAreaChart to workArea filter with toast notifications
[ ] Integrate toast notifications into handleChartFilterChange in App.tsx
[ ] Update UI components with new color palette (Badge, StatsCard, etc.)
[ ] Test responsive behavior on mobile for toasts and chart filtering
[ ] Run build and verify no TypeScript errors

---

## Detailed Implementation Specifications

### 1. Color Palette Update

**File: index.html (lines 18-24)**
`javascript
colors: {
  eletro: {
    orange: '#ff4f00',        // Primary brand
    'orange-secondary': '#ff8231', // Secondary/hover
    purple: '#6342ff',        // Alternative accent
    pink: '#ff74ff',          // Static panels
    green: '#31b11c',         // Success states
    error: '#dc3545',         // Error states
    'off-white': '#f4f5f0',   // Complementary light bg
    black: '#1A1A1A',         // Dark backgrounds
  }
}
`
**File: index.css** - Update shimmer and add off-white utility
**File: hooks/useDashboardStats.ts (lines 52-64)**
`	ypescript
const CHART_COLORS = [
    '#ff4f00', // Eletro orange (primary)
    '#ff8231', // Secondary orange
    '#6342ff', // Purple
    '#31b11c', // Green
    '#ff74ff', // Pink
    '#1A1A1A', // Black
    '#6B7280', // Gray
    '#dc3545', // Error red
    '#06B6D4', // Cyan
    '#F59E0B', // Amber
];
`

---

2. Toast Notification System
   New File: contexts/ToastContext.tsx
   interface Toast {
   id: string;
   message: string;
   type: 'filter-add' | 'filter-remove' | 'info' | 'error';
   filterKey?: string;
   filterValue?: string;
   }
   interface ToastContextValue {
   toasts: Toast[];
   showToast: (toast: Omit<Toast, 'id'>) => void;
   showFilterToast: (action: 'add' | 'remove', filterKey: string, value: string) => void;
   dismissToast: (id: string) => void;
   }
   Features:

- Max 4 toasts stacked
- Auto-dismiss after 3 seconds
- Pause timer on hover
- Dismiss button
- showFilterToast helper for consistent filter messages
  New File: components/ui/Toast.tsx
  Design Specifications:
- Position: Bottom-right on desktop (right-4 bottom-4), bottom-center on mobile (full width with padding)
- Style:
  - Dark background (bg-eletro-black/95)
  - Orange left accent border (border-l-4 border-eletro-orange)
  - White text with subtle gray for secondary info
  - Rounded corners (rounded-lg)
  - Subtle backdrop blur
- Animation: Slide in from right (desktop) / slide up from bottom (mobile)
- Mobile: Full-width toast with proper safe-area padding
- Hover behavior: Pause auto-dismiss timer, show dismiss button prominently
  Message Format:
- Filter added: "Filtro aplicado: {value}" with orange icon
- Filter removed: "Filtro removido: {value}" with gray icon

---

3. Dynamic Painéis Filter
   File: App.tsx - Add to filterOptions useMemo (around line 291)
   // Calculate panel type counts based on other active filters
   const countPanelTypes = () => {
   const filteredData = getFilteredData('panelType').filter(isAbrigo);

const hasDigital = (item: Equipment) =>
item['Painel Digital'] !== undefined &&
item['Painel Digital'] !== '' &&
item['Painel Digital'] !== '-';

const hasStatic = (item: Equipment) =>
item['Painel Estático - Tipo'] !== undefined &&
item['Painel Estático - Tipo'] !== '' &&
item['Painel Estático - Tipo'] !== '-';

return [
{ value: 'Painel Digital', count: filteredData.filter(hasDigital).length, key: 'digital' },
{ value: 'Painel Estático', count: filteredData.filter(hasStatic).length, key: 'static' },
{ value: 'Sem Painéis', count: filteredData.filter(i => !hasDigital(i) && !hasStatic(i)).length, key: 'none' },
];
};
return {
workAreas,
neighborhoods,
shelterModels,
riskAreas,
panelTypes: countPanelTypes(), // NEW
};
File: FilterBar.tsx - Update options interface and Painéis dropdown
// Props interface update
options: {
workAreas: { value: string; count: number }[];
neighborhoods: { value: string; count: number }[];
shelterModels: { value: string; count: number }[];
riskAreas: { value: string; count: number }[];
panelTypes: { value: string; count: number; key: string }[]; // NEW
};
// Update Painéis MultiSelectDropdown to use options.panelTypes

---

4.  Panel Chart Filtering Integration
    File: Dashboard.tsx
    Update props interface:
    interface DashboardProps {
    // ...existing props
    filters?: {
    workArea: string[];
    neighborhood: string[];
    shelterModel: string[];
    riskArea: string[];
    panelType: string[]; // ADD THIS
    };
    onPanelFilterChange?: (value: string) => void; // For panel type filter
    }
    Wire up charts (around lines 251-273):
    {/_ Panel Distribution (Donut) - Filters by panelType _/}
    <PanelDistributionChart
    data={panelDistribution}
    totalEquipmentWithDigital={stats.withDigitalPanel}
    totalEquipmentWithStatic={stats.withStaticPanel}
    delay={13}
    selectedValues={filters?.panelType?.map(t =>
    t === 'digital' ? 'Painel Digital' : t === 'static' ? 'Painel Estático' : 'Sem Painéis'
    ) || []}
    onFilterChange={onPanelFilterChange}
    />
    {/_ Panels by Shelter Model - Filters by shelterModel _/}
    <PanelsByShelterChart
    data={panelsByShelterModel}
    delay={14}
    selectedValues={filters?.shelterModel || []}
    onFilterChange={onChartFilterChange ? (value) => onChartFilterChange('shelterModel', value) : undefined}
    />
    {/_ Panels by Work Area - Filters by workArea _/}
    <PanelsByAreaChart
    data={panelsByWorkArea}
    delay={15}
    selectedValues={filters?.workArea || []}
    onFilterChange={onChartFilterChange ? (value) => onChartFilterChange('workArea', value) : undefined}
    />
    File: App.tsx
    Add panel filter handler with toast:
    const { showFilterToast } = useToast();
    const handlePanelFilterChange = (displayValue: string) => {
    // Map display name to filter key
    const filterKey = displayValue === 'Painel Digital' ? 'digital'
    : displayValue === 'Painel Estático' ? 'static'
    : 'none';
    setFilters(prev => {
    const isSelected = prev.panelType.includes(filterKey);
    const newValues = isSelected
    ? prev.panelType.filter(v => v !== filterKey)
    : [...prev.panelType, filterKey];

            // Show toast
            showFilterToast(isSelected ? 'remove' : 'add', 'Painéis', displayValue);

            return { ...prev, panelType: newValues };
        });

    };
    // Update existing handleChartFilterChange to show toasts
    const handleChartFilterChange = (filterKey: string, value: string) => {
    setFilters(prev => {
    const currentValues = prev[filterKey as keyof typeof prev];
    if (Array.isArray(currentValues)) {
    const isSelected = currentValues.includes(value);
    const newValues = isSelected
    ? currentValues.filter(v => v !== value)
    : [...currentValues, value];
    // Show toast notification
    showFilterToast(isSelected ? 'remove' : 'add', filterKey, value);

                return { ...prev, [filterKey]: newValues };
            }
            return prev;
        });

    };

---

5. Mobile Responsiveness
   Toast Component:
   // Responsive container classes
   className={
   fixed z-50 flex flex-col gap-2
   // Mobile: bottom-center, full width
   bottom-4 left-4 right-4
   // Desktop: bottom-right, fixed width
   md:left-auto md:right-4 md:w-96
   }
   Chart Filter Pills:

- Already using ActiveFilterChips which wraps properly
- Ensure maxVisible={2} on mobile screens via responsive prop

---

6. Files Summary
   | Action | File | Description |
   |--------|------|-------------|
   | MODIFY | index.html | Add new colors to Tailwind config |
   | MODIFY | index.css | Add off-white utilities, update shimmer |
   | MODIFY | hooks/useDashboardStats.ts | Update CHART_COLORS array |
   | CREATE | contexts/ToastContext.tsx | Toast state management |
   | CREATE | components/ui/Toast.tsx | Toast notification component |
   | MODIFY | index.tsx | Wrap App with ToastProvider |
   | MODIFY | App.tsx | Add panelTypes to filterOptions, add toast integration, add handlePanelFilterChange |
   | MODIFY | FilterBar.tsx | Accept dynamic panelTypes options |
   | MODIFY | components/dashboard/Dashboard.tsx | Wire panel charts to filters |
   | MODIFY | components/ui/Badge.tsx | Update color variants |
   | MODIFY | components/dashboard/StatsCard.tsx | Review color usage |

---

Expected Outcome
After implementation:

1. Painéis filter in FilterBar will show dynamic counts (e.g., "Painel Digital (234)") that update based on other active filters
2. Clicking on panel charts:
   - PanelDistributionChart (Digital/Static donut) → toggles panelType filter
   - PanelsByShelterChart → toggles shelterModel filter
   - PanelsByAreaChart → toggles workArea filter
3. Toast notifications appear bottom-right (or bottom-center on mobile) with:
   - "Filtro aplicado: value" when adding
   - "Filtro removido: value" when removing
   - 3s auto-dismiss, pauses on hover
   - Smooth slide animation
4. Filter pills appear on chart headers showing active selections with X buttons to remove
5. New color palette integrated throughout the UI with:
   - #ff8231 for secondary/hover states
   - #6342ff for purple accents
   - #31b11c for success indicators
   - #dc3545 for error states
   - #f4f5f0 for complementary light backgrounds
