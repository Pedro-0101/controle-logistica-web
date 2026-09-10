import { Directive, EmbeddedViewRef, inject, Input, OnChanges, TemplateRef, ViewContainerRef } from '@angular/core';

@Directive({
  selector: '[zStringTemplateOutlet]',
  standalone: true,
})
export class ZardStringTemplateOutletDirective implements OnChanges {
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly templateRef = inject(TemplateRef<void>);

  private embeddedViewRef: EmbeddedViewRef<void> | null = null;

  @Input() zStringTemplateOutlet: unknown = null;

  ngOnChanges(): void {
    this.viewContainer.clear();

    if (this.embeddedViewRef) {
      this.embeddedViewRef.destroy();
      this.embeddedViewRef = null;
    }

    if (this.zStringTemplateOutlet instanceof TemplateRef) {
      this.embeddedViewRef = this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }
}
