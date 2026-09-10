import { cva, type VariantProps } from 'class-variance-authority';

export const datePickerVariants = cva(
  'inline-flex items-center justify-between gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 w-full',
  {
    variants: {
      zType: {
        default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        outline: 'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
      },
      zSize: {
        default: 'h-9 px-3 py-2',
        sm: 'h-8 rounded-md px-2 text-xs',
        lg: 'h-10 rounded-md px-4',
      },
    },
    defaultVariants: {
      zType: 'outline',
      zSize: 'default',
    },
  },
);

export type ZardDatePickerTypeVariants = NonNullable<VariantProps<typeof datePickerVariants>['zType']>;
export type ZardDatePickerSizeVariants = NonNullable<VariantProps<typeof datePickerVariants>['zSize']>;
