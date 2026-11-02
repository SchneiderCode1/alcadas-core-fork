import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthUser } from '../../../../core/auth/auth.models';
import { AuthService } from '../../../../core/auth/auth.service';
import { APP_CONFIG } from '../../../../core/config/app-config';
import { solicitacaoDaApi, tetoDaApi } from '../../../../core/testing/api-fixtures';
import { CONFIG_DE_TESTE } from '../../../../core/testing/test-config';
import { CreateRequestComponent } from './create-request.component';

describe('CreateRequestComponent (US-02)', () => {
  let fixture: ComponentFixture<CreateRequestComponent>;
  let component: CreateRequestComponent;
  let http: HttpTestingController;
  let navigate: jest.SpyInstance;
  const usuario: AuthUser = { id: 'ana', email: 'ana@startop.test', role: 'SOLICITANTE', tenantId: 'startop' };

  function texto(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function responderCarga(): void {
    http.expectOne('/api/solicitacoes?page=1&limit=50').flush([]);
    http
      .expectOne('/api/centros-custo')
      .flush([{ id: 'cc-clinica-centro', tenantId: 'startop', code: 'CC-CENTRO', name: 'Clínica Centro', isActive: true, createdAt: '', updatedAt: '' }]);
    http.expectOne('/api/alcadas/tetos').flush([tetoDaApi('N1', 1000), tetoDaApi('N2', 5000), tetoDaApi('N3', null)]);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateRequestComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: APP_CONFIG, useValue: CONFIG_DE_TESTE },
        { provide: AuthService, useValue: { currentUser: () => usuario } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(CreateRequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    responderCarga();
  });

  afterEach(() => http.verify());

  it('já vem com o primeiro centro de custo carregado da API', () => {
    expect(component.formCentroCustoId()).toBe('cc-clinica-centro');
    expect(texto()).toContain('CC-CENTRO - Clínica Centro');
  });

  it('RN01: calcula a alçada com os tetos reais do tenant', () => {
    component.formValor.set(3200);
    expect(component.suggestedWorkflow().nome).toContain('Alçada N2');
    expect(component.suggestedWorkflow().etapas[1].papel).toBe('Gerente');
  });

  it('CA-02.3: recusa valor zero ou com mais de 2 casas decimais', () => {
    component.formJustificativa.set('Troca de cabos');
    component.formValor.set(0);
    component.submitNewRequest();
    expect(component.formErrors()['valor']).toBeDefined();

    component.formValor.set(10.123);
    component.submitNewRequest();
    expect(component.formErrors()['valor']).toBeDefined();
  });

  it('CA-02.2: só exige 30 caracteres de justificativa acima da base da categoria', () => {
    component.formCategoria.set('SERVICOS_TERCEIROS');
    component.formValor.set(1000.01);
    component.formJustificativa.set('x'.repeat(29));
    fixture.detectChanges();
    expect(component.exigeJustificativaLonga()).toBe(true);
    component.submitNewRequest();
    expect(component.formErrors()['justificativa']).toContain('30 caracteres');

    component.formValor.set(1000);
    component.submitNewRequest();
    expect(component.formErrors()['justificativa']).toBeUndefined();
    http.expectOne('/api/solicitacoes').flush(solicitacaoDaApi({ id: 'sol-010', valor: 1000 }));
  });

  it('envia para a API e volta para a lista avisando que a solicitação foi criada', () => {
    component.formValor.set(3200);
    component.formJustificativa.set('  Manutenção do aparelho de raio-x da unidade Centro ');
    component.submitNewRequest();

    const req = http.expectOne('/api/solicitacoes');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      centroCustoId: 'cc-clinica-centro',
      categoria: 'SERVICOS_TERCEIROS',
      valor: 3200,
      justificativa: 'Manutenção do aparelho de raio-x da unidade Centro',
    });
    req.flush(solicitacaoDaApi({ id: 'sol-010' }));

    expect(navigate).toHaveBeenCalledWith(['/solicitacoes'], { queryParams: { criada: 'true' } });
    expect(component.isSubmitting()).toBe(false);
  });

  it('mostra o erro da API e continua na página', () => {
    component.formValor.set(50);
    component.formJustificativa.set('Papel A4');
    component.submitNewRequest();

    http.expectOne('/api/solicitacoes').flush({ message: 'Categoria não reconhecida.' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(component.formErrors()['geral']).toBe('Categoria não reconhecida.');
    expect(texto()).toContain('Categoria não reconhecida.');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('"Voltar" leva para a lista de solicitações', () => {
    component.goBack();
    expect(navigate).toHaveBeenCalledWith(['/solicitacoes']);
  });
});
