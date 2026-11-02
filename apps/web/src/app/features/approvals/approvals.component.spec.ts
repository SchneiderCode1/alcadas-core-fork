import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SolicitacaoResponseDto } from '@alcadas-core/models';
import { AuthUser } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';
import { APP_CONFIG } from '../../core/config/app-config';
import { eloDaApi, solicitacaoDaApi, tetoDaApi } from '../../core/testing/api-fixtures';
import { CONFIG_DE_TESTE } from '../../core/testing/test-config';
import { RequestItem } from '../requests/requests.models';
import { ApprovalsComponent } from './approvals.component';

const URL_LISTA = '/api/solicitacoes?page=1&limit=50';

describe('ApprovalsComponent (US-03)', () => {
  let fixture: ComponentFixture<ApprovalsComponent>;
  let component: ApprovalsComponent;
  let http: HttpTestingController;
  let usuario: AuthUser;

  const solicitacoes: SolicitacaoResponseDto[] = [
    solicitacaoDaApi({ id: 'sol-001', solicitanteId: 'ana', valor: 3200 }),
    solicitacaoDaApi({ id: 'sol-002', solicitanteId: 'ana', valor: 900, createdAt: '2026-10-28T10:00:00.000Z' }),
    solicitacaoDaApi({ id: 'sol-003', solicitanteId: 'carlos', valor: 450 }),
    solicitacaoDaApi({ id: 'sol-004', solicitanteId: 'ana', status: 'APROVADA', versao: 2, valor: 1200 }),
    solicitacaoDaApi({ id: 'sol-005', solicitanteId: 'ana', status: 'EM_AJUSTE', versao: 2, categoria: 'EQUIPAMENTOS' }),
  ];

  function texto(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function iniciar(): void {
    fixture = TestBed.createComponent(ApprovalsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function responderCarga(lista = solicitacoes): void {
    http.expectOne(URL_LISTA).flush(lista);
    http
      .expectOne('/api/centros-custo')
      .flush([{ id: 'cc-clinica-centro', tenantId: 'startop', code: 'CC-CENTRO', name: 'Clínica Centro', isActive: true, createdAt: '', updatedAt: '' }]);
    http.expectOne('/api/alcadas/tetos').flush([tetoDaApi('N1', 1000), tetoDaApi('N2', 5000), tetoDaApi('N3', null)]);
    fixture.detectChanges();
  }

  function item(id: string): RequestItem {
    const encontrado = component.requestsService.getRequestById(id);
    if (!encontrado) throw new Error(`solicitação ${id} não carregada`);
    return encontrado;
  }

  beforeEach(async () => {
    usuario = { id: 'carlos', email: 'gerente@startop.test', name: 'Carlos', role: 'APROVADOR_N2', tenantId: 'startop' };
    await TestBed.configureTestingModule({
      imports: [ApprovalsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: CONFIG_DE_TESTE },
        { provide: AuthService, useValue: { currentUser: () => usuario } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('estados da tela (RNF08)', () => {
    it('mostra "Carregando…" e depois as pendentes vindas da API', () => {
      iniciar();
      expect(texto()).toContain('Carregando…');

      responderCarga();

      expect(texto()).not.toContain('Carregando…');
      expect(component.pendingCount()).toBe(3);
      expect(component.filteredRequests().map((r) => r.id)).toEqual(['sol-002', 'sol-001', 'sol-003']);
    });

    it('mostra o erro com "Tentar novamente", que refaz a busca', () => {
      iniciar();
      http.expectOne('/api/centros-custo').flush([]);
      http.expectOne('/api/alcadas/tetos').flush([]);
      http.expectOne(URL_LISTA).flush({ message: 'Firestore indisponível.' }, { status: 500, statusText: 'Erro' });
      fixture.detectChanges();

      expect(texto()).toContain('Não foi possível carregar as solicitações');
      expect(texto()).toContain('Firestore indisponível.');

      component.reload();
      responderCarga();
      expect(component.pendingCount()).toBe(3);
    });
  });

  describe('abas, filtros e ordenação', () => {
    beforeEach(() => {
      iniciar();
      responderCarga();
    });

    it('separa as abas pelo status da API', () => {
      component.setTab('ajustes');
      expect(component.filteredRequests().map((r) => r.status)).toEqual(['EM_AJUSTE']);

      component.setTab('aprovadas');
      expect(component.filteredRequests().map((r) => r.id)).toEqual(['sol-004']);

      component.setTab('todas');
      expect(component.filteredRequests()).toHaveLength(5);
    });

    it('filtra por categoria e ordena por valor', () => {
      component.setTab('todas');
      component.setCategoryFilter('EQUIPAMENTOS');
      expect(component.filteredRequests().map((r) => r.id)).toEqual(['sol-005']);

      component.clearFilters();
      component.setSortBy('maior_valor');
      expect(component.filteredRequests()[0].valor).toBe(3200);
    });

    it('calcula a taxa de aprovação só com as decididas', () => {
      expect(component.approvalRate()).toBe(100);
    });
  });

  describe('SoD na tela (CA-04.1, US-09)', () => {
    beforeEach(() => {
      iniciar();
      responderCarga();
    });

    it('o aprovador decide os pedidos dos outros, mas não o próprio', () => {
      expect(component.podeDecidirSobre(item('sol-001'))).toBe(true);
      expect(component.podeDecidirSobre(item('sol-003'))).toBe(false);
    });

    it('não oferece decisão para quem não é aprovador nem para pedidos já decididos', () => {
      expect(component.podeDecidirSobre(item('sol-004'))).toBe(false);
      usuario = { ...usuario, role: 'SOLICITANTE' };
      expect(component.podeDecidirSobre(item('sol-001'))).toBe(false);
    });

    it('o lote só leva as selecionadas que o usuário pode decidir', () => {
      component.toggleSelect('sol-001');
      component.toggleSelect('sol-003');
      expect(component.decidableSelectedItems().map((r) => r.id)).toEqual(['sol-001']);
    });
  });

  describe('trilha de auditoria (US-07)', () => {
    beforeEach(() => {
      iniciar();
      responderCarga();
    });

    it('carrega os elos reais com o hash SHA-256 ao abrir o detalhe', () => {
      component.openDetailDrawer(item('sol-001'));
      expect(component.trailState()).toBe('carregando');

      http.expectOne('/api/solicitacoes/sol-001/trilha').flush([eloDaApi({ sequencia: 1 })]);
      fixture.detectChanges();

      expect(component.trailState()).toBe('pronto');
      expect(component.trailSteps()[0].hashSha256).toBe('a'.repeat(64));
      expect(texto()).toContain('a'.repeat(16));
    });

    it('avisa quando a trilha não pode ser lida', () => {
      component.openDetailDrawer(item('sol-001'));
      http.expectOne('/api/solicitacoes/sol-001/trilha').flush({}, { status: 500, statusText: 'Erro' });
      expect(component.trailState()).toBe('erro');
    });
  });

  describe('decisões', () => {
    beforeEach(() => {
      iniciar();
      responderCarga();
    });

    it('T02: aprova com a versão lida e a observação da assinatura', () => {
      component.openSignModal(item('sol-001'));
      component.onSignatureConfirmed({ signatureDataUrl: '', comentario: 'Dentro do orçamento' });

      const req = http.expectOne('/api/solicitacoes/sol-001/aprovar');
      expect(req.request.body).toEqual({ versao: 1, observacao: 'Dentro do orçamento' });
      req.flush(solicitacaoDaApi({ id: 'sol-001', status: 'APROVADA', versao: 2 }));

      expect(item('sol-001').status).toBe('APROVADA');
      expect(component.isSignModalOpen()).toBe(false);
      expect(component.toast()?.type).toBe('success');
    });

    it('CA-05.1: mostra o conflito de versão e mantém o modal aberto', () => {
      component.openSignModal(item('sol-001'));
      component.onSignatureConfirmed({ signatureDataUrl: '', comentario: '' });
      http
        .expectOne('/api/solicitacoes/sol-001/aprovar')
        .flush({ message: 'Conflito de concorrência: outra decisão foi registrada.' }, { status: 409, statusText: 'Conflict' });

      expect(component.toast()?.message).toContain('Conflito de concorrência');
      expect(component.isSignModalOpen()).toBe(true);
      expect(item('sol-001').status).toBe('PENDENTE');
    });

    it('CA-03.2: rejeitar exige motivo de 10 caracteres antes de chamar a API', () => {
      component.openRejectModal(item('sol-001'));
      component.rejectionReason.set('Sem verba');
      component.confirmRejection();
      http.expectNone('/api/solicitacoes/sol-001/rejeitar');

      component.rejectionReason.set('Sem verba neste trimestre');
      component.confirmRejection();
      const req = http.expectOne('/api/solicitacoes/sol-001/rejeitar');
      expect(req.request.body).toEqual({ versao: 1, motivo: 'Sem verba neste trimestre' });
      req.flush(solicitacaoDaApi({ id: 'sol-001', status: 'REJEITADA', versao: 2 }));

      expect(component.rejectingRequest()).toBeNull();
      expect(item('sol-001').status).toBe('REJEITADA');
    });

    it('T04: pede ajuste com o motivo informado', () => {
      component.openAdjustmentModal(item('sol-001'));
      component.adjustmentReason.set('Informe o fornecedor e o prazo');
      component.confirmAdjustment();

      const req = http.expectOne('/api/solicitacoes/sol-001/ajuste');
      expect(req.request.body).toEqual({ versao: 1, motivo: 'Informe o fornecedor e o prazo' });
      req.flush(solicitacaoDaApi({ id: 'sol-001', status: 'EM_AJUSTE', versao: 2 }));

      expect(component.adjustingRequest()).toBeNull();
      expect(component.adjustmentCount()).toBe(2);
    });

    it('aprovação em lote: aprova cada uma com a própria versão e informa as falhas', () => {
      component.toggleSelect('sol-001');
      component.toggleSelect('sol-002');
      component.openBatchSignModal();
      expect(component.isBatchSignMode()).toBe(true);

      component.onSignatureConfirmed({ signatureDataUrl: '', comentario: '' });
      http.expectOne('/api/solicitacoes/sol-001/aprovar').flush(solicitacaoDaApi({ id: 'sol-001', status: 'APROVADA', versao: 2 }));
      http
        .expectOne('/api/solicitacoes/sol-002/aprovar')
        .flush({ message: 'Valor acima do teto da sua alçada.' }, { status: 403, statusText: 'Forbidden' });

      expect(component.toast()?.title).toBe('1 aprovadas, 1 com erro');
      expect(component.toast()?.message).toContain('Valor acima do teto da sua alçada.');
      expect(component.selectedIds().size).toBe(0);
      expect(component.isSignModalOpen()).toBe(false);
    });
  });
});
