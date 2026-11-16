import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.985]',
  {
    variants: {
      variant: {
        lime: 'bg-lime text-ink font-semibold hover:bg-lime-hover shadow-soft',
        ink: 'bg-ink text-white hover:bg-ink-soft',
        surface: 'bg-surface text-ink border border-line hover:bg-white',
        ghost: 'text-ink-muted hover:text-ink hover:bg-black/5',
        danger: 'bg-red-600 text-white hover:bg-red-700',
      },
      size: {
        default: 'h-12 px-5',
        lg: 'h-14 px-6 text-[16px]',
        sm: 'h-9 px-4 text-[13px]',
        icon: 'h-10 w-10 rounded-full p-0',
      },
    },
    defaultVariants: {
      variant: 'lime',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
