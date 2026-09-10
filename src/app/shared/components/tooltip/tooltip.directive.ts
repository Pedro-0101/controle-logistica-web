import { Directive, ElementRef, HostListener, inject, input, OnDestroy, Renderer2 } from '@angular/core';

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

    this.tooltipElement = this.renderer.createElement('div');
    this.tooltipElement!.textContent = content;
    this.renderer.setAttribute(this.tooltipElement!, 'role', 'tooltip');

    const styles = [
      'position: absolute',
      'z-index: 9999',
      'padding: 4px 8px',
      'font-size: 12px',
      'line-height: 1.4',
      'color: white',
      'background: hsl(240 3.7% 15.9%)',
      'border-radius: 6px',
      'white-space: nowrap',
      'pointer-events: none',
      'animation: tooltip-fade-in 0.15s ease-out',
    ];

    const rect = this.el.nativeElement.getBoundingClientRect();
    const pos = this.zTooltipPosition();

    let left: number, top: number;
    switch (pos) {
      case 'bottom': top = rect.bottom + 4; left = rect.left + rect.width / 2; styles.push('transform: translateX(-50%)'); break;
      case 'left': top = rect.top + rect.height / 2; left = rect.left - 8; styles.push('transform: translate(-100%, -50%)'); break;
      case 'right': top = rect.top + rect.height / 2; left = rect.right + 4; styles.push('transform: translateY(-50%)'); break;
      default: top = rect.top - 4; left = rect.left + rect.width / 2; styles.push('transform: translate(-50%, -100%)'); break;
    }

    this.renderer.setStyle(this.tooltipElement!, 'cssText', styles.join(';'));
    this.renderer.setStyle(this.tooltipElement!, 'top', `${top}px`);
    this.renderer.setStyle(this.tooltipElement!, 'left', `${left}px`);

    const style = this.renderer.createElement('style');
    style.textContent =
      '@keyframes tooltip-fade-in { from { opacity: 0; transform: translate(-50%, -100%) scale(0.9); } to { opacity: 1; transform: translate(-50%, -100%) scale(1); } }';
    this.renderer.appendChild(document.head, style);

    this.renderer.appendChild(document.body, this.tooltipElement!);
  }

  private destroyTooltip(): void {
    if (this.tooltipElement) {
      this.tooltipElement.remove();
      this.tooltipElement = null;
    }
  }
}
