import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import {
  ApprovalTier,
  CostCenter,
  EloAuditoriaDto,
  SolicitacaoResponseDto,
} from '@alcadas-core/models';
import { Observable, catchError, forkJoin, map, of, tap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { APP_CONFIG } from '../../../core/config/app-config';
import { mensagemDeErroDaApi } from '../../../core/http/api-error';
import { CATEGORY_OPTIONS, ContextoDoMapeamento, etapasDaTrilha, paraRequestItem } from '../requests.mapper';
import {
  ApprovalStep,
  CostCenterOption,
  CreateRequestDto,
  DecisionAction,
  LoadState,
  RequestItem,
  RequestStats,
} from '../requests.models';

/** Quantidade lida por vez (máximo do contrato OpenAPI v0.2 — FinOps). */
export const TAMANHO_DA_PAGINA_DA_API = 50;

/**
 * Estado da Central de Solicitações ligado à API (Jornadas 1 a 3 e 5):
 * lista e submissão (`/solicitacoes`), centros de custo e tetos (`/centros-custo`, `/alcadas/tetos`),
 * decisões do aprovador e trilha.
 */
@Injectable({ providedIn: 'root' })
export class RequestsService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiBaseUrl = inject(APP_CONFIG).apiBaseUrl;

  readonly categories = CATEGORY_OPTIONS;

  private readonly _requests = signal<RequestItem[]>([]);
  private readonly _costCenters = signal<CostCenterOption[]>([]);
  private readonly _tiers = signal<ApprovalTier[]>([]);
  private readonly _loadState = signal<LoadState>('carregando');
  private readonly _loadError = signal<string | null>(null);

  readonly requests = this._requests.asReadonly();
  readonly costCenters = this._costCenters.asReadonly();
  readonly tiers = this._tiers.asReadonly();
  readonly loadState = this._loadState.asReadonly();
  readonly loadError = this._loadError.asReadonly();

  readonly stats = computed<RequestStats>(() => calcularIndicadores(this._requests()));

  getRequestById(id: string): RequestItem | undefined {
    return this._requests().find((r) => r.id === id);
  }

  /** Carrega só se ainda não houver dados (telas abertas direto pela URL). */
  ensureLoaded(): void {
    if (this._loadState() !== 'pronto') {
      this.load();
    }
  }

  /**
   * Carrega solicitações, centros de custo e tetos. Centros e tetos são complementares:
   * se falharem, a lista aparece mesmo assim (com nomes/alçadas genéricos).
   */
  load(): void {
    this._loadState.set('carregando');
    this._loadError.set(null);

    forkJoin({
      solicitacoes: this.http.get<SolicitacaoResponseDto[]>(`${this.apiBaseUrl}/solicitacoes`, {
        params: { page: 1, limit: TAMANHO_DA_PAGINA_DA_API },
      }),
      centros: this.http.get<CostCenter[]>(`${this.apiBaseUrl}/centros-custo`).pipe(catchError(() => of([]))),
      tetos: this.http.get<ApprovalTier[]>(`${this.apiBaseUrl}/alcadas/tetos`).pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ solicitacoes, centros, tetos }) => {
        this._costCenters.set(centros.map((c) => ({ id: c.id, code: c.code, nome: c.name })));
        this._tiers.set(tetos);
        this._requests.set(solicitacoes.map((dto) => paraRequestItem(dto, this.contexto())));
        this._loadState.set('pronto');
      },
      error: (erro: unknown) => {
        this._loadError.set(mensagemDeErroDaApi(erro));
        this._loadState.set('erro');
      },
    });
  }

  /** T01 — `POST /solicitacoes`. A nova solicitação entra no topo da lista. */
  create(dto: CreateRequestDto): Observable<RequestItem> {
    return this.http.post<SolicitacaoResponseDto>(`${this.apiBaseUrl}/solicitacoes`, dto).pipe(
      map((resposta) => paraRequestItem(resposta, this.contexto())),
      tap((criada) => this._requests.update((lista) => [criada, ...lista])),
    );
  }

  /**
   * T02/T03/T04 — aprovar, rejeitar ou pedir ajuste, sempre com a `versao` lida (CA-05.1).
   * `texto` é o motivo (obrigatório, ≥ 10 caracteres) ao rejeitar ou pedir ajuste (CA-03.2)
   * e a observação opcional ao aprovar.
   */
  decide(request: RequestItem, acao: DecisionAction, texto?: string): Observable<RequestItem> {
    const corpo = corpoDaDecisao(request.versao, acao, texto);
    return this.http
      .post<SolicitacaoResponseDto>(`${this.apiBaseUrl}/solicitacoes/${encodeURIComponent(request.id)}/${acao}`, corpo)
      .pipe(
        map((resposta) => paraRequestItem(resposta, this.contexto())),
        tap((atualizada) =>
          this._requests.update((lista) => lista.map((item) => (item.id === atualizada.id ? atualizada : item))),
        ),
      );
  }

  /**
   * Aprovação em lote: cada solicitação vai à API com a própria versão. Uma falha não interrompe
   * as demais; o resultado informa quantas foram aprovadas e as mensagens de erro.
   */
  approveMany(requests: readonly RequestItem[], observacao?: string): Observable<ResultadoEmLote> {
    if (requests.length === 0) {
      return of({ aprovadas: 0, erros: [] });
    }
    return forkJoin(
      requests.map((request) =>
        this.decide(request, 'aprovar', observacao).pipe(
          map(() => null),
          catchError((erro: unknown) => of(`${request.codigo}: ${mensagemDeErroDaApi(erro)}`)),
        ),
      ),
    ).pipe(
      map((resultados) => {
        const erros = resultados.filter((r): r is string => r !== null);
        return { aprovadas: resultados.length - erros.length, erros };
      }),
    );
  }

  /** US-07 — linha do tempo da trilha SHA-256 da solicitação. */
  loadTrail(id: string): Observable<ApprovalStep[]> {
    return this.http
      .get<EloAuditoriaDto[]>(`${this.apiBaseUrl}/solicitacoes/${encodeURIComponent(id)}/trilha`)
      .pipe(map(etapasDaTrilha));
  }

  private contexto(): ContextoDoMapeamento {
    return {
      centrosDeCusto: this._costCenters(),
      tetos: this._tiers(),
      usuarioAtualId: this.authService.currentUser()?.id,
    };
  }
}

export interface ResultadoEmLote {
  aprovadas: number;
  erros: string[];
}

function corpoDaDecisao(versao: number, acao: DecisionAction, texto?: string): Record<string, unknown> {
  const textoLimpo = texto?.trim();
  if (acao === 'aprovar') {
    return textoLimpo ? { versao, observacao: textoLimpo } : { versao };
  }
  return { versao, motivo: textoLimpo };
}

function calcularIndicadores(lista: readonly RequestItem[]): RequestStats {
  const total = lista.length;
  const contar = (status: RequestItem['status']) => lista.filter((r) => r.status === status);
  const pendentes = contar('PENDENTE');
  const aprovadas = contar('APROVADA').length;
  const rejeitadas = contar('REJEITADA').length;
  const percentual = (parte: number) => (total > 0 ? Math.round((parte / total) * 100) : 0);

  return {
    total,
    totalPercentCompleted: percentual(aprovadas + rejeitadas),
    pendentes: pendentes.length,
    pendentesValorTotal: pendentes.reduce((soma, r) => soma + r.valor, 0),
    aprovadas,
    taxaAprovacao: percentual(aprovadas),
    ajustes: contar('EM_AJUSTE').length,
    rejeitadas,
  };
}
