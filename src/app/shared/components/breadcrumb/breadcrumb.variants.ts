import { cva, type VariantProps } from 'class-variance-authority';

export const breadcrumbVariants = cva('flex items-center gap-1.5 text-muted-foreground', {
  variants: {
    zSize: {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
    },
    zAlign: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
    },
    zWrap: {
      wrap: 'flex-wrap',
      nowrap: 'flex-nowrap',
    },
  },
  defaultVariants: {
    zSize: 'md',
    zAlign: 'start',
    zWrap: 'wrap',
  },
});

export const breadcrumbEllipsisVariants = cva(
  'flex h-9 w-9 items-center justify-center rounded-md cursor-pointer transition-colors',
  {
    variants: {
      zColor: {
        muted: 'text-muted-foreground hover:text-foreground hover:bg-accent',
        strong: 'text-foreground hover:bg-accent',
      },
    },
    defaultVariants: {
      zColor: 'muted',
    },
  },
);

export const breadcrumbSeparatorVariants = cva('flex items-center text-muted-foreground [&>svg]:size-3.5');

export type ZardBreadcrumbSize = NonNullable<VariantProps<typeof breadcrumbVariants>['zSize']>;
export type ZardBreadcrumbAlign = NonNullable<VariantProps<typeof breadcrumbVariants>['zAlign']>;
export type ZardBreadcrumbWrap = NonNullable<VariantProps<typeof breadcrumbVariants>['zWrap']>;
export type ZardBreadcrumbEllipsisColor = NonNullable<VariantProps<typeof breadcrumbEllipsisVariants>['zColor']>;
