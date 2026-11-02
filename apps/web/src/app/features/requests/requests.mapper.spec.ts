import { eloDaApi, solicitacaoDaApi, tetoDaApi } from '../../core/testing/api-fixtures';
import { CATEGORY_OPTIONS, etapasDaTrilha, fluxoDaAlcada, nivelQueDecide, paraRequestItem } from './requests.mapper';

describe('requests.mapper', () => {
  const tetos = [tetoDaApi('N3', null), tetoDaApi('N1', 1000), tetoDaApi('N2', 5000)];
  const contexto = {
    centrosDeCusto: [{ id: 'cc-clinica-centro', code: 'CC-CENTRO', nome: 'Clínica Centro' }],
    tetos,
    usuarioAtualId: 'ana',
  };

  it('converte a solicitação da API para a tela', () => {
    const item = paraRequestItem(solicitacaoDaApi(), contexto);

    expect(item).toMatchObject({
      id: 'sol-001',
      codigo: '#SOL-001',
      titulo: 'Manutenção do aparelho de raio-x da unidade Centro',
      categoriaLabel: 'Serviços de Terceiros',
      centroCustoNome: 'Clínica Centro',
      departamento: 'CC-CENTRO',
      status: 'PENDENTE',
      statusLabel: 'Em análise',
      versao: 1,
      solicitante: { id: 'ana', nome: 'Você' },
    });
  });

  it('usa o id quando o centro de custo não foi carregado', () => {
    const item = paraRequestItem(solicitacaoDaApi({ centroCustoId: 'cc-desconhecido' }), { ...contexto, centrosDeCusto: [] });
    expect(item.centroCustoNome).toBe('cc-desconhecido');
  });

  it('resume justificativas longas no título', () => {
    const item = paraRequestItem(solicitacaoDaApi({ justificativa: 'x'.repeat(200) }), contexto);
    expect(item.titulo.length).toBe(80);
    expect(item.titulo.endsWith('…')).toBe(true);
  });

  it('RN01: escolhe o primeiro nível cujo teto cobre o valor', () => {
    expect(nivelQueDecide(1000, tetos)?.level).toBe('N1');
    expect(nivelQueDecide(1000.01, tetos)?.level).toBe('N2');
    expect(nivelQueDecide(5000, tetos)?.level).toBe('N2');
    expect(nivelQueDecide(5000.01, tetos)?.level).toBe('N3');
    expect(nivelQueDecide(10, [])).toBeUndefined();
  });

  it('monta o fluxo com a etapa de decisão conforme o status', () => {
    expect(fluxoDaAlcada(7500, 'PENDENTE', tetos)).toMatchObject({
      nome: 'Alçada N3 — sem limite',
      etapaAtualNome: 'Aguardando aprovador',
    });
    expect(fluxoDaAlcada(3200, 'APROVADA', tetos).etapas[1]).toMatchObject({ nome: 'Decisão N2', status: 'CONCLUIDA' });
    expect(fluxoDaAlcada(3200, 'EM_AJUSTE', []).nome).toContain('tetos não configurados');
  });

  it('US-07: converte os elos da trilha em etapas ordenadas, com o motivo como comentário', () => {
    const etapas = etapasDaTrilha([
      eloDaApi({ sequencia: 2, tipoEvento: 'REJEICAO', authorId: 'carlos', authorRole: 'APROVADOR_N2', payload: { motivo: 'Fora do orçamento' } }),
      eloDaApi({ sequencia: 1 }),
    ]);

    expect(etapas.map((e) => e.nome)).toEqual(['Solicitação criada', 'Rejeição']);
    expect(etapas[1]).toMatchObject({ status: 'REJEITADA', papel: 'APROVADOR_N2', responsavelNome: 'carlos', comentario: 'Fora do orçamento' });
    expect(etapas[0].dataHora).toBeTruthy();
    expect(etapas[0].hashSha256).toBe('a'.repeat(64));
  });

  it('usa o catálogo de categorias compartilhado com a API', () => {
    expect(CATEGORY_OPTIONS.map((c) => c.id)).toEqual(['SERVICOS_TERCEIROS', 'EQUIPAMENTOS', 'MATERIAL_ESCRITORIO']);
  });
});
