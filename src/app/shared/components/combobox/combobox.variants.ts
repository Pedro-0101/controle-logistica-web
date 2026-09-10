import { cva, type VariantProps } from 'class-variance-authority';

import type { ZardButtonTypeVariants } from '@/shared/components/button/button.variants';

export const comboboxWidthVariants = cva('', {
  variants: {
    zWidth: {
      default: 'w-[200px]',
      sm: 'w-[150px]',
      md: 'w-[250px]',
      lg: 'w-[350px]',
      full: 'w-full',
    },
  },
  defaultVariants: {
    zWidth: 'default',
  },
});

export const comboboxPanelVariants = cva(
  'z-50 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md',
);

export const comboboxItemVariants = cva(
  'relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm py-1.5 px-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
);

export const comboboxGroupLabelVariants = cva('px-2 py-1.5 text-xs font-medium text-muted-foreground');

export type ZardComboboxWidthVariants = NonNullable<VariantProps<typeof comboboxWidthVariants>['zWidth']>;

export type ZardComboboxButtonVariant = Extract<ZardButtonTypeVariants, 'default' | 'outline' | 'secondary' | 'ghost'>;
