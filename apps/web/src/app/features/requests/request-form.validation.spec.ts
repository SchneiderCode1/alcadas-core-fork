import { validarNovaSolicitacao } from './request-form.validation';

describe('validarNovaSolicitacao (US-02)', () => {
  const valida = {
    centroCustoId: 'cc-clinica-centro',
    categoria: 'SERVICOS_TERCEIROS',
    valor: 900,
    justificativa: 'Troca de cabos',
  };

  it('aceita uma solicitação válida', () => {
    expect(validarNovaSolicitacao(valida)).toEqual({});
  });

  it('CA-02.1: exige centro de custo, categoria e justificativa', () => {
    const erros = validarNovaSolicitacao({ ...valida, centroCustoId: '', categoria: '', justificativa: '  ' });
    expect(Object.keys(erros).sort()).toEqual(['categoria', 'centroCusto', 'justificativa']);
  });

  it.each([[0], [-10], [10.123], [null]])('CA-02.3: recusa o valor %p', (valor) => {
    expect(validarNovaSolicitacao({ ...valida, valor })['valor']).toBeDefined();
  });

  it('aceita valores com 2 casas, como 10.10', () => {
    expect(validarNovaSolicitacao({ ...valida, valor: 10.1 })['valor']).toBeUndefined();
  });

  it('CA-02.2: acima da base exige 30 caracteres (29 recusa, 30 aceita)', () => {
    const acima = { ...valida, valor: 1000.01 };
    expect(validarNovaSolicitacao({ ...acima, justificativa: 'x'.repeat(29) })['justificativa']).toContain('30 caracteres');
    expect(validarNovaSolicitacao({ ...acima, justificativa: 'x'.repeat(30) })).toEqual({});
  });
});
