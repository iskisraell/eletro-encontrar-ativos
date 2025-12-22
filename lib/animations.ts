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

// Fade in from bottom animation - reduced distance and faster
export const fadeInUp: Variants = {
    initial: { opacity: 0, y: 6 },
    animate: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.15, ease: [0.4, 0, 0.2, 1] }
    },
    exit: {
        opacity: 0,
        y: -4,
        transition: { duration: 0.1 }
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
            staggerChildren: 0.02,
            delayChildren: 0.02
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

// Vertical swap animation for placeholder cycling
// Vertical swap animation for placeholder cycling - Springy with overshoot
export const verticalSwap: Variants = {
    initial: { y: 25, opacity: 0 },
    animate: {
        y: 0,
        opacity: 1,
        transition: {
            type: "spring",
            stiffness: 150,
            damping: 12,
            mass: 0.8, // Slightly lighter for snappiness
        }
    },
    exit: {
        y: -25,
        opacity: 0,
        transition: {
            duration: 0.2,
            ease: "easeIn" // Smooth exit without bounce
        }
    }
};

// Search results stack container - staggered entrance/exit
export const searchResultsContainer: Variants = {
    hidden: { 
        opacity: 0,
        y: -8,
    },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.2,
            ease: [0.4, 0, 0.2, 1],
            staggerChildren: 0.04,
            delayChildren: 0.02
        }
    },
    exit: {
        opacity: 0,
        y: -4,
        transition: {
            duration: 0.15,
            ease: [0.4, 0, 0.2, 1],
            staggerChildren: 0.02,
            staggerDirection: -1,
            when: "afterChildren"
        }
    }
};

// Search result item - poppy spring animation
export const searchResultItem: Variants = {
    hidden: { 
        opacity: 0, 
        y: -12, 
        scale: 0.95,
    },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: "spring",
            stiffness: 500,
            damping: 28,
            mass: 0.8
        }
    },
    exit: {
        opacity: 0,
        y: -6,
        scale: 0.98,
        transition: { 
            duration: 0.12,
            ease: [0.4, 0, 1, 1]
        }
    }
};

// Search result item hover effect
export const searchResultHover = {
    rest: { 
        scale: 1,
        backgroundColor: "transparent"
    },
    hover: {
        scale: 1.01,
        transition: { 
            type: "spring",
            stiffness: 400,
            damping: 25
        }
    },
    tap: {
        scale: 0.99,
        transition: { duration: 0.1 }
    }
};

// Action buttons container in search result
export const actionButtonsContainer: Variants = {
    hidden: { 
        opacity: 0,
        height: 0,
        marginTop: 0
    },
    visible: {
        opacity: 1,
        height: "auto",
        marginTop: 8,
        transition: {
            duration: 0.2,
            ease: [0.4, 0, 0.2, 1],
            staggerChildren: 0.05
        }
    },
    exit: {
        opacity: 0,
        height: 0,
        marginTop: 0,
        transition: { duration: 0.15 }
    }
};

// Individual action button
export const actionButton: Variants = {
    hidden: { opacity: 0, x: -10 },
    visible: { 
        opacity: 1, 
        x: 0,
        transition: {
            type: "spring",
            stiffness: 400,
            damping: 25
        }
    },
    exit: { opacity: 0, x: -5 }
};
