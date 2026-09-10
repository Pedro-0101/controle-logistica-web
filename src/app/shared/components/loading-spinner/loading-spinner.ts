import { Component, input } from '@angular/core';
import { ZardLoaderComponent } from '../loader/loader.component';

@Component({
  selector: 'gp-loading-spinner',
  imports: [ZardLoaderComponent],
  templateUrl: './loading-spinner.html',
  styleUrl: './loading-spinner.scss',
})
export class LoadingSpinner {
  message = input<string>();
  diameter = input(48);
}
