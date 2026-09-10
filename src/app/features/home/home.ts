import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toast } from 'ngx-sonner';

import { SiteHeader } from '@/shared/components/site-header/site-header';
import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import { ZardInputDirective } from '@/shared/components/input';

@Component({
  selector: 'app-home',
  imports: [
    FormsModule,
    SiteHeader,
    ZardBadgeComponent,
    ZardButtonComponent,
    ZardCardComponent,
    ZardInputDirective,
  ],
  template: `
    <app-site-header />

    <main class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <section z-card>
        <div class="flex items-center justify-between gap-4">
          <div class="flex flex-col gap-1">
            <h1 class="text-lg font-semibold">Bem-vindo</h1>
            <p class="text-sm text-muted-foreground">Sistema iniciado com a biblioteca zard-ui.</p>
          </div>
          <z-badge zType="secondary" zShape="pill">Pronto</z-badge>
        </div>
      </section>

      <section z-card>
        <label class="mb-2 block text-sm font-medium" for="exemplo">Exemplo de input</label>
        <input z-input id="exemplo" [(ngModel)]="valor" placeholder="Digite algo..." />
        <button
          z-button
          zType="default"
          class="mt-4"
          (click)="salvar()"
        >
          Salvar
        </button>
      </section>
    </main>
  `,
})
export class Home {
  protected valor = '';

  protected salvar(): void {
    toast.success(`Valor salvo: "${this.valor}"`);
  }
}
