import { Transition, Variants } from 'framer-motion';

/**
 * Performance-optimized animation configurations for Framer Motion
 * - Uses GPU-accelerated properties (transform, opacity)
 * - Reduced animation durations for snappier feel
 * - Added will-change hints where appropriate
 */

// Spring transition presets - optimized for performance
export const spring = {
    stiff: { type: "spring", stiffness: 400, damping: 30 } as Transition,
    gentle: { type: "spring", stiffness: 250, damping: 25 } as Transition,
    bouncy: { type: "spring", stiffness: 500, damping: 20 } as Transition,
    smooth: { type: "spring", stiffness: 150, damping: 20 } as Transition,
    // Ultra-fast for micro-interactions
    instant: { type: "spring", stiffness: 700, damping: 35 } as Transition,
};

// Simple fade - no transform, minimal overhead
export const fadeOnly: Variants = {
    initial: { opacity: 0 },
    animate: {
        opacity: 1,
        transition: { duration: 0.15 }
    },
    exit: {
        opacity: 0,
        transition: { duration: 0.1 }
    }
};

// Fade in from bottom animation - reduced distance
export const fadeInUp: Variants = {
    initial: { opacity: 0, y: 10 },
    animate: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] }
    },
    exit: {
        opacity: 0,
        y: -5,
        transition: { duration: 0.15 }
    }
};

// Fade in from left animation
export const fadeInLeft: Variants = {
    initial: { opacity: 0, x: -15 },
    animate: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] }
    },
    exit: {
        opacity: 0,
        x: 10,
        transition: { duration: 0.15 }
    }
};

// Fade in from right animation
export const fadeInRight: Variants = {
    initial: { opacity: 0, x: 15 },
    animate: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] }
    },
    exit: {
        opacity: 0,
        x: -10,
        transition: { duration: 0.15 }
    }
};

// Scale animation - subtle
export const scaleIn: Variants = {
    initial: { opacity: 0, scale: 0.95 },
    animate: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.15, ease: [0.4, 0, 0.2, 1] }
    },
    exit: {
        opacity: 0,
        scale: 0.98,
        transition: { duration: 0.1 }
    }
};

// Stagger container - reduced delays for snappier feel
export const staggerContainer: Variants = {
    initial: {},
    animate: {
        transition: {
            staggerChildren: 0.03,
            delayChildren: 0.05
        }
    }
};

// Faster stagger for lists
export const staggerFast: Variants = {
    initial: {},
    animate: {
        transition: {
            staggerChildren: 0.02,
            delayChildren: 0
        }
    }
};

// Stagger with more delay between items
export const staggerContainerSlow: Variants = {
    initial: {},
    animate: {
        transition: {
            staggerChildren: 0.06,
            delayChildren: 0.1
        }
    }
};

// Card hover effect - snappier
export const cardHover = {
    rest: { scale: 1 },
    hover: {
        scale: 1.015,
        transition: { duration: 0.15 }
    },
    tap: {
        scale: 0.985,
        transition: { duration: 0.08 }
    }
};

// Tab content slide animation - minimal
export const tabContent: Variants = {
    initial: { opacity: 0 },
    animate: {
        opacity: 1,
        transition: { duration: 0.15 }
    },
    exit: {
        opacity: 0,
        transition: { duration: 0.1 }
    }
};

// Bar chart bar animation
export const barAnimation: Variants = {
    initial: { scaleX: 0, originX: 0 },
    animate: (delay: number) => ({
        scaleX: 1,
        transition: {
            duration: 0.3,
            delay: delay * 0.03,
            ease: [0.4, 0, 0.2, 1]
        }
    })
};

// Number counting animation helper - faster
export const countUpConfig = {
    duration: 0.8,
    ease: [0.4, 0, 0.2, 1]
};

// Slide drawer animation
export const slideDrawer: Variants = {
    initial: { x: '100%' },
    animate: {
        x: 0,
        transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] }
    },
    exit: {
        x: '100%',
        transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] }
    }
};

// Backdrop animation
export const backdrop: Variants = {
    initial: { opacity: 0 },
    animate: {
        opacity: 1,
        transition: { duration: 0.15 }
    },
    exit: {
        opacity: 0,
        transition: { duration: 0.15 }
    }
};

// No animation preset - for skipping animations on mount
export const noInitialAnimation: Variants = {
    initial: false as any,
    animate: {},
    exit: {}
};
