import {
  ApprovalTier,
  CATEGORIAS_SOLICITACAO,
  EloAuditoriaDto,
  SolicitacaoResponseDto,
  TipoEventoTrilha,
} from '@alcadas-core/models';
import {
  ApprovalStep,
  ApprovalStepStatus,
  CategoryOption,
  CostCenterOption,
  RequestItem,
  RequestStatus,
  WorkflowDestination,
} from './requests.models';

/** Ícone e cor de cada categoria do catálogo compartilhado (só apresentação). */
const VISUAL_DAS_CATEGORIAS: Record<string, { icon: string; color: string }> = {
  SERVICOS_TERCEIROS: { icon: 'handshake', color: '#0284c7' },
  EQUIPAMENTOS: { icon: 'devices', color: '#644ef3' },
  MATERIAL_ESCRITORIO: { icon: 'inventory_2', color: '#16a34a' },
};
const VISUAL_PADRAO = { icon: 'category', color: '#64748b' };

export const CATEGORY_OPTIONS: readonly CategoryOption[] = CATEGORIAS_SOLICITACAO.map((categoria) => ({
  ...categoria,
  ...(VISUAL_DAS_CATEGORIAS[categoria.id] ?? VISUAL_PADRAO),
}));

export const STATUS_VISUAL: Record<RequestStatus, { label: string; icon: string }> = {
  PENDENTE: { label: 'Em análise', icon: 'hourglass_top' },
  EM_AJUSTE: { label: 'Ajuste solicitado', icon: 'edit_note' },
  APROVADA: { label: 'Aprovada', icon: 'check_circle' },
  REJEITADA: { label: 'Rejeitada', icon: 'cancel' },
};

const ETAPA_DA_DECISAO: Record<RequestStatus, { status: ApprovalStepStatus; atual: string }> = {
  PENDENTE: { status: 'EM_ANALISE', atual: 'Aguardando aprovador' },
  EM_AJUSTE: { status: 'AJUSTE', atual: 'Aguardando ajuste do solicitante' },
  APROVADA: { status: 'CONCLUIDA', atual: 'Aprovada' },
  REJEITADA: { status: 'REJEITADA', atual: 'Rejeitada' },
};

const EVENTOS_DA_TRILHA: Record<TipoEventoTrilha, { nome: string; status: ApprovalStepStatus }> = {
  CRIACAO_SOLICITACAO: { nome: 'Solicitação criada', status: 'CONCLUIDA' },
  APROVACAO: { nome: 'Aprovação', status: 'CONCLUIDA' },
  REJEICAO: { nome: 'Rejeição', status: 'REJEITADA' },
  PEDIDO_AJUSTE: { nome: 'Pedido de ajuste', status: 'AJUSTE' },
  REENVIO_SOLICITACAO: { nome: 'Reenvio após ajuste', status: 'CONCLUIDA' },
  DELEGACAO_CRIADA: { nome: 'Delegação criada', status: 'CONCLUIDA' },
  DELEGACAO_EXPIRADA: { nome: 'Delegação expirada', status: 'CONCLUIDA' },
  BLOQUEIO_SOD: { nome: 'Bloqueio por segregação de funções', status: 'REJEITADA' },
  BLOQUEIO_FRACIONAMENTO: { nome: 'Bloqueio por fracionamento', status: 'REJEITADA' },
  ALERTA_DUPLICIDADE: { nome: 'Alerta de duplicidade', status: 'AJUSTE' },
};

const ORDEM_DOS_NIVEIS = ['N1', 'N2', 'N3'];
const TAMANHO_MAXIMO_DO_TITULO = 80;

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dataHora = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export interface ContextoDoMapeamento {
  centrosDeCusto: readonly CostCenterOption[];
  tetos: readonly ApprovalTier[];
  usuarioAtualId?: string;
}

export function paraRequestItem(dto: SolicitacaoResponseDto, contexto: ContextoDoMapeamento): RequestItem {
  const categoria = CATEGORY_OPTIONS.find((c) => c.id === dto.categoria);
  const centroDeCusto = contexto.centrosDeCusto.find((c) => c.id === dto.centroCustoId);
  const visualDoStatus = STATUS_VISUAL[dto.status];

  return {
    id: dto.id,
    codigo: `#${dto.id.toUpperCase()}`,
    titulo: resumir(dto.justificativa) || categoria?.label || dto.categoria,
    descricao: dto.justificativa,
    categoria: dto.categoria,
    categoriaLabel: categoria?.label ?? dto.categoria,
    categoriaIcon: categoria?.icon ?? VISUAL_PADRAO.icon,
    categoriaColor: categoria?.color ?? VISUAL_PADRAO.color,
    centroCustoId: dto.centroCustoId,
    centroCustoNome: centroDeCusto?.nome ?? dto.centroCustoId,
    departamento: centroDeCusto?.code ?? '',
    valor: dto.valor,
    fornecedor: dto.fornecedor,
    status: dto.status,
    statusLabel: visualDoStatus.label,
    statusIcon: visualDoStatus.icon,
    versao: dto.versao,
    dataCriacao: dto.createdAt,
    dataAtualizacao: dto.updatedAt,
    solicitante: {
      id: dto.solicitanteId,
      nome: dto.solicitanteId === contexto.usuarioAtualId ? 'Você' : dto.solicitanteId,
      cargo: 'Solicitante',
    },
    fluxoDestinado: fluxoDaAlcada(dto.valor, dto.status, contexto.tetos),
  };
}

/**
 * Nível de alçada que decide o valor (RN01): o primeiro nível cujo teto cobre o valor.
 * Sem tetos configurados no tenant, devolve undefined.
 */
export function nivelQueDecide(valor: number, tetos: readonly ApprovalTier[]): ApprovalTier | undefined {
  return [...tetos]
    .sort((a, b) => ORDEM_DOS_NIVEIS.indexOf(a.level) - ORDEM_DOS_NIVEIS.indexOf(b.level))
    .find((teto) => teto.unlimited || teto.maxAmount === null || valor <= teto.maxAmount);
}

export function fluxoDaAlcada(
  valor: number,
  status: RequestStatus,
  tetos: readonly ApprovalTier[],
): WorkflowDestination {
  const nivel = nivelQueDecide(valor, tetos);
  const decisao = ETAPA_DA_DECISAO[status];
  const nomeDoNivel = nivel
    ? `Alçada ${nivel.level} — ${nivel.unlimited || nivel.maxAmount === null ? 'sem limite' : `até ${moeda.format(nivel.maxAmount)}`}`
    : 'Alçada a definir (tetos não configurados)';

  return {
    nome: nomeDoNivel,
    totalEtapas: 2,
    etapaAtualNome: decisao.atual,
    etapas: [
      { numero: 1, nome: 'Submissão', papel: 'Solicitante', status: 'CONCLUIDA' },
      {
        numero: 2,
        nome: nivel ? `Decisão ${nivel.level}` : 'Decisão',
        papel: nivel?.roleTitle || nivel?.approverRole || 'Aprovador',
        status: decisao.status,
      },
    ],
  };
}

/** Converte os elos da trilha SHA-256 (US-07) em etapas da linha do tempo. */
export function etapasDaTrilha(elos: readonly EloAuditoriaDto[]): ApprovalStep[] {
  return [...elos]
    .sort((a, b) => a.sequencia - b.sequencia)
    .map((elo) => {
      const evento = EVENTOS_DA_TRILHA[elo.tipoEvento] ?? { nome: elo.tipoEvento, status: 'CONCLUIDA' as const };
      return {
        numero: elo.sequencia,
        nome: evento.nome,
        papel: elo.authorRole ?? 'Usuário',
        responsavelNome: elo.authorId,
        status: evento.status,
        dataHora: formatarDataHora(elo.timestampUtc),
        comentario: textoDoPayload(elo.payload, 'motivo') ?? textoDoPayload(elo.payload, 'observacao'),
        hashSha256: elo.hashAtual,
      };
    });
}

function resumir(texto: string): string {
  const limpo = texto.trim().replace(/\s+/g, ' ');
  return limpo.length > TAMANHO_MAXIMO_DO_TITULO ? `${limpo.slice(0, TAMANHO_MAXIMO_DO_TITULO - 1)}…` : limpo;
}

function formatarDataHora(iso: string): string | undefined {
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? undefined : dataHora.format(data);
}

function textoDoPayload(payload: Record<string, unknown>, chave: string): string | undefined {
  const valor = payload[chave];
  return typeof valor === 'string' && valor.trim() ? valor : undefined;
}
