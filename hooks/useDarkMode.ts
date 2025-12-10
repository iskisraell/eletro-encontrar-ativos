import { useState, useEffect } from 'react';

/**
 * Hook to manage dark mode state with localStorage persistence
 * and system preference detection
 */
export function useDarkMode() {
    const [isDark, setIsDark] = useState<boolean>(() => {
        // Check localStorage first
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('darkMode');
            if (stored !== null) {
                return stored === 'true';
            }
            // Fall back to system preference
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
            // Only auto-switch if user hasn't manually set a preference
            const stored = localStorage.getItem('darkMode');
            if (stored === null) {
                setIsDark(e.matches);
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    const toggle = () => {
        setIsDark(prev => {
            const newValue = !prev;
            localStorage.setItem('darkMode', String(newValue));
            return newValue;
        });
    };

    return { isDark, setIsDark, toggle };
}

/**
 * Simple hook to check if dark mode is active (read-only)
 * Useful for components that need to adapt to dark mode without controlling it
 */
export function useIsDark(): boolean {
    const [isDark, setIsDark] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            return document.documentElement.classList.contains('dark');
        }
        return false;
    });

    useEffect(() => {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    setIsDark(document.documentElement.classList.contains('dark'));
                }
            });
        });

        observer.observe(document.documentElement, { attributes: true });
        return () => observer.disconnect();
    }, []);

    return isDark;
}

export default useDarkMode;
