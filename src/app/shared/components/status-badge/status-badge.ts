import { Component, computed, input } from '@angular/core';
import { ZardBadgeComponent } from '../badge/badge.component';

export type StatusType =
  | 'ativo'
  | 'agendado'
  | 'em_andamento'
  | 'pausado'
  | 'finalizado'
  | 'cancelado'
  | 'critico'
  | 'pendente'
  | 'enviado'
  | 'erro'
  | 'aberto'
  | 'reconhecido'
  | 'encerrado';

type ZardBadgeType = 'default' | 'secondary' | 'destructive' | 'outline';

interface StatusConfig {
  variant: ZardBadgeType;
  class?: string;
  label: string;
}

const STATUS_MAP: Record<StatusType, StatusConfig> = {
  ativo: { variant: 'default', class: 'bg-green-600 text-white hover:bg-green-700', label: 'Ativo' },
  agendado: { variant: 'secondary', class: 'bg-slate-400 text-white', label: 'Agendado' },
  em_andamento: { variant: 'default', class: 'bg-blue-600 text-white hover:bg-blue-700', label: 'Em andamento' },
  pausado: { variant: 'secondary', class: 'bg-amber-500 text-white', label: 'Pausado' },
  finalizado: { variant: 'secondary', class: 'bg-slate-500 text-white', label: 'Finalizado' },
  cancelado: { variant: 'destructive', label: 'Cancelado' },
  critico: { variant: 'destructive', label: 'Crítico' },
  pendente: { variant: 'secondary', class: 'bg-purple-600 text-white', label: 'Pendente' },
  enviado: { variant: 'default', class: 'bg-teal-600 text-white hover:bg-teal-700', label: 'Enviado' },
  erro: { variant: 'destructive', label: 'Erro' },
  aberto: { variant: 'secondary', class: 'bg-orange-600 text-white', label: 'Aberto' },
  reconhecido: { variant: 'default', class: 'bg-blue-600 text-white hover:bg-blue-700', label: 'Reconhecido' },
  encerrado: { variant: 'default', class: 'bg-green-600 text-white hover:bg-green-700', label: 'Encerrado' },
};

@Component({
  selector: 'gp-status-badge',
  imports: [ZardBadgeComponent],
  templateUrl: './status-badge.html',
  styleUrl: './status-badge.scss',
})
export class StatusBadge {
  status = input.required<StatusType>();

  config = computed(() => STATUS_MAP[this.status()] ?? STATUS_MAP['pendente']);
}
