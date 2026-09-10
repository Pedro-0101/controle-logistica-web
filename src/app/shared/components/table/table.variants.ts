import { cva, type VariantProps } from 'class-variance-authority';

export const tableVariants = cva(
  'w-full caption-bottom text-sm [&_tr]:border-b [&_tr]:border-border [&_tbody_tr:last-child]:border-0 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-muted/50 [&_th]:text-left [&_th]:align-middle [&_th]:font-medium [&_th]:text-muted-foreground [&_td]:align-middle [&_th:first-child]:pl-4 [&_td:first-child]:pl-4 [&_caption]:mt-4 [&_caption]:text-sm [&_caption]:text-muted-foreground',
  {
    variants: {
      zType: {
        default: '',
        striped: '[&_tbody_tr:nth-child(even)]:bg-muted/50',
        bordered:
          'border border-border [&_th]:border-r [&_th]:border-border [&_td]:border-r [&_td]:border-border [&_th:last-child]:border-r-0 [&_td:last-child]:border-r-0',
      },
      zSize: {
        default: '[&_th]:h-10 [&_th]:px-2 [&_td]:p-2',
        compact: '[&_th]:h-8 [&_th]:px-2 [&_th]:text-xs [&_td]:p-1.5 [&_td]:text-xs',
        comfortable: '[&_th]:h-12 [&_th]:px-4 [&_td]:p-4',
      },
    },
    defaultVariants: {
      zType: 'default',
      zSize: 'default',
    },
  },
);

export const tableHeaderVariants = cva('bg-muted/50 [&_tr]:border-b [&_tr]:border-border');

export const tableBodyVariants = cva('[&_tr:last-child]:border-0');

export const tableRowVariants = cva(
  'border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
);

export const tableHeadVariants = cva(
  'text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
  {
    variants: {
      zSize: {
        default: 'h-10 px-2',
        compact: 'h-8 px-2 text-xs',
        comfortable: 'h-12 px-4',
      },
    },
    defaultVariants: {
      zSize: 'default',
    },
  },
);

export const tableCellVariants = cva('align-middle [&:has([role=checkbox])]:pr-0', {
  variants: {
    zSize: {
      default: 'p-2',
      compact: 'p-1.5 text-xs',
      comfortable: 'p-4',
    },
  },
  defaultVariants: {
    zSize: 'default',
  },
});

export const tableCaptionVariants = cva('mt-4 text-sm text-muted-foreground');

export type ZardTableVariants = VariantProps<typeof tableVariants>;
export type ZardTableTypeVariants = NonNullable<ZardTableVariants['zType']>;
export type ZardTableSizeVariants = NonNullable<ZardTableVariants['zSize']>;
