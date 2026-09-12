import { Component } from '@angular/core';

import { SiteHeader } from '@/shared/components/site-header/site-header';
import { EmptyState } from '@/shared/components/empty-state/empty-state';

@Component({
  selector: 'app-home',
  imports: [SiteHeader, EmptyState],
  template: `
    <app-site-header />

    <main class="mx-auto flex max-w-[1800px] flex-col gap-6 px-4 py-8">
      <div class="flex flex-col gap-1">
        <h1 class="text-lg font-semibold">Dashboard</h1>
        <p class="text-sm text-muted-foreground">Visão geral das movimentações e operações.</p>
      </div>

      <gp-empty-state
        icon="lucideLayoutDashboard"
        title="Dashboard em desenvolvimento"
        description="O painel de movimentações será disponibilizado em breve."
      />
    </main>
  `,
})
export class Home {}
