import { useState, useEffect } from 'react';

/**
 * Hook to manage dark mode state strictly following system preferences
 */
export function useDarkMode() {
    const [isDark, setIsDark] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    });

    useEffect(() => {
        const root = document.documentElement;
        if (isDark) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [isDark]);

    // Listen for system preference changes
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = (e: MediaQueryListEvent) => {
            setIsDark(e.matches);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    // Return dummy toggle to prevent breaking existing calls (will be removed in App.tsx)
    const toggle = () => {
        console.warn("Manual theme toggle is disabled. Page follows system preference.");
    };

    return { isDark, setIsDark, toggle };
}

/**
 * Simple hook to check if dark mode is active (read-only)
 */
export function useIsDark(): boolean {
    const [isDark, setIsDark] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    });

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent) => setIsDark(e.matches);
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    return isDark;
}

export default useDarkMode;
