import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { podeDecidir } from '../../core/auth/roles';
import { mensagemDeErroDaApi } from '../../core/http/api-error';
import { PageHeaderComponent, PageHeaderTab } from '../../shared/components/page-header/page-header.component';
import { RightDrawerComponent } from '../../shared/components/right-drawer/right-drawer.component';
import {
  ApprovalStep,
  DecisionAction,
  LoadState,
  MOTIVO_MINIMO_DA_DECISAO,
  RequestItem,
  RequestStatus,
} from './requests.models';
import { RequestsService } from './services/requests.service';

export type RequestTab = 'todas' | 'pendentes' | 'aprovadas' | 'ajustes' | 'rejeitadas';
export type RequestSort = 'recentes' | 'maior_valor' | 'menor_valor';

const STATUS_POR_ABA: Record<Exclude<RequestTab, 'todas'>, RequestStatus> = {
  pendentes: 'PENDENTE',
  aprovadas: 'APROVADA',
  ajustes: 'EM_AJUSTE',
  rejeitadas: 'REJEITADA',
};

const MENSAGEM_DE_SUCESSO: Record<DecisionAction, string> = {
  aprovar: 'aprovada',
  rejeitar: 'rejeitada',
  ajuste: 'devolvida para ajuste',
};

@Component({
  selector: 'app-requests',
  standalone: true,
  imports: [CommonModule, FormsModule, RightDrawerComponent, PageHeaderComponent],
  templateUrl: './requests.component.html',
  styleUrl: './requests.component.scss',
})
export class RequestsComponent implements OnInit {
  protected readonly requestsService = inject(RequestsService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Filtros e navegação
  readonly currentTab = signal<RequestTab>('todas');
  readonly searchQuery = signal<string>('');
  readonly selectedCategory = signal<string>('TODAS');
  readonly selectedCostCenter = signal<string>('TODOS');
  readonly sortBy = signal<RequestSort>('recentes');
  readonly showKpis = signal<boolean>(true);

  readonly headerTabs = computed<PageHeaderTab[]>(() => {
    const s = this.requestsService.stats();
    return [
      { id: 'todas', label: 'Todas', icon: 'apps', badge: s.total },
      { id: 'pendentes', label: 'Em Análise', icon: 'hourglass_top', badge: s.pendentes, badgeVariant: 'warning' },
      { id: 'aprovadas', label: 'Aprovadas', icon: 'verified', badge: s.aprovadas, badgeVariant: 'success' },
      { id: 'ajustes', label: 'Ajustes', icon: 'edit_note', badge: s.ajustes, badgeVariant: 'adjust' },
      { id: 'rejeitadas', label: 'Recusadas', icon: 'cancel', badge: s.rejeitadas, badgeVariant: 'danger' },
    ];
  });

  // Seleção e paginação
  readonly selectedIds = signal<Set<string>>(new Set());
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(10);

  // Drawers
  readonly isDetailDrawerOpen = signal<boolean>(false);
  readonly selectedRequest = signal<RequestItem | null>(null);

  // Toast
  readonly toastMessage = signal<string | null>(null);
  readonly toastType = signal<'success' | 'warning' | 'info'>('success');
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  // Detalhe: trilha (US-07) e decisão do aprovador (US-03)
  readonly trailSteps = signal<ApprovalStep[]>([]);
  readonly trailState = signal<LoadState>('carregando');
  readonly decisionMotivo = signal<string>('');
  readonly decisionError = signal<string | null>(null);
  readonly isDeciding = signal<boolean>(false);
  readonly motivoMinimo = MOTIVO_MINIMO_DA_DECISAO;

  readonly stats = this.requestsService.stats;

  /** Pode decidir: aprovador, solicitação pendente e não ser o autor (SoD — CA-04.1). */
  readonly canDecideSelected = computed(() => {
    const solicitacao = this.selectedRequest();
    const usuario = this.authService.currentUser();
    return (
      solicitacao !== null &&
      solicitacao.status === 'PENDENTE' &&
      podeDecidir(usuario?.role) &&
      solicitacao.solicitante.id !== usuario?.id
    );
  });

  readonly filteredRequests = computed<RequestItem[]>(() => {
    const aba = this.currentTab();
    const busca = this.searchQuery().trim().toLowerCase();
    const categoria = this.selectedCategory();
    const centro = this.selectedCostCenter();

    const lista = this.requestsService.requests().filter(
      (r) =>
        (aba === 'todas' || r.status === STATUS_POR_ABA[aba]) &&
        (categoria === 'TODAS' || r.categoria === categoria) &&
        (centro === 'TODOS' || r.centroCustoId === centro) &&
        (!busca ||
          [r.codigo, r.titulo, r.centroCustoNome, r.solicitante.nome].some((campo) =>
            campo.toLowerCase().includes(busca),
          )),
    );
    return ordenar(lista, this.sortBy());
  });

  readonly paginatedRequests = computed<RequestItem[]>(() => {
    const inicio = (this.currentPage() - 1) * this.pageSize();
    return this.filteredRequests().slice(inicio, inicio + this.pageSize());
  });

  readonly totalPages = computed<number>(() =>
    Math.max(1, Math.ceil(this.filteredRequests().length / this.pageSize())),
  );

  readonly isAllSelected = computed<boolean>(() => {
    const itens = this.paginatedRequests();
    const selecionados = this.selectedIds();
    return itens.length > 0 && itens.every((item) => selecionados.has(item.id));
  });

  ngOnInit(): void {
    this.requestsService.load();
    if (this.route.snapshot.queryParamMap.get('criada') === 'true') {
      this.showToast('Solicitação criada e enviada para aprovação.', 'success');
    }
  }

  reload(): void {
    this.requestsService.load();
  }

  // Filtros
  setTab(tab: RequestTab): void {
    this.currentTab.set(tab);
    this.currentPage.set(1);
  }

  setSearchQuery(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  setCategoryFilter(categoria: string): void {
    this.selectedCategory.set(categoria);
    this.currentPage.set(1);
  }

  setCostCenterFilter(centro: string): void {
    this.selectedCostCenter.set(centro);
    this.currentPage.set(1);
  }

  clearFilters(): void {
    this.setTab('todas');
    this.setSearchQuery('');
    this.setCategoryFilter('TODAS');
    this.setCostCenterFilter('TODOS');
  }

  setSortBy(sort: RequestSort): void {
    this.sortBy.set(sort);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  // Seleção
  toggleSelectAll(): void {
    const selecionados = new Set(this.selectedIds());
    const itens = this.paginatedRequests();
    const marcar = !this.isAllSelected();
    for (const item of itens) {
      if (marcar) {
        selecionados.add(item.id);
      } else {
        selecionados.delete(item.id);
      }
    }
    this.selectedIds.set(selecionados);
  }

  toggleSelect(id: string): void {
    const selecionados = new Set(this.selectedIds());
    if (!selecionados.delete(id)) {
      selecionados.add(id);
    }
    this.selectedIds.set(selecionados);
  }

  // Criação (US-02) — página própria
  goToCreatePage(): void {
    void this.router.navigate(['/solicitacoes/nova']);
  }

  // Detalhe e trilha
  openDetailDrawer(request: RequestItem): void {
    this.selectedRequest.set(request);
    this.decisionMotivo.set('');
    this.decisionError.set(null);
    this.isDetailDrawerOpen.set(true);
    this.loadTrail(request.id);
  }

  closeDetailDrawer(): void {
    this.isDetailDrawerOpen.set(false);
    this.selectedRequest.set(null);
  }

  loadTrail(id: string): void {
    this.trailState.set('carregando');
    this.requestsService.loadTrail(id).subscribe({
      next: (etapas) => {
        this.trailSteps.set(etapas);
        this.trailState.set('pronto');
      },
      error: () => this.trailState.set('erro'),
    });
  }

  // Decisão (T02 a T04)
  decide(acao: DecisionAction): void {
    const solicitacao = this.selectedRequest();
    if (!solicitacao) {
      return;
    }
    const motivo = this.decisionMotivo().trim();
    if (acao !== 'aprovar' && motivo.length < MOTIVO_MINIMO_DA_DECISAO) {
      this.decisionError.set(`Informe um motivo com pelo menos ${MOTIVO_MINIMO_DA_DECISAO} caracteres.`);
      return;
    }

    this.decisionError.set(null);
    this.isDeciding.set(true);
    this.requestsService.decide(solicitacao, acao, acao === 'aprovar' ? undefined : motivo).subscribe({
      next: (atualizada) => {
        this.isDeciding.set(false);
        this.selectedRequest.set(atualizada);
        this.decisionMotivo.set('');
        this.loadTrail(atualizada.id);
        this.showToast(`Solicitação ${atualizada.codigo} ${MENSAGEM_DE_SUCESSO[acao]}.`, 'success');
      },
      error: (erro: unknown) => {
        this.isDeciding.set(false);
        this.decisionError.set(mensagemDeErroDaApi(erro));
      },
    });
  }

  // Apresentação
  getStatusBadgeClass(status: RequestStatus): string {
    const classes: Record<RequestStatus, string> = {
      APROVADA: 'badge-success',
      PENDENTE: 'badge-warning',
      EM_AJUSTE: 'badge-adjust',
      REJEITADA: 'badge-danger',
    };
    return classes[status];
  }

  getStatusBadgeVariant(status: RequestStatus): 'success' | 'warning' | 'neutral' {
    if (status === 'APROVADA') return 'success';
    return status === 'PENDENTE' ? 'warning' : 'neutral';
  }

  getStepStatusIcon(step: ApprovalStep): string {
    const icones: Record<ApprovalStep['status'], string> = {
      CONCLUIDA: 'check_circle',
      EM_ANALISE: 'hourglass_top',
      AJUSTE: 'edit_note',
      REJEITADA: 'cancel',
      PENDENTE: 'radio_button_unchecked',
    };
    return icones[step.status];
  }

  toggleKpis(): void {
    this.showKpis.update((visivel) => !visivel);
  }

  showToast(message: string, type: 'success' | 'warning' | 'info' = 'success'): void {
    this.clearToastTimer();
    this.toastMessage.set(message);
    this.toastType.set(type);
    this.toastTimer = setTimeout(() => this.toastMessage.set(null), 4000);
  }

  closeToast(): void {
    this.clearToastTimer();
    this.toastMessage.set(null);
  }

  private clearToastTimer(): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
  }
}

function ordenar(lista: RequestItem[], criterio: RequestSort): RequestItem[] {
  const comparadores: Record<RequestSort, (a: RequestItem, b: RequestItem) => number> = {
    maior_valor: (a, b) => b.valor - a.valor,
    menor_valor: (a, b) => a.valor - b.valor,
    recentes: (a, b) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime(),
  };
  return [...lista].sort(comparadores[criterio]);
}
