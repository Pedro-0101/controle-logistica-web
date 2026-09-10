import { cva, type VariantProps } from 'class-variance-authority';

export const inputVariants = cva(
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      zSize: {
        default: '',
        sm: 'h-8 px-2 text-xs',
        lg: 'h-10 px-4',
      },
      zStatus: {
        error: 'border-destructive focus-visible:ring-destructive',
        warning: 'border-warning focus-visible:ring-warning',
        success: 'border-success focus-visible:ring-success',
      },
      zBorderless: {
        true: 'border-0 shadow-none focus-visible:ring-0',
        false: '',
      },
      zError: {
        true: 'border-destructive focus-visible:ring-destructive',
        false: '',
      },
      zNumeric: {
        true: 'show-spinner',
        false: '',
      },
      zPass: {
        true: 'pr-10',
        false: '',
      },
    },
    defaultVariants: {
      zSize: 'default',
      zBorderless: false,
      zError: false,
      zNumeric: false,
      zPass: false,
    },
  },
);

export type ZardInputVariants = VariantProps<typeof inputVariants>;
