import { ApiResponse, Equipment, SearchParams } from '../types';

const API_URL = "https://script.google.com/macros/s/AKfycbzXpzgaA64P147rIqeaLEkCZ4YQcz5rJOn89Ag8Pf3p8EIg0Beisa9dS0OL-UEOsIWL/exec";

/**
 * Fetches equipment data from the Google Apps Script API.
 * Supports both search query (Scenario A) and pagination (Scenario B).
 * Returns both the data array and total count.
 */
export const fetchEquipment = async (params: SearchParams): Promise<{ data: Equipment[], total: number }> => {
  const url = new URL(API_URL);
  
  if (params.q) {
    url.searchParams.append('q', params.q);
  } else {
    if (params.start !== undefined) url.searchParams.append('start', params.start.toString());
    if (params.limit !== undefined) url.searchParams.append('limit', params.limit.toString());
  }

  try {
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data: ApiResponse = await response.json();

    if (data.status === 'error') {
      throw new Error(data.message || 'Erro desconhecido na API');
    }

    return { 
      data: data.data || [], 
      total: data.total || 0 
    };
  } catch (error) {
    console.error("Failed to fetch equipment:", error);
    throw error;
  }
};