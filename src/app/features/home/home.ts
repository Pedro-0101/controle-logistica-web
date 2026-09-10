import { Component, computed } from '@angular/core';

import { SiteHeader } from '@/shared/components/site-header/site-header';
import { CameraStream } from '@/shared/components/camera-stream';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-home',
  imports: [SiteHeader, CameraStream],
  template: `
    <app-site-header />

    <main class="mx-auto flex max-w-[1800px] flex-col gap-6 px-4 py-8">
      <div class="flex flex-col gap-1">
        <h1 class="text-lg font-semibold">Monitoramento de câmeras</h1>
        <p class="text-sm text-muted-foreground">
          Visualização em tempo real dos pontos de entrada e saída.
        </p>
      </div>

      <section class="grid gap-6 lg:grid-cols-2">
        @for (feed of feeds(); track feed.id) {
          <gp-camera-stream [src]="feed.src" [title]="feed.name" [anpr]="true" />
        }
      </section>
    </main>
  `,
})
export class Home {
  protected readonly feeds = computed(() =>
    environment.cameras.map((camera) => ({
      id: camera.id,
      name: camera.name,
      src: `${environment.mediaServerUrl}/${camera.hlsPath}`,
    })),
  );
}
