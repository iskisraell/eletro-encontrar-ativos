import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Format a number with thousand separators
 */
export function formatNumber(num: number): string {
    return new Intl.NumberFormat('pt-BR').format(num);
}

/**
 * Calculate percentage
 */
export function percentage(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
}

/**
 * Get top N items from an array based on count
 */
export function getTopN<T extends { count: number }>(items: T[], n: number): T[] {
    return [...items].sort((a, b) => b.count - a.count).slice(0, n);
}
