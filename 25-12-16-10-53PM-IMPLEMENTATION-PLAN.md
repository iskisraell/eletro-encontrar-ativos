Final Implementation Plan
Overview
This plan implements proper static/digital panel counting using the API's new summary layer, adds new MUBIS visualization charts, enhances the FilterBar with panel filters, and fixes the Eletro Orange color across the entire UI.

---

Phase 1: Foundation Updates
1.1 Create REPORT-PANELAPI-DEBUG.md
Debug report documenting the panels API investigation findings.
1.2 Update Color System (#FF6700 → #ff4f00)
Files to update:
| File | Lines | Change |
|------|-------|--------|
| index.html | Line 20 | orange: '#ff4f00' |
| hooks/useDashboardStats.ts | Lines 38, 145 | Update color constant |
| components/dashboard/ShelterModelChart.tsx | Lines 26, 139 | Update COLORS array and props |
| components/dashboard/BranchChart.tsx | Lines 25, 86 | Update COLORS array and props |
| components/dashboard/FeaturesChart.tsx | Lines 99, 142 | Update color props |
| components/dashboard/WorkAreaChart.tsx | Lines 28, 85 | Update COLORS array and props |
| components/dashboard/NeighborhoodChart.tsx | Lines 27, 85, 125 | Update COLORS and logic |
| components/ui/ActiveFilterChip.tsx | Lines 18, 66 | Update default color |
New color palette:

- Eletro Orange: #ff4f00 (primary)
- Static Panels Pink: #ff74ff (for static panel visualization)
  1.3 Update types.ts
  Add new interfaces:
  // Panel detail data (from full/panels layer)
  interface PanelDetails {
  boxes: number;
  faces: number;
  position: string;
  type: string;
  }
  // Panel data object
  interface PanelData {
  digital?: PanelDetails;
  static?: PanelDetails;
  shelterModel: string | null;
  observation: string | null;
  hasDigital: boolean;
  hasStatic: boolean;
  totalPanels: number;
  }
  // Equipment with summary layer panel fields
  interface SummaryEquipment extends Equipment {
  digitalPanels?: number;
  staticPanels?: number;
  totalPanels?: number;
  hasDigital?: boolean;
  hasStatic?: boolean;
  shelterModel?: string | null;
  panels?: PanelData; // Only in full layer
  }
  // API layer type
  type ApiLayer = 'main' | 'panels' | 'full' | 'summary';
  Update SearchParams:
  interface SearchParams {
  // existing...
  layer?: ApiLayer;
  hasDigital?: boolean;
  hasStatic?: boolean;
  }
  1.4 Update services/api.ts
  Add layer parameter support:
- Default to summary layer when fetching for dashboard
- Add hasDigital and hasStatic filter parameters
- Update URL building logic
  1.5 Create Sample Data with Panels
  Create samples/sample_summary_with_panels.json:
- Based on CSV data structure
- Include realistic panel counts (digital/static boxes, faces)
- Cover various shelter models (CAOS LEVE, CAOS ESTRUTURADO, BRUTALISTA, etc.)

---

Phase 2: Dashboard Stats & Logic
2.1 Update hooks/useDashboardStats.ts
New stats to add:
interface DashboardStats {
// existing stats...
totalDigitalPanels: number; // Sum of digitalPanels field
totalStaticPanels: number; // Sum of staticPanels field
equipmentWithDigital: number; // Count where hasDigital === true
equipmentWithStatic: number; // Count where hasStatic === true
}
Update existing panel counting:

- withDigitalPanel: Use hasDigital === true when available, fallback to legacy logic
- withStaticPanel: Use hasStatic === true when available, fallback to legacy logic
  New chart data aggregations:
  interface DashboardData {
  // existing...
  panelDistribution: ChartData[]; // [{name: 'Digital', value: X}, {name: 'Estático', value: Y}]
  panelsByShelterModel: ChartData[]; // Stacked data by shelter model
  panelsByWorkArea: ChartData[]; // Stacked data by work area
  }

---

Phase 3: New MUBIS Panel Charts
3.1 Create components/dashboard/PanelDistributionChart.tsx
Type: Donut chart
Data: Digital vs Static panel totals
Features:

- Inner label showing total panels
- Click-to-filter (toggle hasDigital / hasStatic)
- Legend with equipment count + panel count
- Dark/light mode support
- Colors: Digital = #ff4f00, Static = #ff74ff
  3.2 Create components/dashboard/PanelsByShelterChart.tsx
  Type: Stacked horizontal bar chart
  Data: Panel counts grouped by shelter model
  Features:
- Stacked bars: Digital (orange) + Static (pink)
- Shows only shelters with panels
- Click-to-filter by shelter model
- Tooltip with breakdown
- Dark/light mode support
  3.3 Create components/dashboard/PanelsByAreaChart.tsx
  Type: Stacked vertical bar chart
  Data: Panel counts grouped by work area
  Features:
- Stacked bars: Digital (orange) + Static (pink)
- All work areas shown
- Click-to-filter by work area
- Tooltip with breakdown
- Dark/light mode support
3.4 Update components/dashboard/Dashboard.tsx
New section: "Análise de Painéis" below existing charts
{/_ MUBIS Panel Analysis Section _/}
<motion.div variants={fadeInUp} className="flex items-center gap-3 mt-12 mb-6">
  <div className="w-10 h-10 rounded-xl bg-eletro-orange/10 flex items-center justify-center">
    <Monitor className="w-5 h-5 text-eletro-orange" />
  </div>
  <div>
    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Análise de Painéis</h2>
    <p className="text-sm text-gray-500 dark:text-gray-400">
      Distribuição de painéis digitais e estáticos
    </p>
  </div>
</motion.div>
{/* Panel Charts Grid */}
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <PanelDistributionChart ... />
  <PanelsByShelterChart ... />
  <PanelsByAreaChart ... />
</div>
Update Stats Cards:
- "Painéis Digitais" card: Show equipmentWithDigital (accurate count)
- Consider adding subtitle with total panel count
  3.5 Update components/dashboard/index.ts
  Add exports for new chart components:
  export { PanelDistributionChart } from './PanelDistributionChart';
  export { PanelsByShelterChart } from './PanelsByShelterChart';
  export { PanelsByAreaChart } from './PanelsByAreaChart';

---

Phase 4: FilterBar Panel Filter
4.1 Update components/FilterBar.tsx
Add new filter dropdown (after "Risco" filter):
{/_ Painéis Filter _/}
<MultiSelectDropdown
label="Painéis"
icon={<Monitor className="h-4 w-4" />}
options={options.panelTypes}
selected={filters.panelType}
onChange={(val) => onFilterChange('panelType', val)}
/>
Filter options:

- Painel Digital - Equipment with digital panels
- Painel Estático - Equipment with static panels
- Sem Painéis - Equipment without any panels
  Update FilterBarProps:
  interface FilterBarProps {
  filters: {
  // existing...
  panelType: string[];
  };
  options: {
  // existing...
  panelTypes: { value: string; count: number }[];
  };
  }
  4.2 Update App.tsx
  State changes:
  const [filters, setFilters] = useState({
  // existing...
  panelType: [] as string[],
  });
  Filter options extraction:
  // In filterOptions useMemo
  const panelTypes = [
  { value: 'Painel Digital', count: data.filter(e => e.hasDigital === true || (/* legacy fallback */)).length },
  { value: 'Painel Estático', count: data.filter(e => e.hasStatic === true || (/* legacy fallback */)).length },
  { value: 'Sem Painéis', count: data.filter(e => !e.hasDigital && !e.hasStatic).length },
  ];
  Filtering logic:
  // In filteredAndSortedData useMemo
  if (filters.panelType.length > 0) {
  result = result.filter(item => {
  const hasDigital = item.hasDigital === true || /_ legacy fallback _/;
  const hasStatic = item.hasStatic === true || /_ legacy fallback _/;
  return filters.panelType.some(type => {
  if (type === 'Painel Digital') return hasDigital;
  if (type === 'Painel Estático') return hasStatic;
  if (type === 'Sem Painéis') return !hasDigital && !hasStatic;
  return false;
  });
  });
  }
  Clear filters update:
  const clearFilters = () => {
  setFilters({
  // existing...
  panelType: [],
  });
  };
  4.3 Update store/equipmentStore.ts
  Add panelType: string[] to FilterState interface and defaultFilters.

---

Phase 5: Quality Assurance
5.1 Dark/Light Mode Testing
All new components must:

- Use useIsDark() hook for theme detection
- Apply appropriate dark mode classes (dark:bg-gray-800, dark:text-gray-100, etc.)
- Use theme-aware axis colors in charts
- Test tooltip, legend, and grid styling in both modes
  5.2 Component Consistency
  Ensure new charts follow existing patterns:
- Use ChartCard wrapper component
- Implement selectedValues and onFilterChange props
- Include ActiveFilterChips for selected states
- Use consistent animation timing with delay prop

---

File Changes Summary
| File | Action | Priority |
|------|--------|----------|
| REPORT-PANELAPI-DEBUG.md | Create | High |
| index.html | Modify | High |
| types.ts | Modify | High |
| services/api.ts | Modify | High |
| samples/sample_summary_with_panels.json | Create | Medium |
| hooks/useDashboardStats.ts | Modify | High |
| components/dashboard/PanelDistributionChart.tsx | Create | High |
| components/dashboard/PanelsByShelterChart.tsx | Create | High |
| components/dashboard/PanelsByAreaChart.tsx | Create | High |
| components/dashboard/Dashboard.tsx | Modify | High |
| components/dashboard/index.ts | Modify | Low |
| components/dashboard/ShelterModelChart.tsx | Modify | High |
| components/dashboard/BranchChart.tsx | Modify | High |
| components/dashboard/FeaturesChart.tsx | Modify | High |
| components/dashboard/WorkAreaChart.tsx | Modify | High |
| components/dashboard/NeighborhoodChart.tsx | Modify | High |
| components/ui/ActiveFilterChip.tsx | Modify | High |
| components/FilterBar.tsx | Modify | High |
| App.tsx | Modify | High |
| store/equipmentStore.ts | Modify | Medium |

---

Execution Order

1. Foundation (Phase 1): Debug report, color fix, types, API, sample data
2. Stats Logic (Phase 2): Update useDashboardStats hook
3. Charts (Phase 3): Create new panel charts, update Dashboard
4. FilterBar (Phase 4): Add panel filter dropdown, update App.tsx
5. QA (Phase 5): Dark/light mode testing, consistency check

---

Ready to implement when you give the go-ahead!
▣ Plan · claude-opus-4-5-thinking · 1m 44s
Proceed
israel.toledo
I'll start implementing the plan. Let me begin with the foundation updates.
[X] Create REPORT-PANELAPI-DEBUG.md with API investigation findings
[X] Update types.ts with panel-related interfaces
[X] Update services/api.ts to support layer parameter
[X] Create sample_summary_with_panels.json test data
[ ] Update useDashboardStats.ts with panel stats and chart data
[X] Fix Eletro Orange color (#ff4f00) across all UI components
[ ] Create PanelDistributionChart.tsx (Digital vs Static)
[ ] Create PanelsByShelterChart.tsx (Panels by shelter model)
[ ] Create PanelsByAreaChart.tsx (Panels by work area)
[ ] Update Dashboard.tsx with new MUBIS charts section
[ ] Update dashboard/index.ts exports
[ ] Update FilterBar.tsx with panel type filter dropdown
[ ] Update App.tsx with panel filter state and logic
[ ] Update store/equipmentStore.ts with panel filter
[ ] Test dark/light mode for all new components
