import { cva, type VariantProps } from 'class-variance-authority';

export const loaderVariants = cva('animate-spin rounded-full border-2 border-current border-t-transparent', {
  variants: {
    zSize: {
      default: 'size-8',
      sm: 'size-4',
      lg: 'size-12',
    },
  },
  defaultVariants: {
    zSize: 'default',
  },
});

export type ZardLoaderSizeVariants = NonNullable<VariantProps<typeof loaderVariants>['zSize']>;
