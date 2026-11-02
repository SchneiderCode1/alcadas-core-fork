import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { SolicitacaoResponseDto } from '@alcadas-core/models';
import { AuthUser } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';
import { APP_CONFIG } from '../../core/config/app-config';
import { eloDaApi, solicitacaoDaApi, tetoDaApi } from '../../core/testing/api-fixtures';
import { CONFIG_DE_TESTE } from '../../core/testing/test-config';
import { RequestsComponent } from './requests.component';

const URL_LISTA = '/api/solicitacoes?page=1&limit=50';

describe('RequestsComponent', () => {
  let fixture: ComponentFixture<RequestsComponent>;
  let component: RequestsComponent;
  let http: HttpTestingController;
  let usuario: AuthUser;
  let parametrosDaRota: Record<string, string>;

  const solicitacoes: SolicitacaoResponseDto[] = [
    solicitacaoDaApi({ id: 'sol-001', solicitanteId: 'ana', valor: 3200 }),
    solicitacaoDaApi({ id: 'sol-002', solicitanteId: 'carlos', status: 'APROVADA', versao: 2, valor: 900 }),
    solicitacaoDaApi({ id: 'sol-003', solicitanteId: 'ana', status: 'EM_AJUSTE', categoria: 'EQUIPAMENTOS', justificativa: 'Notebook novo' }),
  ];

  function texto(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function iniciar(): void {
    fixture = TestBed.createComponent(RequestsComponent);
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

  beforeEach(async () => {
    usuario = { id: 'carlos', email: 'gerente@startop.test', role: 'APROVADOR_N2', tenantId: 'startop' };
    parametrosDaRota = {};
    await TestBed.configureTestingModule({
      imports: [RequestsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: CONFIG_DE_TESTE },
        { provide: AuthService, useValue: { currentUser: () => usuario } },
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { get queryParamMap() { return convertToParamMap(parametrosDaRota); } } },
        },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('estados da tela (RNF08)', () => {
    it('mostra "Carregando…" enquanto a API responde', () => {
      iniciar();
      expect(texto()).toContain('Carregando…');
      responderCarga();
      expect(texto()).not.toContain('Carregando…');
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
      expect(component.filteredRequests()).toHaveLength(3);
    });

    it('mostra o estado vazio quando o tenant não tem solicitações', () => {
      iniciar();
      responderCarga([]);
      expect(texto()).toContain('Nenhuma solicitação ainda');
    });
  });

  describe('lista', () => {
    beforeEach(() => {
      iniciar();
      responderCarga();
    });

    it('calcula os indicadores a partir dos dados da API', () => {
      expect(component.stats()).toMatchObject({ total: 3, pendentes: 1, aprovadas: 1, ajustes: 1 });
    });

    it('filtra pelas abas usando o status da API', () => {
      component.setTab('ajustes');
      expect(component.filteredRequests().map((r) => r.id)).toEqual(['sol-003']);
      component.setTab('aprovadas');
      expect(component.filteredRequests().map((r) => r.id)).toEqual(['sol-002']);
    });

    it('busca pelo texto da justificativa', () => {
      component.setSearchQuery('notebook');
      expect(component.filteredRequests().map((r) => r.id)).toEqual(['sol-003']);
    });

    it('ordena por maior valor', () => {
      component.setSortBy('maior_valor');
      expect(component.filteredRequests()[0].valor).toBe(3200);
    });

    it('marca e desmarca itens', () => {
      component.toggleSelect('sol-001');
      expect(component.selectedIds().has('sol-001')).toBe(true);
      component.toggleSelect('sol-001');
      expect(component.selectedIds().has('sol-001')).toBe(false);
    });
  });

  describe('nova solicitação (US-02)', () => {
    it('"Nova Solicitação" abre a página de criação', () => {
      iniciar();
      responderCarga();
      const navegar = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

      component.goToCreatePage();

      expect(navegar).toHaveBeenCalledWith(['/solicitacoes/nova']);
    });

    it('avisa o sucesso ao voltar da página de criação (?criada=true)', () => {
      parametrosDaRota = { criada: 'true' };

      iniciar();
      responderCarga();

      expect(component.toastMessage()).toContain('Solicitação criada');
    });
  });

  describe('decisão do aprovador (US-03)', () => {
    beforeEach(() => {
      iniciar();
      responderCarga();
    });

    function abrir(id: string): void {
      const item = component.filteredRequests().find((r) => r.id === id);
      if (!item) throw new Error(`solicitação ${id} não carregada`);
      component.openDetailDrawer(item);
      http.expectOne(`/api/solicitacoes/${id}/trilha`).flush([eloDaApi({ sequencia: 1 })]);
      fixture.detectChanges();
    }

    it('CA-04.1: o autor não vê os botões de decisão do próprio pedido', () => {
      usuario = { ...usuario, id: 'ana' };
      abrir('sol-001');
      expect(component.canDecideSelected()).toBe(false);
    });

    it('US-09: solicitante não decide', () => {
      usuario = { ...usuario, role: 'SOLICITANTE' };
      abrir('sol-001');
      expect(component.canDecideSelected()).toBe(false);
    });

    it('CA-03.2: rejeitar sem motivo de 10 caracteres não chama a API', () => {
      abrir('sol-001');
      component.decisionMotivo.set('Sem verba');
      component.decide('rejeitar');
      expect(component.decisionError()).toContain('10 caracteres');
    });

    it('aprova com a versão lida, atualiza o detalhe e recarrega a trilha', () => {
      abrir('sol-001');
      expect(component.canDecideSelected()).toBe(true);

      component.decide('aprovar');
      const req = http.expectOne('/api/solicitacoes/sol-001/aprovar');
      expect(req.request.body).toEqual({ versao: 1 });
      req.flush(solicitacaoDaApi({ id: 'sol-001', status: 'APROVADA', versao: 2 }));
      http
        .expectOne('/api/solicitacoes/sol-001/trilha')
        .flush([eloDaApi({ sequencia: 1 }), eloDaApi({ sequencia: 2, tipoEvento: 'APROVACAO', authorId: 'carlos' })]);

      expect(component.selectedRequest()?.status).toBe('APROVADA');
      expect(component.trailSteps()).toHaveLength(2);
      expect(component.canDecideSelected()).toBe(false);
    });

    it('CA-05.1: mostra o conflito de versão devolvido pela API', () => {
      abrir('sol-001');
      component.decide('aprovar');
      http
        .expectOne('/api/solicitacoes/sol-001/aprovar')
        .flush({ message: 'Conflito de concorrência: outra decisão foi registrada.' }, { status: 409, statusText: 'Conflict' });

      expect(component.decisionError()).toContain('Conflito de concorrência');
      expect(component.selectedRequest()?.status).toBe('PENDENTE');
    });
  });
});
