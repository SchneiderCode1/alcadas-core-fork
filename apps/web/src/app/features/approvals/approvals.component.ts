import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
} from '../requests/requests.models';
import { RequestsService } from '../requests/services/requests.service';
import {
  DigitalSignatureModalComponent,
  SignatureConfirmation,
} from './components/digital-signature-modal/digital-signature-modal.component';

export type ApprovalsTab = 'pendentes' | 'ajustes' | 'aprovadas' | 'todas';
export type ApprovalsSort = 'recentes' | 'maior_valor' | 'menor_valor';
type ToastType = 'success' | 'warning' | 'error' | 'info';

const STATUS_POR_ABA: Record<Exclude<ApprovalsTab, 'todas'>, RequestStatus> = {
  pendentes: 'PENDENTE',
  ajustes: 'EM_AJUSTE',
  aprovadas: 'APROVADA',
};

const DURACAO_DO_TOAST_MS = 4500;

/**
 * Central de deliberação do aprovador (US-03), ligada à API: aprova (T02), rejeita (T03)
 * ou pede ajuste (T04) com a `versao` lida (CA-05.1) e mostra a trilha SHA-256 (US-07).
 * A SoD (CA-04.1) também é aplicada pela API; aqui ela só esconde ações que seriam recusadas.
 */
@Component({
  selector: 'app-approvals',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, RightDrawerComponent, DigitalSignatureModalComponent],
  templateUrl: './approvals.component.html',
  styleUrl: './approvals.component.scss',
})
export class ApprovalsComponent implements OnInit {
  readonly requestsService = inject(RequestsService);
  private readonly authService = inject(AuthService);

  readonly motivoMinimo = MOTIVO_MINIMO_DA_DECISAO;

  // Filtros e navegação
  readonly currentTab = signal<ApprovalsTab>('pendentes');
  readonly searchQuery = signal<string>('');
  readonly selectedDepartment = signal<string>('TODOS');
  readonly selectedCategory = signal<string>('TODAS');
  readonly selectedCostCenter = signal<string>('TODOS');
  readonly sortBy = signal<ApprovalsSort>('recentes');
  readonly showKpis = signal<boolean>(true);

  // Seleção e paginação
  readonly selectedIds = signal<Set<string>>(new Set());
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(10);

  // Detalhe e trilha
  readonly selectedRequest = signal<RequestItem | null>(null);
  readonly isDetailDrawerOpen = signal<boolean>(false);
  readonly trailSteps = signal<ApprovalStep[]>([]);
  readonly trailState = signal<LoadState>('carregando');

  // Assinatura (aprovação individual ou em lote)
  readonly signingRequest = signal<RequestItem | null>(null);
  readonly isSignModalOpen = signal<boolean>(false);
  readonly isBatchSignMode = signal<boolean>(false);

  // Ajuste e rejeição
  readonly adjustingRequest = signal<RequestItem | null>(null);
  readonly adjustmentReason = signal<string>('');
  readonly rejectingRequest = signal<RequestItem | null>(null);
  readonly rejectionReason = signal<string>('');

  readonly isDeciding = signal<boolean>(false);
  readonly toast = signal<{ title: string; message: string; type: ToastType } | null>(null);
  private toastTimer?: ReturnType<typeof setTimeout>;

  /** Nome mostrado como rubrica digitada no modal de assinatura. */
  readonly signatario = computed(() => {
    const usuario = this.authService.currentUser();
    return usuario?.name ?? usuario?.email ?? '';
  });

  readonly pendingCount = computed(() => this.contar('PENDENTE'));
  readonly adjustmentCount = computed(() => this.contar('EM_AJUSTE'));
  readonly approvedCount = computed(() => this.contar('APROVADA'));

  readonly pendingTotalValue = computed(() =>
    this.requestsService
      .requests()
      .filter((r) => r.status === 'PENDENTE')
      .reduce((soma, r) => soma + r.valor, 0),
  );

  readonly approvalRate = computed(() => {
    const decididas = this.approvedCount() + this.contar('REJEITADA');
    return decididas === 0 ? 0 : Math.round((this.approvedCount() / decididas) * 100);
  });

  readonly pendingPercent = computed(() => {
    const total = this.requestsService.requests().length;
    return total === 0 ? 0 : Math.round((this.pendingCount() / total) * 100);
  });

  readonly headerTabs = computed<PageHeaderTab[]>(() => [
    { id: 'pendentes', label: 'Para Deliberar', icon: 'hourglass_top', badge: this.pendingCount(), badgeVariant: 'warning' },
    {
      id: 'ajustes',
      label: 'Em Ajuste',
      icon: 'edit_note',
      badge: this.adjustmentCount(),
      badgeVariant: this.adjustmentCount() > 0 ? 'warning' : 'neutral',
    },
    { id: 'aprovadas', label: 'Aprovadas', icon: 'verified', badge: this.approvedCount(), badgeVariant: 'success' },
    { id: 'todas', label: 'Todas', icon: 'list_alt', badge: this.requestsService.requests().length, badgeVariant: 'neutral' },
  ]);

  readonly departments = computed(() =>
    [...new Set(this.requestsService.requests().map((r) => r.departamento).filter(Boolean))].sort(),
  );

  readonly filteredRequests = computed<RequestItem[]>(() => {
    const tab = this.currentTab();
    const termo = this.searchQuery().trim().toLowerCase();
    const departamento = this.selectedDepartment();
    const categoria = this.selectedCategory();
    const centroDeCusto = this.selectedCostCenter();

    const lista = this.requestsService
      .requests()
      .filter((r) => tab === 'todas' || r.status === STATUS_POR_ABA[tab])
      .filter((r) => departamento === 'TODOS' || r.departamento === departamento)
      .filter((r) => categoria === 'TODAS' || r.categoria === categoria)
      .filter((r) => centroDeCusto === 'TODOS' || r.centroCustoId === centroDeCusto)
      .filter((r) => !termo || correspondeABusca(r, termo));

    return ordenar(lista, this.sortBy());
  });

  readonly paginatedRequests = computed<RequestItem[]>(() => {
    const inicio = (this.currentPage() - 1) * this.pageSize();
    return this.filteredRequests().slice(inicio, inicio + this.pageSize());
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredRequests().length / this.pageSize())));

  readonly selectedItems = computed(() => {
    const ids = this.selectedIds();
    return this.requestsService.requests().filter((r) => ids.has(r.id));
  });

  /** Só entram no lote as selecionadas que este usuário pode decidir. */
  readonly decidableSelectedItems = computed(() => this.selectedItems().filter((r) => this.podeDecidirSobre(r)));

  readonly selectedTotalValue = computed(() => this.selectedItems().reduce((soma, r) => soma + r.valor, 0));

  readonly isAllSelected = computed(() => {
    const pagina = this.paginatedRequests();
    return pagina.length > 0 && pagina.every((r) => this.selectedIds().has(r.id));
  });

  ngOnInit(): void {
    this.requestsService.ensureLoaded();
  }

  reload(): void {
    this.requestsService.load();
  }

  /** Aprovador com papel de decisão, solicitação pendente e sem ser o autor (CA-04.1). */
  podeDecidirSobre(req: RequestItem): boolean {
    const usuario = this.authService.currentUser();
    return req.status === 'PENDENTE' && podeDecidir(usuario?.role) && req.solicitante.id !== usuario?.id;
  }

  // Abas, busca e filtros
  setTab(tab: ApprovalsTab): void {
    this.currentTab.set(tab);
    this.currentPage.set(1);
    this.clearSelection();
  }

  setSearchQuery(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  setDepartmentFilter(departamento: string): void {
    this.selectedDepartment.set(departamento);
    this.currentPage.set(1);
  }

  setCategoryFilter(categoria: string): void {
    this.selectedCategory.set(categoria);
    this.currentPage.set(1);
  }

  setCostCenterFilter(centroDeCusto: string): void {
    this.selectedCostCenter.set(centroDeCusto);
    this.currentPage.set(1);
  }

  clearFilters(): void {
    this.setTab('todas');
    this.setSearchQuery('');
    this.setDepartmentFilter('TODOS');
    this.setCategoryFilter('TODAS');
    this.setCostCenterFilter('TODOS');
  }

  setSortBy(ordem: ApprovalsSort): void {
    this.sortBy.set(ordem);
  }

  toggleKpis(): void {
    this.showKpis.update((v) => !v);
  }

  // Paginação
  setPage(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPages()) {
      this.currentPage.set(pagina);
    }
  }

  setPageSize(tamanho: number): void {
    this.pageSize.set(Number(tamanho));
    this.currentPage.set(1);
  }

  // Seleção
  toggleSelect(id: string): void {
    this.selectedIds.update((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) {
        proximo.delete(id);
      } else {
        proximo.add(id);
      }
      return proximo;
    });
  }

  toggleSelectAll(): void {
    if (this.isAllSelected()) {
      this.clearSelection();
      return;
    }
    const proximo = new Set(this.selectedIds());
    this.paginatedRequests().forEach((r) => proximo.add(r.id));
    this.selectedIds.set(proximo);
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  // Detalhe e trilha (US-07)
  openDetailDrawer(req: RequestItem): void {
    this.selectedRequest.set(req);
    this.isDetailDrawerOpen.set(true);
    this.trailSteps.set([]);
    this.trailState.set('carregando');
    this.requestsService.loadTrail(req.id).subscribe({
      next: (etapas) => {
        this.trailSteps.set(etapas);
        this.trailState.set('pronto');
      },
      error: () => this.trailState.set('erro'),
    });
  }

  closeDetailDrawer(): void {
    this.isDetailDrawerOpen.set(false);
  }

  // Aprovação (T02)
  openSignModal(req: RequestItem): void {
    this.signingRequest.set(req);
    this.isBatchSignMode.set(false);
    this.isSignModalOpen.set(true);
  }

  openBatchSignModal(): void {
    const decidiveis = this.decidableSelectedItems();
    if (decidiveis.length === 0) {
      return;
    }
    this.signingRequest.set(decidiveis[0]);
    this.isBatchSignMode.set(true);
    this.isSignModalOpen.set(true);
  }

  closeSignModal(): void {
    this.isSignModalOpen.set(false);
    this.signingRequest.set(null);
    this.isBatchSignMode.set(false);
  }

  onSignatureConfirmed(confirmacao: SignatureConfirmation): void {
    if (this.isBatchSignMode()) {
      this.aprovarEmLote(confirmacao.comentario);
      return;
    }
    const req = this.signingRequest();
    if (!req) {
      return;
    }
    this.decidir(req, 'aprovar', confirmacao.comentario, () => {
      this.closeSignModal();
      this.triggerToast('Solicitação aprovada', `${req.codigo} foi aprovada e registrada na trilha de auditoria.`, 'success');
    });
  }

  // Pedido de ajuste (T04)
  openAdjustmentModal(req: RequestItem): void {
    this.adjustingRequest.set(req);
    this.adjustmentReason.set('');
  }

  closeAdjustmentModal(): void {
    this.adjustingRequest.set(null);
  }

  confirmAdjustment(): void {
    const req = this.adjustingRequest();
    if (!req || !this.motivoValido(this.adjustmentReason())) {
      return;
    }
    this.decidir(req, 'ajuste', this.adjustmentReason(), () => {
      this.closeAdjustmentModal();
      this.triggerToast('Ajuste solicitado', `${req.codigo} voltou para o solicitante complementar.`, 'warning');
    });
  }

  // Rejeição (T03)
  openRejectModal(req: RequestItem): void {
    this.rejectingRequest.set(req);
    this.rejectionReason.set('');
  }

  closeRejectModal(): void {
    this.rejectingRequest.set(null);
  }

  confirmRejection(): void {
    const req = this.rejectingRequest();
    if (!req || !this.motivoValido(this.rejectionReason())) {
      return;
    }
    this.decidir(req, 'rejeitar', this.rejectionReason(), () => {
      this.closeRejectModal();
      this.triggerToast('Solicitação rejeitada', `${req.codigo} foi encerrada como rejeitada.`, 'error');
    });
  }

  /** O motivo precisa de pelo menos 10 caracteres (CA-03.2). */
  motivoValido(motivo: string): boolean {
    return motivo.trim().length >= MOTIVO_MINIMO_DA_DECISAO;
  }

  getStatusBadgeClass(status: RequestStatus): string {
    switch (status) {
      case 'APROVADA':
        return 'status-success';
      case 'PENDENTE':
        return 'status-warning';
      case 'EM_AJUSTE':
        return 'status-adjust';
      case 'REJEITADA':
        return 'status-danger';
      default:
        return 'status-neutral';
    }
  }

  getStatusBadgeVariant(status: RequestStatus): 'success' | 'warning' | 'neutral' {
    if (status === 'APROVADA') {
      return 'success';
    }
    return status === 'PENDENTE' ? 'warning' : 'neutral';
  }

  triggerToast(title: string, message: string, type: ToastType): void {
    clearTimeout(this.toastTimer);
    this.toast.set({ title, message, type });
    this.toastTimer = setTimeout(() => this.toast.set(null), DURACAO_DO_TOAST_MS);
  }

  private decidir(req: RequestItem, acao: DecisionAction, texto: string, aoConcluir: () => void): void {
    this.isDeciding.set(true);
    this.requestsService.decide(req, acao, texto).subscribe({
      next: () => {
        this.isDeciding.set(false);
        aoConcluir();
      },
      error: (erro: unknown) => {
        this.isDeciding.set(false);
        this.triggerToast('Não foi possível registrar a decisão', mensagemDeErroDaApi(erro), 'error');
      },
    });
  }

  private aprovarEmLote(observacao: string): void {
    this.isDeciding.set(true);
    this.requestsService.approveMany(this.decidableSelectedItems(), observacao).subscribe((resultado) => {
      this.isDeciding.set(false);
      this.closeSignModal();
      this.clearSelection();
      if (resultado.erros.length === 0) {
        this.triggerToast('Aprovação em lote concluída', `${resultado.aprovadas} solicitações aprovadas.`, 'success');
      } else {
        this.triggerToast(
          `${resultado.aprovadas} aprovadas, ${resultado.erros.length} com erro`,
          resultado.erros.join(' · '),
          'warning',
        );
      }
    });
  }

  private contar(status: RequestStatus): number {
    return this.requestsService.requests().filter((r) => r.status === status).length;
  }
}

function correspondeABusca(r: RequestItem, termo: string): boolean {
  return [r.codigo, r.titulo, r.solicitante.nome, r.departamento, r.centroCustoNome].some((campo) =>
    campo.toLowerCase().includes(termo),
  );
}

function ordenar(lista: RequestItem[], ordem: ApprovalsSort): RequestItem[] {
  const copia = [...lista];
  if (ordem === 'maior_valor') {
    return copia.sort((a, b) => b.valor - a.valor);
  }
  if (ordem === 'menor_valor') {
    return copia.sort((a, b) => a.valor - b.valor);
  }
  return copia.sort((a, b) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime());
}
