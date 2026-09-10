import { Component, computed, input } from '@angular/core';

export type AvatarSize = 'sm' | 'md' | 'lg';

const SIZE_MAP: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
};

interface AvatarResult {
  initials: string;
  backgroundColor: string;
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function buildInitials(name: string): string {
  const parts = normalizeName(name).split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const PALETTE = [
  'oklch(0.55 0.2 250)',
  'oklch(0.6 0.2 145)',
  'oklch(0.6 0.2 40)',
  'oklch(0.55 0.2 300)',
  'oklch(0.55 0.2 200)',
  'oklch(0.5 0.2 350)',
  'oklch(0.55 0.2 100)',
  'oklch(0.5 0.2 270)',
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function buildBackgroundColor(name: string): string {
  return PALETTE[hashString(normalizeName(name)) % PALETTE.length];
}

@Component({
  selector: 'gp-avatar',
  templateUrl: './gp-avatar.html',
  styleUrl: './gp-avatar.scss',
})
export class GpAvatarComponent {
  readonly name = input.required<string>();
  readonly size = input<AvatarSize>('md');

  protected readonly avatar = computed<AvatarResult>(() => {
    const name = this.name();
    return {
      initials: buildInitials(name),
      backgroundColor: buildBackgroundColor(name),
    };
  });

  protected readonly sizeClass = computed(() => SIZE_MAP[this.size()]);
}