import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn, formatNumber } from '../../lib/utils';
import { fadeInUp } from '../../lib/animations';

interface StatsCardProps {
    title: string;
    value: number;
    subtitle?: string;
    icon?: React.ReactNode;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    variant?: 'default' | 'dark' | 'accent';
    className?: string;
    delay?: number;
}

const variantStyles = {
    default: {
        container: 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700',
        title: 'text-gray-500 dark:text-gray-400',
        value: 'text-gray-900 dark:text-white',
        subtitle: 'text-gray-400 dark:text-gray-500',
        icon: 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    },
    dark: {
        container: 'bg-eletro-black border-none',
        title: 'text-gray-400',
        value: 'text-white',
        subtitle: 'text-gray-500',
        icon: 'bg-white/10 text-eletro-orange',
    },
    accent: {
        container: 'bg-eletro-orange border-none',
        title: 'text-white/80',
        value: 'text-white',
        subtitle: 'text-white/60',
        icon: 'bg-white/20 text-white',
    },
};

// Animated counter hook
const useCountUp = (end: number, duration: number = 1500) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (end === 0) {
            setCount(0);
            return;
        }

        let startTime: number;
        let animationFrame: number;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);

            // Easing function (easeOutExpo)
            const easeOutExpo = 1 - Math.pow(2, -10 * progress);
            setCount(Math.floor(easeOutExpo * end));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            } else {
                setCount(end);
            }
        };

        // Small delay before starting animation
        const timeout = setTimeout(() => {
            animationFrame = requestAnimationFrame(animate);
        }, 100);

        return () => {
            clearTimeout(timeout);
            if (animationFrame) cancelAnimationFrame(animationFrame);
        };
    }, [end, duration]);

    return count;
};

export const StatsCard: React.FC<StatsCardProps> = ({
    title,
    value,
    subtitle,
    icon,
    trend,
    variant = 'default',
    className,
    delay = 0,
}) => {
    const styles = variantStyles[variant];
    const animatedValue = useCountUp(value);

    return (
        <motion.div
            className={cn(
                'rounded-xl p-6 shadow-sm overflow-hidden relative',
                styles.container,
                className
            )}
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            custom={delay}
            transition={{ delay: delay * 0.1 }}
        >
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <p className={cn('text-sm font-medium uppercase tracking-wide', styles.title)}>
                        {title}
                    </p>
                    <div className="flex items-baseline gap-2">
                        <motion.span
                            className={cn('text-4xl font-bold tracking-tight', styles.value)}
                            key={value}
                        >
                            {formatNumber(animatedValue)}
                        </motion.span>
                        {trend && (
                            <span className={cn(
                                'text-sm font-medium',
                                trend.isPositive ? 'text-green-500' : 'text-red-500'
                            )}>
                                {trend.isPositive ? '+' : ''}{trend.value}%
                            </span>
                        )}
                    </div>
                    {subtitle && (
                        <p className={cn('text-xs', styles.subtitle)}>
                            {subtitle}
                        </p>
                    )}
                </div>

                {icon && (
                    <div className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center',
                        styles.icon
                    )}>
                        {icon}
                    </div>
                )}
            </div>

            {/* Decorative element for accent variant */}
            {variant === 'accent' && (
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full" />
            )}
        </motion.div>
    );
};

export default StatsCard;
