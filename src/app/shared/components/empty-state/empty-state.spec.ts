import { TestBed } from '@angular/core/testing';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('deve renderizar título e descrição', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [EmptyState],
    }).createComponent(EmptyState);

    fixture.componentRef.setInput('title', 'Nenhum resultado');
    fixture.componentRef.setInput('description', 'Tente novamente');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Nenhum resultado');
    expect(compiled.textContent).toContain('Tente novamente');
  });

  it('deve usar ícone padrão', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [EmptyState],
    }).createComponent(EmptyState);

    fixture.detectChanges();
    expect(fixture.componentInstance.icon()).toBe('inbox');
  });
});
