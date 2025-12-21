import { Equipment, PanelLayerRecord, MergedEquipment } from '../types';

/**
 * Layer Stacker Service
 * 
 * Merges data from multiple API layers into a unified equipment record.
 * Uses "Nº Eletro" as the primary key for matching records across layers.
 * 
 * Architecture:
 * ┌─────────────────┐     ┌─────────────────┐
 * │   Main Layer    │     │  Panels Layer   │
 * │  (basic info)   │     │ (panel details) │
 * └────────┬────────┘     └────────┬────────┘
 *          │                       │
 *          └───────────┬───────────┘
 *                      ▼
 *          ┌───────────────────────┐
 *          │   Merged Equipment    │
 *          │   (complete data)     │
 *          └───────────────────────┘
 */

/**
 * Merges main layer data with panels layer data by "Nº Eletro" key.
 * 
 * Performance: O(n + m) time complexity
 * - n = main layer records
 * - m = panels layer records
 * 
 * @param mainData - Array of equipment records from main layer
 * @param panelsData - Array of panel records from panels layer
 * @returns Array of merged equipment with attached panel data
 */
export function stackLayers(
  mainData: Equipment[],
  panelsData: PanelLayerRecord[]
): MergedEquipment[] {
  // Build panels lookup map for O(1) access
  const panelsMap = new Map<string, PanelLayerRecord>();
  
  panelsData.forEach(panel => {
    const key = panel["Nº Eletro"];
    if (key) {
      panelsMap.set(key, panel);
    }
  });

  // Merge layers by matching "Nº Eletro"
  return mainData.map(equipment => {
    const eletroId = equipment["Nº Eletro"];
    const panelData = eletroId ? panelsMap.get(eletroId) : undefined;

    return {
      ...equipment,
      _panelData: panelData,
      _hasPanelData: !!panelData
    } as MergedEquipment;
  });
}

/**
 * Attaches panel data to a single equipment item.
 * Useful for lazy-loading panel data when viewing detail panel.
 * 
 * @param equipment - Single equipment record
 * @param panelData - Panel data to attach (or undefined if not found)
 * @returns Merged equipment with attached panel data
 */
export function attachPanelData(
  equipment: Equipment,
  panelData: PanelLayerRecord | undefined
): MergedEquipment {
  return {
    ...equipment,
    _panelData: panelData,
    _hasPanelData: !!panelData
  };
}

/**
 * Creates a lookup map from panels array for efficient access.
 * Useful when you need to attach panels to multiple items.
 * 
 * @param panelsData - Array of panel records
 * @returns Map keyed by "Nº Eletro"
 */
export function createPanelsMap(
  panelsData: PanelLayerRecord[]
): Map<string, PanelLayerRecord> {
  const map = new Map<string, PanelLayerRecord>();
  
  panelsData.forEach(panel => {
    const key = panel["Nº Eletro"];
    if (key) {
      map.set(key, panel);
    }
  });
  
  return map;
}

/**
 * Batch attaches panel data to multiple equipment items using a pre-built map.
 * More efficient than calling attachPanelData repeatedly.
 * 
 * @param equipmentList - Array of equipment records
 * @param panelsMap - Pre-built map of panel data
 * @returns Array of merged equipment records
 */
export function batchAttachPanelData(
  equipmentList: Equipment[],
  panelsMap: Map<string, PanelLayerRecord>
): MergedEquipment[] {
  return equipmentList.map(equipment => {
    const eletroId = equipment["Nº Eletro"];
    const panelData = eletroId ? panelsMap.get(eletroId) : undefined;
    
    return {
      ...equipment,
      _panelData: panelData,
      _hasPanelData: !!panelData
    };
  });
}

/**
 * Updates panel data for a single item in an existing array.
 * Returns a new array with the updated item (immutable operation).
 * 
 * @param equipmentList - Existing array of equipment
 * @param eletroId - ID of item to update
 * @param panelData - New panel data to attach
 * @returns New array with updated item
 */
export function updateItemPanelData(
  equipmentList: MergedEquipment[],
  eletroId: string,
  panelData: PanelLayerRecord | undefined
): MergedEquipment[] {
  return equipmentList.map(item => {
    if (item["Nº Eletro"] === eletroId) {
      return {
        ...item,
        _panelData: panelData,
        _hasPanelData: !!panelData
      };
    }
    return item;
  });
}

/**
 * Checks if equipment has panel data attached.
 * Type guard for TypeScript.
 */
export function hasPanelData(
  equipment: Equipment | MergedEquipment
): equipment is MergedEquipment & { _panelData: PanelLayerRecord; _hasPanelData: true } {
  return (
    '_hasPanelData' in equipment && 
    equipment._hasPanelData === true &&
    '_panelData' in equipment &&
    equipment._panelData !== undefined
  );
}

/**
 * Statistics about the layer stacking operation.
 */
export interface StackingStats {
  mainCount: number;
  panelsCount: number;
  matchedCount: number;
  unmatchedCount: number;
  matchPercentage: number;
}

/**
 * Calculates statistics about the layer merge operation.
 * Useful for debugging and monitoring data quality.
 */
export function getStackingStats(
  mainData: Equipment[],
  panelsData: PanelLayerRecord[]
): StackingStats {
  const panelsMap = createPanelsMap(panelsData);
  
  let matchedCount = 0;
  mainData.forEach(equipment => {
    const eletroId = equipment["Nº Eletro"];
    if (eletroId && panelsMap.has(eletroId)) {
      matchedCount++;
    }
  });
  
  return {
    mainCount: mainData.length,
    panelsCount: panelsData.length,
    matchedCount,
    unmatchedCount: mainData.length - matchedCount,
    matchPercentage: mainData.length > 0 
      ? Math.round((matchedCount / mainData.length) * 100) 
      : 0
  };
}
