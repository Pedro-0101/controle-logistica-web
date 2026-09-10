import { TestBed } from '@angular/core/testing';
import { StatusBadge, StatusType } from './status-badge';

describe('StatusBadge', () => {
  it('deve criar com status em_andamento', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [StatusBadge],
    }).createComponent(StatusBadge);

    fixture.componentRef.setInput('status', 'em_andamento' as StatusType);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent?.trim()).toContain('Em andamento');
  });

  it('deve renderizar status aberto', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [StatusBadge],
    }).createComponent(StatusBadge);

    fixture.componentRef.setInput('status', 'aberto' as StatusType);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent?.trim()).toContain('Aberto');
  });

  it('deve usar pendente como fallback para status desconhecido', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [StatusBadge],
    }).createComponent(StatusBadge);

    fixture.componentRef.setInput('status', 'unknown' as StatusType);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent?.trim()).toContain('Pendente');
  });
});
