import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { SessionService } from '@/shared/core/auth';
import { ThemeService } from '@/shared/services/theme.service';
import { ZardToastComponent } from '@/shared/components/toast';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ZardToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private readonly session = inject(SessionService);

  constructor() {
    inject(ThemeService);
  }

  ngOnInit(): void {
    if (this.session.usuario()) return;
    void this.session.carregar();
  }
}
