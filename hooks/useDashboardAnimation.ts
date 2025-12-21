/**
 * Hook to track if dashboard animations have already played this session.
 * Prevents laggy re-animations when navigating back to dashboard.
 */

// Session-level flag - persists across component mounts but resets on page refresh
let hasAnimatedThisSession = false;

export function useDashboardAnimation() {
    const shouldAnimate = !hasAnimatedThisSession;

    const markAnimated = () => {
        hasAnimatedThisSession = true;
    };

    const resetAnimation = () => {
        hasAnimatedThisSession = false;
    };

    return {
        shouldAnimate,
        markAnimated,
        resetAnimation,
    };
}

/**
 * Check if this is the first dashboard render this session
 */
export function isFirstDashboardRender(): boolean {
    return !hasAnimatedThisSession;
}

/**
 * Mark dashboard as animated for this session
 */
export function markDashboardAnimated(): void {
    hasAnimatedThisSession = true;
}
