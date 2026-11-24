# Rascunho de Issues — Alçadas

> Rascunho para revisão. **Nenhuma issue foi criada no GitHub.**
> Formato baseado em `.github/ISSUE_TEMPLATE/` (bug_report e feature_request).
> Sugestão de branch segue o `CONTRIBUTING.md` (`fix/#<issue>-...`, `feat/#<issue>-...`).
>
> **Observação:** o front-end deste fork (`apps/web`) ainda é só o esqueleto do Nx (rotas vazias), então as telas citadas abaixo não têm arquivos para apontar. A seção "Pontos a investigar" de cada issue indica onde procurar assim que o código estiver disponível.

## Índice

| # | Tipo | Título | Labels sugeridas |
|---|------|--------|------------------|
| 1 | Bug | Corrigir tutorial exibido na primeira inicialização | `bug`, `web` |
| 2 | Bug | Impedir retorno para análise de solicitação ajustada acima do limite | `bug`, `api`, `regra-de-negocio` |
| 3 | Bug | Revisar associação entre departamento e unidade | `bug`, `api`, `web` |
| 4 | Feat | Remover menu e barra de pesquisa | `enhancement`, `web` |
| 5 | Feat | Remover botões do cabeçalho | `enhancement`, `web` |
| 6 | Feat | Remover botão de acesso à conta de outra pessoa | `enhancement`, `web` |
| 7 | Feat | Manter cargo/papel do funcionário em um único local | `enhancement`, `web`, `api` |
| 8 | Feat | Reorganizar telas de configuração em "Gestão corporativa" | `enhancement`, `web`, `ux` |
| 9 | Feat | Departamentos: consultar membros | `enhancement`, `web`, `api` |
| 10 | Decisão | Definir o uso do orçamento mensal do departamento | `discussion`, `regra-de-negocio` |
| 11 | Feat | Associar categoria escolhida à regra da solicitação | `enhancement`, `api`, `web` |
| 12 | Feat | Melhorar tela de detalhes da solicitação (modal) | `enhancement`, `web`, `ux` |
| 13 | Feat | Simplificar configuração e leitura dos fluxos de regras | `enhancement`, `web`, `ux` |
| 14 | Spike | Avaliar organização em formato Kanban | `discussion`, `ux` |
| 15 | Decisão | Esclarecer o item "Menu mais coletado" | `discussion` |

**Dependências sugeridas:** #4, #5 e #6 são independentes e pequenas (bom começo). #7 antecede #6 (a delegação passa a ser acessada pela área de funcionários). #9 depende de #3. #8 deve vir depois de #4–#7 para não retrabalhar. #12 depende de #11 (precisa exibir categoria e fluxo).

---

# 🐛 Bugs e correções

## 1. [BUG] - Corrigir tutorial exibido na primeira inicialização

**Labels:** `bug`, `web` · **Branch sugerida:** `fix/#1-tutorial-primeira-inicializacao`

### 🐛 Descrição do Bug
Ao abrir o sistema pela primeira vez, antes do login, é exibido um tutorial. Ele não funciona nesse momento, apresentando uma opção quebrada ao usuário.

### 👣 Passo a Passo para Reproduzir
1. Abra o sistema pela primeira vez (sem sessão e sem dados prévios no navegador).
2. Observe o tutorial exibido na tela inicial, antes do login.
3. Tente avançar/interagir com o tutorial.
4. O tutorial não funciona.

### 🎯 Comportamento Esperado
Uma das duas opções (a equipe decide na issue):
- **(A)** O tutorial funciona normalmente nesse acesso inicial; ou
- **(B)** O tutorial não é oferecido antes do login e passa a ser exibido apenas quando puder funcionar (ex.: após o primeiro login).

Em nenhum caso o usuário deve ver uma opção quebrada.

### 🔎 Pontos a investigar
- O tutorial depende de elementos da tela (menu, cabeçalho) que só existem após o login?
- Se depender, esta issue interage com as issues #4 e #5 (remoção de menu/cabeçalho): validar o tutorial depois delas.

### ✅ Critérios de Aceite
- [ ] Primeiro acesso sem login: tutorial funciona de ponta a ponta **ou** não é exibido.
- [ ] Nenhum botão/link do tutorial leva a estado quebrado ou erro de console.
- [ ] O estado "tutorial já visto" é lembrado (não reaparece a cada acesso).
- [ ] Teste E2E (Playwright) cobrindo o primeiro acesso.

---

## 2. [BUG] - Impedir retorno para análise de solicitação ajustada acima do limite

**Labels:** `bug`, `api`, `regra-de-negocio` · **Branch sugerida:** `fix/#2-reenvio-acima-do-limite`
**Requisitos relacionados:** `RF01`, `RF03`, `RF10`, `RN05`, `US-11`

### 🐛 Descrição do Bug
Uma solicitação com limite de R$ 10 mil foi devolvida para ajuste (`EM_AJUSTE`). Após o autor alterar o valor para R$ 20 mil, ela voltou para análise (`PENDENTE`) em vez de ser bloqueada.

### 👣 Passo a Passo para Reproduzir
1. Como Solicitante, crie uma solicitação de R$ 10.000 (limite aplicável: R$ 10 mil).
2. Como Aprovador, solicite ajuste (motivo ≥ 10 caracteres). Status: `EM_AJUSTE`.
3. Como Solicitante, edite o valor para R$ 20.000 e reenvie.
4. A solicitação volta para `PENDENTE` e segue para análise/aprovação.

### 🎯 Comportamento Esperado
A edição acima do limite **não pode** permitir o retorno para análise nem a aprovação. O bloqueio deve ocorrer **no momento do reenvio** (transição `EM_AJUSTE → PENDENTE`), com erro claro para o usuário (ex.: `HTTP 422` com motivo "valor acima do limite"), e o evento deve constar na trilha de auditoria.

> Ponto em aberto para a equipe decidir: quando o valor ultrapassa o limite da alçada original, a solicitação (a) é **bloqueada** para o autor corrigir, ou (b) é **escalonada** ao nível superior, como já ocorre no anti-fracionamento (`RF05`)? O relato pede bloqueio; confirmar com o negócio.

### 🔎 Pontos a investigar
- A validação de alçada/teto é feita só na criação (`[*] → PENDENTE`) e **não é reexecutada** na transição `EM_AJUSTE → PENDENTE`? Essa é a causa mais provável.
- Verificar também se o reenvio reaplica anti-fracionamento (`RF05`) e duplicidade (`RF06`) com o novo valor.
- Validar no **backend** (a regra não pode depender só do front) e refletir o erro no formulário.
- A edição fora do limite pode ser salva como rascunho, mas o **reenvio** é o ponto que deve bloquear.

### ✅ Critérios de Aceite
- [ ] Reenvio com valor acima do limite é recusado pela API, com mensagem clara; status permanece `EM_AJUSTE`.
- [ ] Reenvio com valor dentro do limite continua funcionando.
- [ ] Anti-fracionamento e duplicidade são reavaliados no reenvio.
- [ ] Bloqueio registrado na trilha de auditoria.
- [ ] Testes unitários e E2E: R$ 10 mil → ajuste → R$ 20 mil (bloqueado) e → R$ 9 mil (aceito).

---

## 3. [BUG] - Revisar associação entre departamento e unidade

**Labels:** `bug`, `api`, `web` · **Branch sugerida:** `fix/#3-associacao-departamento-unidade`

### 🐛 Descrição do Bug
Uma tela exibe um departamento vinculado à unidade filial do Rio de Janeiro, embora tenha sido informado que esse departamento **não** está associado a ela.

### 👣 Passo a Passo para Reproduzir
1. Acesse a tela em que o departamento aparece (identificar qual — a tela exata não foi registrada no relato).
2. Selecione/visualize a unidade filial do Rio de Janeiro.
3. O departamento é exibido, embora não devesse estar associado.

### 🎯 Comportamento Esperado
A tela deve refletir exatamente a associação real entre departamento e unidade. Se a associação está errada nos dados, corrigir os dados; se está certa e a exibição é que erra, corrigir a exibição.

### 🔎 Pontos a investigar
- **Primeiro, descobrir qual dos dois está errado:** dado (associação gravada) ou apresentação (filtro/consulta/rótulo).
- Verificar se há filtro por unidade na consulta de departamentos, ou se a tela lista departamentos de toda a organização.
- Verificar isolamento por tenant (`RNF07`) e se departamento pode pertencer a mais de uma unidade (modelagem N:N vs 1:N).
- **Informação pendente:** qual tela exata e qual departamento (anexar print).

### ✅ Critérios de Aceite
- [ ] Causa identificada (dado ou exibição) e registrada na issue.
- [ ] Tela passa a mostrar apenas departamentos realmente associados à unidade.
- [ ] Teste cobrindo a consulta de departamentos por unidade.

---

# 🧭 Organização e interface

## 4. [FEAT] - Remover menu e barra de pesquisa

**Labels:** `enhancement`, `web` · **Branch sugerida:** `feat/#4-remover-menu-e-busca`

### 🎯 Motivação e Contexto
Há poucas opções para pesquisar, especialmente quando a área contém apenas solicitações, e o menu atual não oferece opções funcionais. Ocupam espaço sem entregar valor.

### 💡 Descrição da Proposta
Remover o menu e a barra de pesquisa. Só manter a busca se for implementada com opções úteis e funcionais (nesse caso, abrir issue própria com a definição de filtros).

### ✅ Critérios de Aceite
- [ ] Menu e barra de pesquisa removidos de todas as telas.
- [ ] A navegação principal continua acessível (confirmar qual será a navegação após a remoção, em conjunto com #5 e #8).
- [ ] Nenhuma rota/atalho quebrado; código e estilos órfãos removidos.
- [ ] Layout ajustado para usar o espaço liberado.

---

## 5. [FEAT] - Remover botões do cabeçalho

**Labels:** `enhancement`, `web` · **Branch sugerida:** `feat/#5-remover-botoes-header`

### 🎯 Motivação e Contexto
Item da lista de pendências: retirar os botões do cabeçalho (header).

### 💡 Descrição da Proposta
Remover os botões do cabeçalho. **Pendente confirmar quais botões** (todos ou apenas alguns) — o relato diz apenas "os botões do header". Atenção: o botão de acesso à conta de outra pessoa é tratado na issue #6.

### ✅ Critérios de Aceite
- [ ] Lista dos botões a remover confirmada na issue antes de implementar.
- [ ] Botões removidos; funcionalidades que dependiam deles continuam acessíveis por outro caminho (ou foram consideradas desnecessárias).
- [ ] Sem links/estilos órfãos.

---

## 6. [FEAT] - Remover botão de acesso à conta de outra pessoa

**Labels:** `enhancement`, `web` · **Branch sugerida:** `feat/#6-remover-botao-acesso-conta-terceiro`
**Requisitos relacionados:** `RF04`, `RN04`, `RN12`

### 🎯 Motivação e Contexto
O acesso à conta de outra pessoa não é necessário: a delegação pode ser acessada pela área de funcionários.

### 💡 Descrição da Proposta
Retirar o botão. A delegação continua existindo e deve estar acessível pela área de funcionários (ver issue #7).

### ✅ Critérios de Aceite
- [ ] Botão removido da interface.
- [ ] Delegação continua acessível pela área de funcionários **antes** da remoção entrar em produção.
- [ ] Regras de delegação mantidas: vigência com início/fim, bloqueio de autoaprovação (SoD) e trilha de auditoria.
- [ ] Confirmar que nenhuma rota/endpoint de "acessar como outra pessoa" permanece exposto sem uso (avaliar remoção no backend também).

---

## 7. [FEAT] - Manter cargo/papel do funcionário em um único local

**Labels:** `enhancement`, `web`, `api` · **Branch sugerida:** `feat/#7-cargo-unico-funcionarios`
**Requisitos relacionados:** `RF01`, `RF04`, `RN12`

### 🎯 Motivação e Contexto
O cargo ou papel do funcionário pode ser configurado em mais de um lugar (área de funcionários e delegação), o que gera inconsistência e confusão.

### 💡 Descrição da Proposta
Manter a configuração de cargo/papel **somente na área de funcionários** e remover a parte duplicada da tela de delegação. A delegação passa a apenas **referenciar** o papel já definido.

### ✅ Critérios de Aceite
- [ ] Cargo/papel editável em um único lugar (área de funcionários).
- [ ] Tela de delegação não permite mais alterar cargo/papel.
- [ ] Validação de SoD em delegação (conflito de papéis) continua funcionando com a fonte única.
- [ ] Mapear dados existentes: se houver divergência entre as duas configurações, definir qual prevalece (migração, se necessário).
- [ ] Testes cobrindo a regra de conflito de papéis após a mudança.

---

## 8. [FEAT] - Reorganizar telas de configuração em "Gestão corporativa"

**Labels:** `enhancement`, `web`, `ux` · **Branch sugerida:** `feat/#8-reorganizar-configuracoes`

### 🎯 Motivação e Contexto
As telas de configuração foram consideradas complexas e difíceis de navegar: opções espalhadas e excesso de informação.

### 💡 Descrição da Proposta
- Agrupar **empresa, departamentos e funcionários** sob uma área de **organização da empresa / gestão corporativa**.
- Dividir melhor as demais configurações (por assunto, em vez de uma tela única).
- Revisar a apresentação do texto anotado como **"Dinamizar Texto"** (a anotação parece ser transcrição; confirmar o que se refere) e **aumentar a legibilidade** onde o texto está pequeno.

### ✅ Critérios de Aceite
- [ ] Estrutura de navegação proposta (mapa das áreas) aprovada antes da implementação.
- [ ] Empresa, departamentos e funcionários acessíveis a partir de uma única área.
- [ ] Cada tela de configuração tem um assunto claro e menos informação por vez.
- [ ] Tamanho mínimo de fonte e contraste revisados (referência: WCAG AA).
- [ ] Item "Dinamizar Texto" identificado e tratado (ou registrado como esclarecimento pendente).

---

## 9. [FEAT] - Departamentos: consultar membros

**Labels:** `enhancement`, `web`, `api` · **Branch sugerida:** `feat/#9-membros-do-departamento`
**Depende de:** #3

### 🎯 Motivação e Contexto
Hoje não é possível consultar quem pertence a cada departamento.

### 💡 Descrição da Proposta
Na área de departamentos, permitir ver a lista de funcionários de cada departamento (nome, cargo/papel, unidade).

### ✅ Critérios de Aceite
- [ ] Ao abrir um departamento, é possível ver seus membros.
- [ ] A lista respeita o isolamento por organização (`RNF07`).
- [ ] Endpoint com paginação/filtro adequado, com teste.
- [ ] Departamento sem membros exibe estado vazio claro.

> A parte do **orçamento mensal** está na issue #10 e **não** faz parte desta.

---

## 10. [DECISÃO] - Definir o uso do orçamento mensal do departamento

**Labels:** `discussion`, `regra-de-negocio` · **Bloqueia:** qualquer implementação de regra de orçamento/limite

### 🎯 Contexto
Não ficou definido para que serve o campo "orçamento mensal" do departamento. Foi sugerido que funcione como **limite de gastos**, com aviso quando as solicitações do departamento ultrapassarem o valor, mas houve dúvida sobre tratar esse limite como orçamento departamental.

### ❓ Perguntas a responder
1. O valor é **orçamento** (planejamento) ou **limite de gasto** (controle)? Podem ser coisas diferentes.
2. Ao ultrapassar, o sistema **só avisa**, **exige aprovação extra/escalona**, ou **bloqueia**?
3. O que conta no gasto: solicitações **criadas**, **em análise** ou apenas **aprovadas**?
4. O mês é calendário ou janela móvel? (O anti-fracionamento usa janela móvel de 30 dias.)
5. Quem é avisado (solicitante, aprovador, gestor do departamento)?
6. Se ninguém usar o campo: **remover** da tela para não gerar expectativa falsa?

### ✅ Critérios de Aceite (da decisão)
- [ ] Decisão registrada na issue com as respostas acima.
- [ ] Issues de implementação criadas a partir da decisão (ou o campo removido).
- [ ] Enquanto a decisão não sair, o campo não deve prometer comportamento que não existe.

---

# 🔁 Solicitações e fluxos de regras

## 11. [FEAT] - Associar categoria escolhida à regra da solicitação

**Labels:** `enhancement`, `api`, `web` · **Branch sugerida:** `feat/#11-categoria-regra-solicitacao`
**Requisitos relacionados:** `RF01`, `RF02`, `RF05`

### 🎯 Motivação e Contexto
A relação entre categoria, solicitação e fluxo de aprovação não está clara na interface atual, que foi considerada pouco visível e monocromática.

### 💡 Descrição da Proposta
- Ao criar uma solicitação, o usuário escolhe uma **categoria** (ex.: viagem, despesa de TI).
- A categoria associa a solicitação à **regra/fluxo** correspondente.
- As regras podem partir de **modelos existentes** ou ser **criadas do zero**.
- Deixar a relação **categoria → solicitação → fluxo** claramente visível, com destaque visual (cor, rótulo, ícone), em vez da apresentação monocromática atual.

### ✅ Critérios de Aceite
- [ ] A criação de solicitação exige/permite escolher categoria; a regra aplicável é resolvida a partir dela.
- [ ] Definido o que acontece quando a categoria não tem regra associada (bloquear criação? usar regra padrão?).
- [ ] Administrador consegue criar regra a partir de modelo ou do zero.
- [ ] A interface mostra, para uma solicitação, categoria e fluxo aplicado, com destaque visual.
- [ ] Testes: solicitação em cada categoria cai na regra esperada; categoria sem regra tem comportamento definido.

---

## 12. [FEAT] - Melhorar tela de detalhes da solicitação (modal)

**Labels:** `enhancement`, `web`, `ux` · **Branch sugerida:** `feat/#12-modal-detalhes-solicitacao`
**Depende de:** #11 (exibir categoria e fluxo)

### 🎯 Motivação e Contexto
A tela está poluída e difícil de ler; o painel lateral deixa o conteúdo pequeno.

### 💡 Descrição da Proposta
- Substituir o painel lateral por um **modal** (janela sobreposta).
- Destacar **quem solicitou**, o **valor** e a **categoria**, deixando claro **qual fluxo** está sendo usado.
- **Retirar os dados simulados** (mocks).
- Exibir o **código da solicitação**.
- Permitir **excluir** uma solicitação.

### ✅ Critérios de Aceite
- [ ] Modal substitui o painel lateral, com acessibilidade (foco preso, `Esc` fecha, rótulos).
- [ ] Solicitante, valor, categoria e fluxo em destaque no topo.
- [ ] Código da solicitação visível (e copiável).
- [ ] Nenhum dado simulado restante na tela (tudo vem da API).
- [ ] Exclusão com confirmação. **A definir:** quem pode excluir e em quais status? Como a exclusão se concilia com a trilha de auditoria imutável (`RF07`/`RF08`)? Sugestão: exclusão lógica (cancelamento), com o evento registrado na cadeia, e não remoção física.
- [ ] Testes E2E: abrir, ler e excluir.

---

## 13. [FEAT] - Simplificar configuração e leitura dos fluxos de regras

**Labels:** `enhancement`, `web`, `ux` · **Branch sugerida:** `feat/#13-simplificar-fluxos-de-regras`

### 🎯 Motivação e Contexto
Há texto demais, letras pequenas e etapas difíceis de entender na configuração e na leitura dos fluxos de regras.

### 💡 Descrição da Proposta
Simplificar a experiência e aumentar a legibilidade **sem perder a clareza** sobre as regras e fluxos aplicados: menos texto por etapa, fonte maior, etapas com linguagem direta e ordem visível.

### ✅ Critérios de Aceite
- [ ] Cada etapa do fluxo é compreensível em uma frase curta.
- [ ] Tamanho de fonte e contraste revisados (referência: WCAG AA).
- [ ] Informação detalhada continua acessível sob demanda (expandir/detalhes), sem poluir a visão principal.
- [ ] Validação com ao menos um usuário que não conhece o sistema.
- [ ] Alinhado com #11 (categoria → fluxo).

---

# 📌 Outras pendências

## 14. [SPIKE] - Avaliar organização em formato Kanban

**Labels:** `discussion`, `ux`

### 🎯 Contexto
Considerar organizar as "adições" (os itens/solicitações) em colunas para visualizar e organizar, no formato Kanban. O relato é uma sugestão, ainda sem escopo definido.

### ❓ Perguntas a responder
1. **O que vira card?** Solicitações? Outro tipo de item?
2. **As colunas seriam os status** da máquina de estados (`PENDENTE`, `EM_AJUSTE`, `APROVADA`, `REJEITADA`)? Arrastar um card entre colunas dispararia aprovação — isso conflita com regras como motivo obrigatório (≥ 10 caracteres), SoD e concorrência (`HTTP 409`)?
3. É para **todos os perfis** ou só aprovadores?
4. Combina com a sincronização em tempo real (`RNF01`)?

### ✅ Critérios de Aceite
- [ ] Protótipo/mock simples e decisão registrada (seguir / descartar / adiar).
- [ ] Se seguir, abrir issue de implementação com escopo e critérios.

---

## 15. [DECISÃO] - Esclarecer o item "Menu mais coletado"

**Labels:** `discussion`

### 🎯 Contexto
Existe uma anotação "Menu mais coletado" cuja descrição não especifica a mudança desejada (pode ser transcrição de áudio). Não é possível implementar nada sem esclarecimento.

### ❓ Perguntas a responder
- A que menu se refere (o menu removido na #4, outro)?
- O que deve mudar: remover, reordenar, recolher, renomear?
- "Coletado" pode ser "recolhido" (menu retrátil)? Confirmar com quem fez a anotação.

### ✅ Critérios de Aceite
- [ ] Autor da anotação esclarece a intenção.
- [ ] Item descartado, absorvido por outra issue (ex.: #4 ou #8) ou transformado em issue com escopo.
