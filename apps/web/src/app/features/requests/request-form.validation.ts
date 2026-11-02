import { JUSTIFICATIVA_MINIMA_ACIMA_DA_BASE, justificativaSuficiente } from '@alcadas-core/models';

export interface DadosDaNovaSolicitacao {
  centroCustoId: string;
  categoria: string;
  valor: number | null;
  justificativa: string;
}

/**
 * Regras do formulário de nova solicitação, iguais às da API (OpenAPI v0.2 — US-02):
 * campos obrigatórios (CA-02.1), valor > 0 com até 2 casas (CA-02.3) e
 * justificativa de 30 caracteres acima do limite base da categoria (CA-02.2).
 * Devolve um mapa campo → mensagem; vazio quando está tudo certo.
 */
export function validarNovaSolicitacao(dados: DadosDaNovaSolicitacao): Record<string, string> {
  const erros: Record<string, string> = {};
  const justificativa = dados.justificativa.trim();

  if (!dados.centroCustoId) {
    erros['centroCusto'] = 'Selecione o centro de custo.';
  }
  if (!dados.categoria) {
    erros['categoria'] = 'Selecione a categoria da despesa.';
  }
  if (dados.valor === null || !(dados.valor > 0) || !temAteDuasCasasDecimais(dados.valor)) {
    erros['valor'] = 'Informe um valor maior que R$ 0,00, com até 2 casas decimais.';
  }
  if (!justificativa) {
    erros['justificativa'] = 'Informe a justificativa da solicitação.';
  } else if (!justificativaSuficiente(dados.categoria, dados.valor ?? 0, justificativa)) {
    erros['justificativa'] =
      `Acima do limite da categoria, a justificativa exige ao menos ${JUSTIFICATIVA_MINIMA_ACIMA_DA_BASE} caracteres (atual: ${justificativa.length}).`;
  }
  return erros;
}

function temAteDuasCasasDecimais(valor: number): boolean {
  return Math.abs(Math.round(valor * 100) - valor * 100) < 1e-6;
}
