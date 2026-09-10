import { cva, type VariantProps } from 'class-variance-authority';

export const cardVariants = cva(
  'block rounded-2xl border bg-card text-card-foreground shadow-sm',
  {
    variants: {
      zType: {
        default: '',
        interactive: 'hover:shadow-md transition-shadow cursor-pointer',
      },
    },
    defaultVariants: {
      zType: 'default',
    },
  },
);

export type ZardCardVariants = VariantProps<typeof cardVariants>;
