import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
    {
        variants: {
            variant: {
                default: 'bg-gray-100 text-gray-900',
                primary: 'bg-eletro-orange text-white',
                secondary: 'bg-eletro-orange-secondary text-white',
                success: 'bg-eletro-green/10 text-eletro-green border border-eletro-green/20',
                warning: 'bg-yellow-100 text-yellow-800',
                danger: 'bg-eletro-error/10 text-eletro-error border border-eletro-error/20',
                outline: 'border border-gray-200 text-gray-700 bg-transparent',
            },
            size: {
                sm: 'px-2 py-0.5 text-xs',
                md: 'px-2.5 py-0.5 text-xs',
                lg: 'px-3 py-1 text-sm',
            }
        },
        defaultVariants: {
            variant: 'default',
            size: 'md',
        },
    }
);

interface BadgeProps
    extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
    icon?: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
    ({ className, variant, size, icon, children, ...props }, ref) => {
        return (
            <span
                ref={ref}
                className={cn(badgeVariants({ variant, size }), className)}
                {...props}
            >
                {icon && <span className="mr-1">{icon}</span>}
                {children}
            </span>
        );
    }
);

Badge.displayName = 'Badge';

export default Badge;
