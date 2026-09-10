import { cva } from 'class-variance-authority';

export const emptyVariants = cva('flex flex-col items-center justify-center text-center', {
  variants: {
    zSize: {
      default: 'py-12',
      sm: 'py-4',
    },
  },
  defaultVariants: {
    zSize: 'default',
  },
});

export const emptyIconVariants = cva('text-muted-foreground block', {
  variants: {
    zSize: {
      default: 'text-4xl mb-4',
      sm: 'text-[1.8rem] mb-0 leading-none',
    },
  },
  defaultVariants: {
    zSize: 'default',
  },
});

export const emptyTitleVariants = cva('text-muted-foreground', {
  variants: {
    zSize: {
      default: 'text-lg font-semibold mb-1 text-foreground',
      sm: 'text-[1.1rem] font-normal',
    },
  },
  defaultVariants: {
    zSize: 'default',
  },
});

export const emptyDescriptionVariants = cva('text-muted-foreground max-w-md', {
  variants: {
    zSize: {
      default: 'text-sm',
      sm: 'text-xs',
    },
  },
  defaultVariants: {
    zSize: 'default',
  },
});
