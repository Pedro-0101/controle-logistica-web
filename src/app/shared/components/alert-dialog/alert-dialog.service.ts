import { inject, Injectable } from '@angular/core';
import { ZardDialogOptions } from '../dialog/dialog.component';
import { ZardDialogRef } from '../dialog/dialog-ref';
import { ZardDialogService } from '../dialog/dialog.service';

@Injectable({ providedIn: 'root' })
export class ZardAlertDialogService {
  private readonly dialogService = inject(ZardDialogService);

  confirm<T = unknown, U = unknown>(options: ZardDialogOptions<T, U>): ZardDialogRef<T> {
    return this.dialogService.create<T, U>({
      zMaskClosable: false,
      zClosable: false,
      zWidth: '28rem',
      ...options,
    });
  }
}
