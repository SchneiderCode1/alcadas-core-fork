import { StatusSolicitacao } from '@alcadas-core/models';

/** Status da tela = status da API (ADR-005). */
export type RequestStatus = StatusSolicitacao;

export type ApprovalStepStatus = 'CONCLUIDA' | 'EM_ANALISE' | 'PENDENTE' | 'REJEITADA' | 'AJUSTE';

export interface ApprovalStep {
  numero: number;
  nome: string;
  papel: string;
  responsavelNome?: string;
  status: ApprovalStepStatus;
  dataHora?: string;
  comentario?: string;
  /** Hash SHA-256 do elo da trilha que registrou a etapa (ADR-006). */
  hashSha256?: string;
}

export interface WorkflowDestination {
  nome: string;
  totalEtapas: number;
  etapaAtualNome: string;
  etapas: ApprovalStep[];
}

/** Solicitação pronta para a tela, montada a partir do `SolicitacaoResponseDto` da API. */
export interface RequestItem {
  id: string;
  codigo: string;
  titulo: string;
  descricao: string;
  categoria: string;
  categoriaLabel: string;
  categoriaIcon: string;
  categoriaColor: string;
  centroCustoId: string;
  centroCustoNome: string;
  departamento: string;
  valor: number;
  fornecedor?: string;
  status: RequestStatus;
  statusLabel: string;
  statusIcon: string;
  /** Versão de concorrência otimista, obrigatória nas decisões (CA-05.1). */
  versao: number;
  dataCriacao: string;
  dataAtualizacao: string;
  solicitante: {
    id: string;
    nome: string;
    cargo: string;
  };
  fluxoDestinado: WorkflowDestination;
}

export interface RequestStats {
  total: number;
  totalPercentCompleted: number;
  pendentes: number;
  pendentesValorTotal: number;
  aprovadas: number;
  taxaAprovacao: number;
  ajustes: number;
  rejeitadas: number;
}

export interface CostCenterOption {
  id: string;
  code: string;
  nome: string;
}

export interface CategoryOption {
  id: string;
  label: string;
  icon: string;
  color: string;
  limiteBase: number;
}

/** Corpo de `POST /api/solicitacoes` (OpenAPI v0.2 — CriarSolicitacaoDto). */
export interface CreateRequestDto {
  centroCustoId: string;
  categoria: string;
  valor: number;
  justificativa: string;
  fornecedor?: string;
}

export type DecisionAction = 'aprovar' | 'rejeitar' | 'ajuste';

/** Tamanho mínimo do motivo ao rejeitar ou pedir ajuste (CA-03.2), igual ao validador da API. */
export const MOTIVO_MINIMO_DA_DECISAO = 10;

/** Estado de carregamento de uma tela ou bloco (RNF08). */
export type LoadState = 'carregando' | 'pronto' | 'erro';
