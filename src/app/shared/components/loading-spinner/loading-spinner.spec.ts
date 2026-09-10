import { TestBed } from '@angular/core/testing';
import { LoadingSpinner } from './loading-spinner';

describe('LoadingSpinner', () => {
  it('deve renderizar com mensagem', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [LoadingSpinner],
    }).createComponent(LoadingSpinner);

    fixture.componentRef.setInput('message', 'Carregando...');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Carregando...');
  });

  it('deve renderizar sem mensagem', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [LoadingSpinner],
    }).createComponent(LoadingSpinner);

    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
