import { Equipment } from '../types';

const CACHE_KEY = 'eletro_equipments_data';
const CACHE_TIMESTAMP_KEY = 'eletro_equipments_timestamp';
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours

export const CacheService = {
    save: (data: Equipment[]) => {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
        } catch (error) {
            console.error('Error saving to cache:', error);
        }
    },

    load: (): Equipment[] | null => {
        try {
            const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
            if (!timestamp) return null;

            const age = Date.now() - parseInt(timestamp, 10);
            if (age > CACHE_DURATION) {
                localStorage.removeItem(CACHE_KEY);
                localStorage.removeItem(CACHE_TIMESTAMP_KEY);
                return null;
            }

            const data = localStorage.getItem(CACHE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error loading from cache:', error);
            return null;
        }
    },

    clear: () => {
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    }
};
