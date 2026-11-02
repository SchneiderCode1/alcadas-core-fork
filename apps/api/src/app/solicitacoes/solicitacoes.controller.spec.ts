import { UsuarioAutenticado } from '../auth/usuario-autenticado';
import { CriarSolicitacaoDto } from './dto/criar-solicitacao.dto';
import { ListagemValidator } from './listagem.validator';
import { SolicitacoesController } from './solicitacoes.controller';
import { SolicitacoesService } from './solicitacoes.service';

// O guard real carrega o firebase-admin (ESM do `jose`), que o Jest não transforma.
// Aqui só interessa o que o controller faz com o usuário já autenticado.
jest.mock('../auth/firebase-auth.guard', () => ({ FirebaseAuthGuard: class {} }));

describe('SolicitacoesController', () => {
  const usuario: UsuarioAutenticado = { uid: 'ana', tenantId: 'startop', papeis: ['SOLICITANTE'] };
  let service: { criarSolicitacao: jest.Mock; listarPorTenant: jest.Mock };
  let controller: SolicitacoesController;

  beforeEach(() => {
    service = {
      criarSolicitacao: jest.fn().mockResolvedValue({ id: 'sol-1' }),
      listarPorTenant: jest.fn().mockResolvedValue([]),
    };
    controller = new SolicitacoesController(
      service as unknown as SolicitacoesService,
      new ListagemValidator(),
    );
  });

  it('cria a solicitação no tenant e com o autor do token', async () => {
    const dto = { centroCustoId: 'CC-01', valor: 10, categoria: 'SERVICOS_TERCEIROS' } as CriarSolicitacaoDto;

    await controller.criar(dto, usuario);

    expect(service.criarSolicitacao).toHaveBeenCalledWith(dto, 'startop', 'ana');
  });

  it('lista só o tenant do token, com a paginação validada', async () => {
    await controller.listar({ page: '2', limit: '10' }, usuario);

    expect(service.listarPorTenant).toHaveBeenCalledWith('startop', { status: undefined, page: 2, limit: 10 });
  });
});
