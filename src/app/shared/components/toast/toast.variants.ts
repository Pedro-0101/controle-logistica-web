import { cva, type VariantProps } from 'class-variance-authority';

export const toastVariants = cva(
  'group group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
  {
    variants: {
      zVariant: {
        default: 'group-[.toaster]:bg-background group-[.toaster]:text-foreground',
        destructive:
          'group-[.toaster]:bg-destructive group-[.toaster]:text-destructive-foreground group-[.toaster]:border-destructive',
      },
    },
    defaultVariants: {
      zVariant: 'default',
    },
  },
);

export type ZardToastVariants = NonNullable<VariantProps<typeof toastVariants>['zVariant']>;
