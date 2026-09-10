import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ZardEmptyComponent } from '../empty/empty.component';

@Component({
  selector: 'gp-empty-state',
  imports: [ZardEmptyComponent],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  icon = input('inbox');
  title = input('Nenhum registro encontrado');
  description = input<string>();
}
