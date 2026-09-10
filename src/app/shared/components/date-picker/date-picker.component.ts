import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, output, signal, TemplateRef, viewChild, ViewContainerRef, ViewEncapsulation } from '@angular/core';
import { Overlay, OverlayModule } from '@angular/cdk/overlay';
import { TemplatePortal, PortalModule } from '@angular/cdk/portal';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCalendar, lucideChevronLeft, lucideChevronRight } from '@ng-icons/lucide';
import type { ClassValue } from 'clsx';

import { mergeClasses } from '@/shared/utils/merge-classes';

import { datePickerVariants, type ZardDatePickerSizeVariants, type ZardDatePickerTypeVariants } from './date-picker.variants';

const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'] as const;

type FormatPart = { type: 'literal'; value: string } | { type: 'token'; token: string };

function parseFormat(format: string): FormatPart[] {
  const parts: FormatPart[] = [];
  let i = 0;
  while (i < format.length) {
    if (/[yMdE]/.test(format[i])) {
      let token = '';
      while (i < format.length && /[yMdE]/.test(format[i])) {
        token += format[i];
        i++;
      }
      parts.push({ type: 'token', token });
    } else {
      let literal = '';
      while (i < format.length && !/[yMdE]/.test(format[i])) {
        literal += format[i];
        i++;
      }
      parts.push({ type: 'literal', value: literal });
    }
  }
  return parts;
}

function formatDate(date: Date, format: string): string {
  const parts = parseFormat(format);
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const weekDay = date.getDay();

  return parts.map((p) => {
    if (p.type === 'literal') return p.value;
    switch (p.token) {
      case 'yyyy': return String(year);
      case 'yy': return String(year).slice(-2);
      case 'MMMM': return MONTHS[month];
      case 'MMM': return MONTHS[month].slice(0, 3);
      case 'MM': return String(month + 1).padStart(2, '0');
      case 'M': return String(month + 1);
      case 'dd': return String(day).padStart(2, '0');
      case 'd': return String(day);
      case 'EEEE': return ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][weekDay];
      case 'EEE': return DAYS_OF_WEEK[weekDay];
      default: return p.token;
    }
  }).join('');
}

function toDateKey(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

interface DayCell {
  day: number;
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isRangeStart: boolean;
  isRangeEnd: boolean;
  isInRange: boolean;
  isPreview: boolean;
  isDisabled: boolean;
}

@Component({
  selector: 'z-date-picker',
  imports: [OverlayModule, PortalModule, NgIcon],
  template: `
    <button
      type="button"
      [class]="triggerClasses()"
      [disabled]="disabled()"
      (click)="toggleCalendar()"
      (keydown.enter)="toggleCalendar()"
      (keydown.space)="toggleCalendar()"
    >
      <span>{{ displayText() }}</span>
      <ng-icon name="lucideCalendar" class="size-4 shrink-0 opacity-50" />
    </button>

    <ng-template #calendarPortal>
      <div class="bg-background border border-border rounded-lg shadow-lg p-4 w-[280px]" (mousedown)="$event.preventDefault()" (mouseleave)="onGridLeave()">
        <div class="flex items-center justify-between mb-3">
          <button
            type="button"
            tabindex="0"
            class="inline-flex items-center justify-center size-7 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            (click)="previousMonth()"
            (keydown.enter)="previousMonth()"
            aria-label="Mês anterior"
          >
            <ng-icon name="lucideChevronLeft" class="size-4" />
          </button>
          <span class="text-sm font-medium">{{ headerText() }}</span>
          <button
            type="button"
            tabindex="0"
            class="inline-flex items-center justify-center size-7 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            (click)="nextMonth()"
            (keydown.enter)="nextMonth()"
            aria-label="Próximo mês"
          >
            <ng-icon name="lucideChevronRight" class="size-4" />
          </button>
        </div>

        @if (zRange() && showHint()) {
          <div class="text-xs text-muted-foreground text-center mb-2">
            Selecione a data de início e depois a data de término
          </div>
        }

        <div class="grid grid-cols-7 mb-1">
          @for (day of weekDays; track day) {
            <span class="text-xs text-muted-foreground text-center h-7 leading-7">{{ day }}</span>
          }
        </div>

        <div class="grid grid-cols-7 -mx-px">
          @for (cell of calendarCells(); track cell.date.toISOString()) {
            <button
              type="button"
              tabindex="0"
              class="inline-flex items-center justify-center w-full h-8 text-sm transition-colors
                disabled:opacity-30 disabled:pointer-events-none cursor-pointer
                focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
              [class.text-muted-foreground]="!cell.isCurrentMonth"
              [class.bg-accent]="cell.isToday && !cell.isRangeStart && !cell.isRangeEnd && !cell.isInRange && !cell.isPreview"
              [class.bg-primary/20]="cell.isInRange"
              [class.bg-primary/10]="cell.isPreview && !cell.isInRange"
              [class.bg-primary]="cell.isRangeStart || cell.isRangeEnd"
              [class.text-primary-foreground]="cell.isRangeStart || cell.isRangeEnd"
              [class.rounded-l-full]="cell.isRangeStart"
              [class.rounded-r-full]="cell.isRangeEnd"
              [class.hover:bg-accent]="!cell.isRangeStart && !cell.isRangeEnd"
              [class.hover:text-accent-foreground]="!cell.isRangeStart && !cell.isRangeEnd"
              [disabled]="cell.isDisabled"
              (mouseenter)="onCellHover(cell.date)"
              (click)="selectDate(cell.date)"
              (keydown.enter)="selectDate(cell.date)"
            >
              {{ cell.day }}
            </button>
          }
        </div>
      </div>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'classes()',
  },
  viewProviders: [provideIcons({ lucideCalendar, lucideChevronLeft, lucideChevronRight })],
})
export class ZardDatePickerComponent {
  private readonly overlay = inject(Overlay);
  private readonly elementRef = inject(ElementRef);
  private readonly viewContainerRef = inject(ViewContainerRef);

  readonly calendarTemplate = viewChild<TemplateRef<unknown>>('calendarPortal');

  readonly value = input<Date | null>(null);
  readonly zRange = input(false);
  readonly zRangeStart = input<Date | null>(null);
  readonly zRangeEnd = input<Date | null>(null);
  readonly placeholder = input('Selecionar data');
  readonly zType = input<ZardDatePickerTypeVariants>('outline');
  readonly zSize = input<ZardDatePickerSizeVariants>('default');
  readonly zFormat = input('yyyy-MM-dd');
  readonly minDate = input<Date | null>(null);
  readonly maxDate = input<Date | null>(null);
  readonly disabled = input(false);
  readonly class = input<ClassValue>('');

  readonly dateChange = output<Date | null>();
  readonly dateRangeChange = output<{ start: Date | null; end: Date | null }>();

  readonly weekDays = DAYS_OF_WEEK;

  private readonly currentValue = signal<Date | null>(null);
  readonly rangeStart = signal<Date | null>(null);
  readonly rangeEnd = signal<Date | null>(null);
  readonly viewDate = signal(new Date());
  readonly hoverDate = signal<Date | null>(null);
  private overlayRef: ReturnType<typeof this.overlay.create> | null = null;

  readonly showHint = computed(() => {
    if (!this.zRange()) return false;
    const s = this.rangeStart();
    const e = this.rangeEnd();
    return s === null || (s !== null && e === null);
  });

  readonly displayText = computed(() => {
    if (this.zRange()) {
      const s = this.rangeStart();
      const e = this.rangeEnd();
      if (!s && !e) return 'Selecionar período';
      if (s && !e) return `${formatDate(s, 'dd/MM')} - ...`;
      if (s && e) return `${formatDate(s, 'dd/MM/yyyy')} - ${formatDate(e, 'dd/MM/yyyy')}`;
      return 'Selecionar período';
    }
    const v = this.currentValue();
    if (!v) return this.placeholder();
    return formatDate(v, this.zFormat());
  });

  readonly headerText = computed(() => {
    const v = this.viewDate();
    return `${MONTHS[v.getMonth()]} ${v.getFullYear()}`;
  });

  readonly calendarCells = computed(() => {
    const view = this.viewDate();
    const year = view.getFullYear();
    const month = view.getMonth();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const min = this.minDate();
    const max = this.maxDate();
    const isRange = this.zRange();
    const rs = this.rangeStart();
    const re = this.rangeEnd();
    const hov = this.hoverDate();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();

    const cells: DayCell[] = [];

    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      cells.push(this.createCell(d, false, today, isRange, rs, re, hov, min, max));
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      cells.push(this.createCell(date, true, today, isRange, rs, re, hov, min, max));
    }

    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(year, month + 1, d);
      cells.push(this.createCell(date, false, today, isRange, rs, re, hov, min, max));
    }

    return cells;
  });

  readonly triggerClasses = computed(() =>
    mergeClasses(
      datePickerVariants({ zType: this.zType(), zSize: this.zSize() }),
      this.class(),
    ),
  );

  protected readonly classes = computed(() => '');

  constructor() {
    effect(() => {
      this.currentValue.set(this.value());
    });
    effect(() => {
      this.rangeStart.set(this.zRangeStart());
    });
    effect(() => {
      this.rangeEnd.set(this.zRangeEnd());
    });
  }

  toggleCalendar(): void {
    if (this.disabled()) return;
    if (this.overlayRef) {
      this.closeCalendar();
    } else {
      this.openCalendar();
    }
  }

  private openCalendar(): void {
    const template = this.calendarTemplate();
    if (!template) return;

    const portal = new TemplatePortal(template, this.viewContainerRef);

    this.overlayRef = this.overlay.create({
      positionStrategy: this.overlay
        .position()
        .flexibleConnectedTo(this.elementRef)
        .withPositions([
          { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
          { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
        ]),
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
    });

    this.overlayRef.backdropClick().subscribe(() => this.closeCalendar());
    this.overlayRef.detachments().subscribe(() => {
      this.overlayRef = null;
    });

    const target = this.zRange() ? this.rangeEnd() : this.currentValue();
    if (target) {
      this.viewDate.set(new Date(target.getFullYear(), target.getMonth(), 1));
    }

    this.overlayRef.attach(portal);
  }

  private closeCalendar(): void {
    if (this.overlayRef) {
      this.overlayRef.detach();
      this.overlayRef = null;
    }
  }

  previousMonth(): void {
    this.viewDate.update((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  nextMonth(): void {
    this.viewDate.update((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  onCellHover(date: Date): void {
    this.hoverDate.set(date);
  }

  onGridLeave(): void {
    this.hoverDate.set(null);
  }

  selectDate(date: Date): void {
    if (this.zRange()) {
      const s = this.rangeStart();
      const e = this.rangeEnd();

      if (s && e) {
        if (toDateKey(date) === toDateKey(s)) {
          this.rangeStart.set(null);
          this.dateRangeChange.emit({ start: null, end: e });
          return;
        }
        if (toDateKey(date) === toDateKey(e)) {
          this.rangeEnd.set(null);
          this.dateRangeChange.emit({ start: s, end: null });
          return;
        }
        this.rangeStart.set(date);
        this.rangeEnd.set(null);
        this.dateRangeChange.emit({ start: date, end: null });
        return;
      }

      if (!s) {
        this.rangeStart.set(date);
        this.rangeEnd.set(null);
        this.dateRangeChange.emit({ start: date, end: null });
      } else {
        if (toDateKey(date) < toDateKey(s)) {
          this.rangeStart.set(date);
          this.rangeEnd.set(s);
          this.dateRangeChange.emit({ start: date, end: s });
        } else if (toDateKey(date) === toDateKey(s)) {
          this.rangeStart.set(null);
          this.rangeEnd.set(null);
          this.dateRangeChange.emit({ start: null, end: null });
        } else {
          this.rangeEnd.set(date);
          this.dateRangeChange.emit({ start: s, end: date });
        }
      }
    } else {
      this.currentValue.set(date);
      this.dateChange.emit(date);
      this.closeCalendar();
    }
  }

  private createCell(date: Date, isCurrentMonth: boolean, today: Date, isRange: boolean, rs: Date | null, re: Date | null, hov: Date | null, min: Date | null, max: Date | null): DayCell {
    const d = toDateKey(date);
    const t = toDateKey(today);

    let isRangeStart = false;
    let isRangeEnd = false;
    let isInRange = false;
    let isPreview = false;

    if (isRange && rs && re) {
      const startKey = toDateKey(rs);
      const endKey = toDateKey(re);
      isRangeStart = d === startKey;
      isRangeEnd = d === endKey;
      isInRange = d > startKey && d < endKey;
    } else if (isRange && rs && !re) {
      isRangeStart = d === toDateKey(rs);
      if (hov) {
        const hovKey = toDateKey(hov);
        const rsKey = toDateKey(rs);
        if (hovKey !== rsKey) {
          const lo = Math.min(rsKey, hovKey);
          const hi = Math.max(rsKey, hovKey);
          isPreview = d > lo && d < hi;
        }
      }
    }

    return {
      day: date.getDate(),
      date,
      isCurrentMonth,
      isToday: d === t,
      isRangeStart,
      isRangeEnd,
      isInRange,
      isPreview,
      isDisabled: (min !== null && d < toDateKey(min)) || (max !== null && d > toDateKey(max)),
    };
  }
}
