import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { fadeInUp, spring } from '../../lib/animations';
import { isFirstDashboardRender } from '../../hooks/useDashboardAnimation';

interface ChartCardProps {
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    variant?: 'default' | 'dark';
    className?: string;
    action?: React.ReactNode;
    headerExtra?: React.ReactNode;
    delay?: number;
}

const variantStyles = {
    default: {
        container: 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700',
        title: 'text-gray-900 dark:text-white',
        subtitle: 'text-gray-500 dark:text-gray-400',
    },
    dark: {
        container: 'bg-eletro-black border-none',
        title: 'text-white',
        subtitle: 'text-gray-400',
    },
};

export const ChartCard: React.FC<ChartCardProps> = ({
    title,
    subtitle,
    icon,
    children,
    variant = 'default',
    className,
    action,
    headerExtra,
    delay = 0,
}) => {
    const styles = variantStyles[variant];
    // Only animate on first dashboard render
    const shouldAnimate = isFirstDashboardRender();

    return (
        <motion.div
            className={cn(
                'rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer',
                styles.container,
                className
            )}
            variants={fadeInUp}
            initial={shouldAnimate ? "initial" : false}
            animate="animate"
            transition={{ delay: shouldAnimate ? delay * 0.05 : 0 }}
            whileHover={{ y: -2, transition: spring.stiff }}
            whileTap={{ scale: 0.99 }}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                    {icon && (
                        <div className="w-8 h-8 rounded-lg bg-eletro-orange/10 flex items-center justify-center text-eletro-orange">
                            {icon}
                        </div>
                    )}
                    <div>
                        <h3 className={cn('text-lg font-semibold', styles.title)}>
                            {title}
                        </h3>
                        {subtitle && (
                            <p className={cn('text-sm', styles.subtitle)}>
                                {subtitle}
                            </p>
                        )}
                        {headerExtra && (
                            <div className="mt-2">
                                {headerExtra}
                            </div>
                        )}
                    </div>
                </div>
                {action && (
                    <div className="flex-shrink-0">
                        {action}
                    </div>
                )}
            </div>

            {/* Chart Content */}
            <div className="w-full">
                {children}
            </div>
        </motion.div>
    );
};

export default ChartCard;
