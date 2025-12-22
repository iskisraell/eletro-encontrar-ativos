import { useState, useEffect, useMemo, useRef } from 'react';
import { MergedEquipment, PanelLayerRecord } from '../types';

// Match types for conditional display logic
export type SearchMatchType = 'nEletro' | 'nParada' | 'address' | 'model' | 'bairro' | 'area';

// Search result with metadata
export interface SearchResult {
  item: MergedEquipment;
  matchType: SearchMatchType;
  matchedField: string;
  matchedText: string; // The actual text that matched for highlighting
  relevanceScore: number;
}

// Search type for location-based auto-navigation
export type SearchType = 'equipment' | 'location';

// Helper to check if item has panel data
const hasPanelData = (item: MergedEquipment): item is MergedEquipment & { _panelData: PanelLayerRecord } => {
  return '_hasPanelData' in item && item._hasPanelData === true && '_panelData' in item && item._panelData !== undefined;
};

// Helper to check if item has valid coordinates
export const hasValidCoordinates = (item: MergedEquipment): boolean => {
  const lat = item["Latitude"];
  const lng = item["Longitude"];
  if (!lat || !lng || lat === '-' || lng === '-') return false;
  const latNum = typeof lat === 'number' ? lat : parseFloat(String(lat));
  const lngNum = typeof lng === 'number' ? lng : parseFloat(String(lng));
  return !isNaN(latNum) && !isNaN(lngNum);
};

// Extract coordinates from item
export const getCoordinates = (item: MergedEquipment): { lat: number; lng: number } | null => {
  if (!hasValidCoordinates(item)) return null;
  const lat = typeof item["Latitude"] === 'number' ? item["Latitude"] : parseFloat(String(item["Latitude"]));
  const lng = typeof item["Longitude"] === 'number' ? item["Longitude"] : parseFloat(String(item["Longitude"]));
  return { lat, lng };
};

// Find the matched portion of text for highlighting
const findMatchedText = (text: string, query: string): string => {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const startIndex = lowerText.indexOf(lowerQuery);
  if (startIndex === -1) return '';
  return text.substring(startIndex, startIndex + query.length);
};

// Calculate relevance score based on match quality
const calculateRelevance = (
  query: string,
  value: string,
  matchType: SearchMatchType
): number => {
  const lowerQuery = query.toLowerCase();
  const lowerValue = value.toLowerCase();
  
  // Priority weights - higher = more important
  const typeWeights: Record<SearchMatchType, number> = {
    nEletro: 100,
    nParada: 90,
    address: 70,
    model: 60,
    bairro: 50,
    area: 40,
  };
  
  let score = typeWeights[matchType];
  
  // Exact match bonus
  if (lowerValue === lowerQuery) {
    score += 50;
  }
  // Starts with bonus
  else if (lowerValue.startsWith(lowerQuery)) {
    score += 30;
  }
  // Word boundary match bonus
  else if (lowerValue.includes(` ${lowerQuery}`)) {
    score += 20;
  }
  
  return score;
};

// Optimized search function - runs synchronously but quickly
const performSearch = (
  query: string,
  data: MergedEquipment[],
  maxResults: number
): {
  results: SearchResult[];
  searchType: SearchType;
  matchedBairros: string[];
  matchedAreas: string[];
  totalMatches: number;
} => {
  const lowerQuery = query.toLowerCase();
  const allResults: SearchResult[] = [];
  const matchedBairros = new Set<string>();
  const matchedAreas = new Set<string>();
  
  // Use for loop for performance (faster than forEach)
  const dataLength = data.length;
  for (let i = 0; i < dataLength; i++) {
    const item = data[i];
    let bestMatch: { type: SearchMatchType; field: string; matchedText: string; score: number } | null = null;
    
    // Check Nº Eletro (highest priority)
    const nEletro = item["Nº Eletro"];
    if (nEletro) {
      const nEletroStr = String(nEletro);
      if (nEletroStr.toLowerCase().includes(lowerQuery)) {
        const score = calculateRelevance(query, nEletroStr, 'nEletro');
        bestMatch = { type: 'nEletro', field: nEletroStr, matchedText: findMatchedText(nEletroStr, query), score };
      }
    }
    
    // Check Nº Parada (only if not already matched with higher score)
    const nParada = item["Nº Parada"];
    if (nParada) {
      const nParadaStr = String(nParada);
      if (nParadaStr.toLowerCase().includes(lowerQuery)) {
        const score = calculateRelevance(query, nParadaStr, 'nParada');
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { type: 'nParada', field: nParadaStr, matchedText: findMatchedText(nParadaStr, query), score };
        }
      }
    }
    
    // Check Address
    const address = item["Endereço"];
    if (address) {
      const addressStr = String(address);
      if (addressStr.toLowerCase().includes(lowerQuery)) {
        const score = calculateRelevance(query, addressStr, 'address');
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { type: 'address', field: addressStr, matchedText: findMatchedText(addressStr, query), score };
        }
      }
    }
    
    // Check Model
    const model = item["Modelo de Abrigo"];
    if (model) {
      const modelStr = String(model);
      if (modelStr.toLowerCase().includes(lowerQuery)) {
        const score = calculateRelevance(query, modelStr, 'model');
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { type: 'model', field: modelStr, matchedText: findMatchedText(modelStr, query), score };
        }
      }
    }
    
    // Check Bairro
    const bairro = item["Bairro"];
    if (bairro) {
      const bairroStr = String(bairro);
      if (bairroStr.toLowerCase().includes(lowerQuery)) {
        matchedBairros.add(bairroStr);
        const score = calculateRelevance(query, bairroStr, 'bairro');
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { type: 'bairro', field: bairroStr, matchedText: findMatchedText(bairroStr, query), score };
        }
      }
    }
    
    // Check Area
    const area = item["Área de Trabalho"];
    if (area) {
      const areaStr = String(area);
      if (areaStr.toLowerCase().includes(lowerQuery)) {
        matchedAreas.add(areaStr);
        const score = calculateRelevance(query, areaStr, 'area');
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { type: 'area', field: areaStr, matchedText: findMatchedText(areaStr, query), score };
        }
      }
    }
    
    // Add to results if matched
    if (bestMatch) {
      allResults.push({
        item,
        matchType: bestMatch.type,
        matchedField: bestMatch.field,
        matchedText: bestMatch.matchedText,
        relevanceScore: bestMatch.score,
      });
    }
  }
  
  const totalMatches = allResults.length;
  
  // Sort by relevance and take top N
  allResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
  const topResults = allResults.slice(0, maxResults);
  
  // Determine search type
  const locationMatchCount = topResults.filter(
    r => r.matchType === 'bairro' || r.matchType === 'area'
  ).length;
  const searchType: SearchType = 
    locationMatchCount > topResults.length / 2 ? 'location' : 'equipment';
  
  return {
    results: topResults,
    searchType,
    matchedBairros: Array.from(matchedBairros),
    matchedAreas: Array.from(matchedAreas),
    totalMatches,
  };
};

interface UseSearchResultsOptions {
  query: string;
  data: MergedEquipment[];
  maxResults?: number;
  minQueryLength?: number;
  debounceMs?: number;
}

interface UseSearchResultsReturn {
  results: SearchResult[];
  searchType: SearchType;
  isSearching: boolean;
  isLoading: boolean; // True during debounce period
  matchedLocations: {
    bairros: string[];
    areas: string[];
  };
  hasResults: boolean;
  totalMatches: number; // Total matches (before limiting to maxResults)
  query: string; // The debounced query that was used for search
}

export const useSearchResults = ({
  query,
  data,
  maxResults = 7,
  minQueryLength = 2,
  debounceMs = 50,
}: UseSearchResultsOptions): UseSearchResultsReturn => {
  // Debounced query state
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Debounce the query
  useEffect(() => {
    const trimmedQuery = query.trim();
    
    // If query is empty or too short, clear immediately
    if (trimmedQuery.length < minQueryLength) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setDebouncedQuery('');
      setIsLoading(false);
      return;
    }
    
    // Set loading state while debouncing
    setIsLoading(true);
    
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set new debounce timeout
    timeoutRef.current = setTimeout(() => {
      setDebouncedQuery(trimmedQuery);
      setIsLoading(false);
    }, debounceMs);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, minQueryLength, debounceMs]);
  
  // Compute search results (only when debouncedQuery changes)
  const searchResult = useMemo(() => {
    if (!debouncedQuery || debouncedQuery.length < minQueryLength) {
      return {
        results: [],
        searchType: 'equipment' as SearchType,
        matchedBairros: [],
        matchedAreas: [],
        totalMatches: 0,
      };
    }
    
    return performSearch(debouncedQuery, data, maxResults);
  }, [debouncedQuery, data, maxResults, minQueryLength]);
  
  return {
    results: searchResult.results,
    searchType: searchResult.searchType,
    isSearching: debouncedQuery.length >= minQueryLength,
    isLoading,
    matchedLocations: {
      bairros: searchResult.matchedBairros,
      areas: searchResult.matchedAreas,
    },
    hasResults: searchResult.results.length > 0,
    totalMatches: searchResult.totalMatches,
    query: debouncedQuery,
  };
};

// Helper to get equipment info for display
export const getEquipmentDisplayInfo = (item: MergedEquipment) => {
  const hasPhoto = !!(item["Foto Referência"] && item["Foto Referência"].length > 0);
  const photoUrl = item["Foto Referência"] || null;
  const status = item["Status"];
  const isActive = status === "Ativo";
  
  // Check for panels
  let hasPanel = false;
  let hasPanels = false;
  let panelCount = 0;
  if (hasPanelData(item)) {
    hasPanel = item._panelData.hasDigital || item._panelData.hasStatic;
    hasPanels = item._panelData.totalPanels > 0;
    panelCount = item._panelData.totalPanels;
  } else {
    const hasDigital = item["Painel Digital"] && item["Painel Digital"] !== "" && item["Painel Digital"] !== "-";
    const hasStatic = item["Painel Estático - Tipo"] && item["Painel Estático - Tipo"] !== "" && item["Painel Estático - Tipo"] !== "-";
    hasPanel = !!(hasDigital || hasStatic);
    hasPanels = hasPanel;
    panelCount = (hasDigital ? 1 : 0) + (hasStatic ? 1 : 0);
  }
  
  return {
    nEletro: item["Nº Eletro"] || 'N/A',
    nParada: item["Nº Parada"] ? String(item["Nº Parada"]) : null,
    model: item["Modelo de Abrigo"] || item["Modelo"] || 'Modelo não especificado',
    address: item["Endereço"] || 'Endereço não informado',
    bairro: item["Bairro"] || null,
    status,
    isActive,
    hasPhoto,
    photoUrl,
    hasPanel,
    hasPanels,
    panelCount,
    coordinates: getCoordinates(item),
  };
};

// Helper to highlight matched text in a string
export const highlightMatch = (text: string, query: string): { before: string; match: string; after: string } | null => {
  if (!query) return null;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const startIndex = lowerText.indexOf(lowerQuery);
  
  if (startIndex === -1) return null;
  
  return {
    before: text.substring(0, startIndex),
    match: text.substring(startIndex, startIndex + query.length),
    after: text.substring(startIndex + query.length),
  };
};

export default useSearchResults;
