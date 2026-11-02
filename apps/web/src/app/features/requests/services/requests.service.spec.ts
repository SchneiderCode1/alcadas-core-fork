import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { APP_CONFIG } from '../../../core/config/app-config';
import { eloDaApi, solicitacaoDaApi, tetoDaApi } from '../../../core/testing/api-fixtures';
import { CONFIG_DE_TESTE } from '../../../core/testing/test-config';
import { RequestItem } from '../requests.models';
import { RequestsService, ResultadoEmLote } from './requests.service';

describe('RequestsService', () => {
  let service: RequestsService;
  let http: HttpTestingController;

  function responderCarga(solicitacoes = [solicitacaoDaApi()]): void {
    http.expectOne('/api/solicitacoes?page=1&limit=50').flush(solicitacoes);
    http.expectOne('/api/centros-custo').flush([
      { id: 'cc-clinica-centro', tenantId: 'startop', code: 'CC-CENTRO', name: 'Clínica Centro', isActive: true, createdAt: '', updatedAt: '' },
    ]);
    http.expectOne('/api/alcadas/tetos').flush([tetoDaApi('N2', 5000)]);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: CONFIG_DE_TESTE },
        { provide: AuthService, useValue: { currentUser: () => ({ id: 'carlos', email: '', role: 'APROVADOR_N2' }) } },
      ],
    });
    service = TestBed.inject(RequestsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('carrega solicitações, centros de custo e tetos da API', () => {
    service.load();
    expect(service.loadState()).toBe('carregando');

    responderCarga();

    expect(service.loadState()).toBe('pronto');
    expect(service.requests()).toHaveLength(1);
    expect(service.requests()[0].centroCustoNome).toBe('Clínica Centro');
    expect(service.costCenters()).toEqual([{ id: 'cc-clinica-centro', code: 'CC-CENTRO', nome: 'Clínica Centro' }]);
    expect(service.stats()).toMatchObject({ total: 1, pendentes: 1, pendentesValorTotal: 3200 });
  });

  it('mostra a lista mesmo se centros de custo e tetos falharem', () => {
    service.load();
    http.expectOne('/api/solicitacoes?page=1&limit=50').flush([solicitacaoDaApi()]);
    http.expectOne('/api/centros-custo').flush({}, { status: 403, statusText: 'Forbidden' });
    http.expectOne('/api/alcadas/tetos').flush({}, { status: 500, statusText: 'Erro' });

    expect(service.loadState()).toBe('pronto');
    expect(service.requests()[0].centroCustoNome).toBe('cc-clinica-centro');
  });

  it('RNF08: guarda a mensagem quando a lista falha', () => {
    service.load();
    http.expectOne('/api/centros-custo').flush([]);
    http.expectOne('/api/alcadas/tetos').flush([]);
    http.expectOne('/api/solicitacoes?page=1&limit=50').flush(
      { statusCode: 500, message: 'Firestore indisponível.' },
      { status: 500, statusText: 'Erro' },
    );

    expect(service.loadState()).toBe('erro');
    expect(service.loadError()).toBe('Firestore indisponível.');
  });

  it('T01: cria a solicitação e coloca no topo da lista', () => {
    service.load();
    responderCarga();

    let criada: RequestItem | undefined;
    service
      .create({ centroCustoId: 'cc-clinica-centro', categoria: 'EQUIPAMENTOS', valor: 900, justificativa: 'Monitor' })
      .subscribe((item) => (criada = item));

    const req = http.expectOne('/api/solicitacoes');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ centroCustoId: 'cc-clinica-centro', categoria: 'EQUIPAMENTOS', valor: 900, justificativa: 'Monitor' });
    req.flush(solicitacaoDaApi({ id: 'sol-002', categoria: 'EQUIPAMENTOS', valor: 900 }));

    expect(criada?.id).toBe('sol-002');
    expect(service.requests().map((r) => r.id)).toEqual(['sol-002', 'sol-001']);
  });

  it('CA-05.1: aprova enviando a versão lida e atualiza o item', () => {
    service.load();
    responderCarga();
    const [pendente] = service.requests();

    service.decide(pendente, 'aprovar').subscribe();

    const req = http.expectOne('/api/solicitacoes/sol-001/aprovar');
    expect(req.request.body).toEqual({ versao: 1 });
    req.flush(solicitacaoDaApi({ status: 'APROVADA', versao: 2 }));

    expect(service.requests()[0]).toMatchObject({ status: 'APROVADA', versao: 2 });
  });

  it('CA-03.2: rejeita enviando o motivo', () => {
    service.load();
    responderCarga();

    service.decide(service.requests()[0], 'rejeitar', 'Fora do orçamento').subscribe();

    const req = http.expectOne('/api/solicitacoes/sol-001/rejeitar');
    expect(req.request.body).toEqual({ versao: 1, motivo: 'Fora do orçamento' });
    req.flush(solicitacaoDaApi({ status: 'REJEITADA', versao: 2 }));
  });

  it('US-07: busca a trilha e converte em etapas', () => {
    let nomes: string[] = [];
    service.loadTrail('sol-001').subscribe((etapas) => (nomes = etapas.map((e) => e.nome)));

    http.expectOne('/api/solicitacoes/sol-001/trilha').flush([eloDaApi({ sequencia: 1 })]);

    expect(nomes).toEqual(['Solicitação criada']);
  });

  it('ensureLoaded só busca de novo se a lista ainda não foi carregada', () => {
    service.ensureLoaded();
    responderCarga();

    service.ensureLoaded();
    http.expectNone('/api/solicitacoes?page=1&limit=50');
    expect(service.getRequestById('sol-001')?.valor).toBe(3200);
  });

  it('aprovação em lote: segue mesmo com falha em uma e devolve o resumo', () => {
    service.load();
    responderCarga([solicitacaoDaApi({ id: 'sol-001' }), solicitacaoDaApi({ id: 'sol-002', versao: 3 })]);
    let resultado: ResultadoEmLote | undefined;

    service.approveMany(service.requests(), 'Ok').subscribe((r) => (resultado = r));

    const segunda = http.expectOne('/api/solicitacoes/sol-002/aprovar');
    expect(segunda.request.body).toEqual({ versao: 3, observacao: 'Ok' });
    segunda.flush({ message: 'Conflito de concorrência.' }, { status: 409, statusText: 'Conflict' });
    http.expectOne('/api/solicitacoes/sol-001/aprovar').flush(solicitacaoDaApi({ id: 'sol-001', status: 'APROVADA', versao: 2 }));

    expect(resultado).toEqual({ aprovadas: 1, erros: ['#SOL-002: Conflito de concorrência.'] });
  });
});

