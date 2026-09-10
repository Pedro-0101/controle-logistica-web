import { cva, type VariantProps } from 'class-variance-authority';

export const checkboxVariants = cva(
    'peer h-4 w-4 shrink-0 cursor-pointer rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
);

export type ZardCheckboxVariants = VariantProps<typeof checkboxVariants>;
