import { cva, type VariantProps } from 'class-variance-authority';

export const segmentedVariants = cva(
  'inline-flex items-center p-1 bg-muted text-muted-foreground rounded-lg',
  {
    variants: {
      zSize: {
        sm: 'h-8',
        default: 'h-10',
        lg: 'h-12',
      },
    },
    defaultVariants: {
      zSize: 'default',
    },
  },
);

export const segmentItemVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm hover:text-foreground cursor-pointer',
  {
    variants: {
      zSize: {
        sm: 'px-2.5 py-1 text-xs flex-1',
        default: 'px-3 py-1.5 text-sm flex-1',
        lg: 'px-4 py-2 text-base flex-1',
      },
    },
    defaultVariants: {
      zSize: 'default',
    },
  },
);

export type ZardSegmentedVariants = VariantProps<typeof segmentedVariants>;
export type ZardSegmentedSizeVariants = NonNullable<VariantProps<typeof segmentedVariants>['zSize']>;
