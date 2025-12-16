Implementation Plan: Fix Panel Data for TOTEMs
Problem Summary
TOTEMs (equipment with "T" prefix in "Nº Eletro") are incorrectly showing panel data in the dashboard charts. Only Abrigos (equipment with "A" prefix) should have panel data.
Root Cause
The panel helper functions in useDashboardStats.ts have legacy fallback logic that checks the "Painel Digital" and "Painel Estático" fields without verifying if the equipment is an Abrigo. When the summary layer fields (hasDigital, digitalPanels, etc.) are not available, the fallback incorrectly assigns panel values to TOTEMs.

---

Implementation Plan
Task 1: Add Equipment Type Helpers to schemas/equipment.ts
File: schemas/equipment.ts
Changes:

- Add isAbrigo(equipment) helper function - returns true if "Nº Eletro" starts with "A"
- Add isTotem(equipment) helper function - returns true if "Nº Eletro" starts with "T"
- Export both functions for use across the codebase
  Code to add (after line 124):
  /\*\*

* Check if equipment is an Abrigo (shelter) - can have panels
* Abrigos have "A" prefix in "Nº Eletro"
  \*/
  export const isAbrigo = (equipment: { "Nº Eletro"?: string }): boolean => {
  const nEletro = equipment["Nº Eletro"];
  return typeof nEletro === 'string' && nEletro.toUpperCase().startsWith('A');
  };
  /\*\*
* Check if equipment is a TOTEM - cannot have panels
* TOTEMs have "T" prefix in "Nº Eletro"
  \*/
  export const isTotem = (equipment: { "Nº Eletro"?: string }): boolean => {
  const nEletro = equipment["Nº Eletro"];
  return typeof nEletro === 'string' && nEletro.toUpperCase().startsWith('T');
  };

---

Task 2: Update Panel Helper Functions in useDashboardStats.ts
File: hooks/useDashboardStats.ts
Changes:

1.  Import isAbrigo from schemas/equipment.ts (line 3)
2.  Update hasDigitalPanel() (lines 74-80):
    - Add guard: Return false immediately if not Abrigo
3.  Update hasStaticPanel() (lines 86-92):
    - Add guard: Return false immediately if not Abrigo
4.  Update getDigitalPanelCount() (lines 97-106):
    - Add guard: Return 0 immediately if not Abrigo
5.  Update getStaticPanelCount() (lines 111-120):
    - Add guard: Return 0 immediately if not Abrigo
      Updated functions:
      // Import at top
      import { hasValue, isActiveValue, isAbrigo } from '../schemas/equipment';
      // Updated hasDigitalPanel
      const hasDigitalPanel = (e: Equipment): boolean => {
      // Only Abrigos (shelters) can have panels
      if (!isAbrigo(e)) return false;


        // New API fields (summary layer)
        if (typeof e.hasDigital === 'boolean') return e.hasDigital;
        if (typeof e.digitalPanels === 'number') return e.digitalPanels > 0;
        // Legacy fallback
        return isActiveValue(e["Painel Digital"]) || hasValue(e["Painel Digital"]);
    };
    // Updated hasStaticPanel
    const hasStaticPanel = (e: Equipment): boolean => {
    // Only Abrigos (shelters) can have panels
    if (!isAbrigo(e)) return false;
        // New API fields (summary layer)
        if (typeof e.hasStatic === 'boolean') return e.hasStatic;
        if (typeof e.staticPanels === 'number') return e.staticPanels > 0;
        // Legacy fallback
        return isActiveValue(e["Painel Estático - Tipo"]) || hasValue(e["Painel Estático - Tipo"]);
    };
    // Updated getDigitalPanelCount
    const getDigitalPanelCount = (e: Equipment): number => {
    // Only Abrigos (shelters) can have panels
    if (!isAbrigo(e)) return 0;
        if (typeof e.digitalPanels === 'number') return e.digitalPanels;
        // Legacy: try to parse from string field
        const value = e["Painel Digital"];
        if (value && value !== '-') {
            const num = parseInt(String(value), 10);
            return isNaN(num) ? (hasDigitalPanel(e) ? 1 : 0) : num;
        }
        return 0;
    };
    // Updated getStaticPanelCount
    const getStaticPanelCount = (e: Equipment): number => {
    // Only Abrigos (shelters) can have panels
    if (!isAbrigo(e)) return 0;
        if (typeof e.staticPanels === 'number') return e.staticPanels;
        // Legacy: try to parse from string field
        const value = e["Painel Estático"];
        if (value && value !== '-') {
            const num = parseInt(String(value), 10);
            return isNaN(num) ? (hasStaticPanel(e) ? 1 : 0) : num;
        }
        return 0;
    };

---

Task 3: Update Panel Filter Logic in App.tsx
File: App.tsx
Changes:

1.  Import isAbrigo from schemas/equipment.ts
2.  Update panelType filter logic in filteredAndSortedData useMemo (around line 304-330):
    - For 'digital' and 'static': Only match Abrigos with panels
    - For 'none': Only show Abrigos without panels (not TOTEMs)
3.  Update filterOptions useMemo (around line 251-256):
    - Add isAbrigo check in the panelType filter exclusion logic
      Updated filter logic:
      // Import at top
      import { isAbrigo } from './schemas/equipment';
      // In filteredAndSortedData useMemo - Panel Type Filter section:
      if (filters.panelType.length > 0) {
      result = result.filter(item => {
      // Only Abrigos can have panels - TOTEMs are excluded from panel filters
      if (!isAbrigo(item)) return false;


        return filters.panelType.some(type => {
          switch (type) {
            case 'digital':
              return item['Painel Digital'] !== undefined && item['Painel Digital'] !== '' && item['Painel Digital'] !== '-';
            case 'static':
              return item['Painel Estático - Tipo'] !== undefined && item['Painel Estático - Tipo'] !== '' && item['Painel Estático - Tipo'] !== '-';
            case 'none':
              const hasDigital = item['Painel Digital'] !== undefined && item['Painel Digital'] !== '' && item['Painel Digital'] !== '-';
              const hasStatic = item['Painel Estático - Tipo'] !== undefined && item['Painel Estático - Tipo'] !== '' && item['Painel Estático - Tipo'] !== '-';
              return !hasDigital && !hasStatic;
            default:
              return false;
          }
        });
    });
    }
    Updated filterOptions:
    // In filterOptions useMemo - getFilteredData function:
    if (excludeKey !== 'panelType' && filters.panelType.length > 0) {
    // Only Abrigos can have panels
    if (!isAbrigo(item)) return false;

const hasDigital = item['Painel Digital'] !== undefined && item['Painel Digital'] !== '' && item['Painel Digital'] !== '-';
const hasStatic = item['Painel Estático - Tipo'] !== undefined && item['Painel Estático - Tipo'] !== '' && item['Painel Estático - Tipo'] !== '-';
const matchesAny = filters.panelType.some(type => {
if (type === 'digital') return hasDigital;
if (type === 'static') return hasStatic;
if (type === 'none') return !hasDigital && !hasStatic;
return false;
});
if (!matchesAny) return false;
}

---

Task 4: Build and Test

1. Run npm run build to verify no TypeScript errors
2. Run npm run dev to test locally
3. Verify that:
   - TOTEM MARROM and other TOTEM models show 0 panels in charts
   - Panel Distribution chart only counts Abrigo panels
   - Panels by Shelter Model chart shows TOTEMs with 0 value bars
   - Panels by Work Area chart only includes Abrigo panel counts
   - Panel filter dropdown only shows Abrigos (TOTEMs excluded)

---

Summary of Changes
| File | Change |
|------|--------|
| schemas/equipment.ts | Add isAbrigo() and isTotem() helper functions |
| hooks/useDashboardStats.ts | Import isAbrigo, add guard to 4 panel helper functions |
| App.tsx | Import isAbrigo, update panel filter logic to only apply to Abrigos |
Expected Results
After implementation:

- ✅ TOTEMs will show 0 panels in all charts
- ✅ Panel totals will only count Abrigo panels
- ✅ "Painéis" filter will only show/filter Abrigos
- ✅ "Sem Painéis" will show Abrigos without panels (excluding TOTEMs)
