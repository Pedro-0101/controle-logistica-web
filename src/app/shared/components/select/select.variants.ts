import { cva, type VariantProps } from 'class-variance-authority';

export const selectVariants = cva(
  'flex w-full h-9 items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:opacity-50',
  {
    variants: {
      zError: {
        true: 'border-destructive focus-visible:ring-destructive',
        false: '',
      },
    },
    defaultVariants: {
      zError: false,
    },
  },
);

export type ZardSelectVariants = VariantProps<typeof selectVariants>;
