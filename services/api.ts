import { ApiResponse, Equipment, SearchParams, RateLimitError, ApiLayer } from '../types';

const API_BASE = "https://script.google.com/macros/s/AKfycbzXpzgaA64P147rIqeaLEkCZ4YQcz5rJOn89Ag8Pf3p8EIg0Beisa9dS0OL-UEOsIWL/exec";

/**
 * Fetches equipment data from the Ativos API v5.0.
 * 
 * Features:
 * - Pagination: start/limit (max 5000) or cursor via `after`
 * - Filters: q (search), status, cidade, estado, bairro
 * - Geospatial: lat, lon, radius (km)
 * - Data Layers: main (default), panels, full, summary
 * - Panel Filters: hasDigital, hasStatic
 * - Rate limit handling with automatic retry
 * 
 * @returns Data array, total count, and cached indicator
 */
export const fetchEquipment = async (params: SearchParams): Promise<{
  data: Equipment[];
  total: number;
  cached?: boolean;
}> => {
  const url = new URL(API_BASE);

  // Required: docs=false to get JSON data instead of documentation
  url.searchParams.append('docs', 'false');

  // Data layer selection (default: main for backward compatibility)
  if (params.layer) {
    url.searchParams.append('layer', params.layer);
  }

  // Search query
  if (params.q) {
    url.searchParams.append('q', params.q);
  }

  // Pagination
  if (params.start !== undefined) {
    url.searchParams.append('start', params.start.toString());
  }
  if (params.limit !== undefined) {
    url.searchParams.append('limit', params.limit.toString());
  }
  if (params.after) {
    url.searchParams.append('after', params.after);
  }

  // Server-side filters
  if (params.status) {
    url.searchParams.append('status', params.status);
  }
  if (params.cidade) {
    url.searchParams.append('cidade', params.cidade);
  }
  if (params.estado) {
    url.searchParams.append('estado', params.estado);
  }
  if (params.bairro) {
    url.searchParams.append('bairro', params.bairro);
  }

  // Panel filters (available on panels, full, summary layers)
  if (params.hasDigital !== undefined) {
    url.searchParams.append('hasDigital', params.hasDigital.toString());
  }
  if (params.hasStatic !== undefined) {
    url.searchParams.append('hasStatic', params.hasStatic.toString());
  }

  // Geospatial search
  if (params.lat !== undefined && params.lon !== undefined) {
    url.searchParams.append('lat', params.lat.toString());
    url.searchParams.append('lon', params.lon.toString());
    if (params.radius !== undefined) {
      url.searchParams.append('radius', params.radius.toString());
    }
  }

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const result: ApiResponse = await response.json();

    // Handle error responses
    if (result.status === 'error') {
      // Rate limit error (429)
      if (result.code === 429) {
        throw new RateLimitError(result.meta?.retryAfter || 60);
      }
      throw new Error(result.message || 'Erro desconhecido na API');
    }

    // Parse response - support both new meta format and legacy format
    const total = result.meta?.total ?? result.total ?? 0;
    const cached = result.meta?.cached;

    return {
      data: result.data || [],
      total,
      cached
    };
  } catch (error) {
    // Re-throw RateLimitError for handling upstream
    if (error instanceof RateLimitError) {
      throw error;
    }
    console.error("Failed to fetch equipment:", error);
    throw error;
  }
};

/**
 * Utility to fetch with automatic retry on rate limit.
 * Use for background sync operations.
 */
export const fetchWithRetry = async (
  params: SearchParams,
  maxRetries: number = 3
): Promise<{ data: Equipment[]; total: number; cached?: boolean }> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fetchEquipment(params);
    } catch (error) {
      if (error instanceof RateLimitError) {
        console.warn(`Rate limited. Waiting ${error.retryAfter}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, error.retryAfter * 1000));
        lastError = error;
      } else {
        throw error;
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
};