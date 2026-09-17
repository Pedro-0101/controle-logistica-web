import {
  Directive,
  ElementRef,
  HostListener,
  inject,
  input,
  OnDestroy,
  Renderer2,
} from '@angular/core';

const TOOLTIP_GAP = 8;
const VIEWPORT_MARGIN = 8;
const TOOLTIP_ANIMATION_ID = 'z-tooltip-animation';

@Directive({
  selector: '[zTooltip]',
  exportAs: 'zTooltip',
})
export class ZardTooltipDirective implements OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);

  readonly zTooltip = input.required<string>();
  readonly zTooltipPosition = input<'top' | 'bottom' | 'left' | 'right'>('top');

  private tooltipElement: HTMLElement | null = null;

  @HostListener('mouseenter') onMouseEnter(): void {
    if (this.tooltipElement) return;
    this.createTooltip();
  }

  @HostListener('mouseleave') onMouseLeave(): void {
    this.destroyTooltip();
  }

  ngOnDestroy(): void {
    this.destroyTooltip();
  }

  private createTooltip(): void {
    const content = this.zTooltip();
    if (!content) return;

    const tooltip = this.renderer.createElement('div') as HTMLElement;
    tooltip.textContent = content;
    this.renderer.setAttribute(tooltip, 'role', 'tooltip');

    const styles = [
      'position: fixed',
      'z-index: 9999',
      'padding: 4px 8px',
      'font-size: 12px',
      'line-height: 1.4',
      'color: white',
      'background: hsl(240 3.7% 15.9%)',
      'border-radius: 6px',
      'white-space: pre-line',
      'max-width: 280px',
      'pointer-events: none',
      `animation: ${TOOLTIP_ANIMATION_ID} 0.15s ease-out`,
    ];
    this.renderer.setStyle(tooltip, 'cssText', styles.join(';'));

    this.renderer.appendChild(document.body, tooltip);
    this.tooltipElement = tooltip;

    const anchor = this.el.nativeElement.getBoundingClientRect();
    const box = tooltip.getBoundingClientRect();
    const pos = this.zTooltipPosition();

    let top: number;
    let left: number;
    switch (pos) {
      case 'bottom':
        top = anchor.bottom + TOOLTIP_GAP;
        left = anchor.left + anchor.width / 2 - box.width / 2;
        break;
      case 'left':
        top = anchor.top + anchor.height / 2 - box.height / 2;
        left = anchor.left - box.width - TOOLTIP_GAP;
        break;
      case 'right':
        top = anchor.top + anchor.height / 2 - box.height / 2;
        left = anchor.right + TOOLTIP_GAP;
        break;
      default:
        top = anchor.top - box.height - TOOLTIP_GAP;
        left = anchor.left + anchor.width / 2 - box.width / 2;
    }

    const maxLeft = window.innerWidth - box.width - VIEWPORT_MARGIN;
    const maxTop = window.innerHeight - box.height - VIEWPORT_MARGIN;
    left = Math.min(Math.max(VIEWPORT_MARGIN, left), Math.max(VIEWPORT_MARGIN, maxLeft));
    top = Math.min(Math.max(VIEWPORT_MARGIN, top), Math.max(VIEWPORT_MARGIN, maxTop));

    this.renderer.setStyle(tooltip, 'left', `${left}px`);
    this.renderer.setStyle(tooltip, 'top', `${top}px`);

    this.ensureAnimation();
  }

  private ensureAnimation(): void {
    if (document.getElementById(TOOLTIP_ANIMATION_ID)) return;

    const style = this.renderer.createElement('style') as HTMLStyleElement;
    style.id = TOOLTIP_ANIMATION_ID;
    style.textContent = `@keyframes ${TOOLTIP_ANIMATION_ID} { from { opacity: 0; } to { opacity: 1; } }`;
    this.renderer.appendChild(document.head, style);
  }

  private destroyTooltip(): void {
    if (this.tooltipElement) {
      this.tooltipElement.remove();
      this.tooltipElement = null;
    }
  }
}
