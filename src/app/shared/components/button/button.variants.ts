import { cva, type VariantProps } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      zType: {
        default:
          'bg-[linear-gradient(to_bottom,color-mix(in_oklch,var(--primary),white_30%),var(--primary))] bg-primary text-primary-foreground border border-primary text-sm font-medium text-center shadow-primary-button transition-[filter,background-color,box-shadow] hover:brightness-95',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline: 'border border-input bg-background text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'text-foreground hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      zSize: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'size-9',
      },
      zFull: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      zType: 'default',
      zSize: 'default',
    },
  },
);

export type ZardButtonTypeVariants = NonNullable<VariantProps<typeof buttonVariants>['zType']>;
export type ZardButtonSizeVariants = NonNullable<VariantProps<typeof buttonVariants>['zSize']>;
