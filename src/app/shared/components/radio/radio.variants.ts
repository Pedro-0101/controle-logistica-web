import { cva, type VariantProps } from 'class-variance-authority';

export const radioVariants = cva(
  'grid place-items-center h-4 w-4 shrink-0 overflow-visible text-foreground disabled:cursor-not-allowed disabled:opacity-50',
);

export type ZardRadioVariants = VariantProps<typeof radioVariants>;
