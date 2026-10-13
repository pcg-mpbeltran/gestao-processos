# Status do projeto

Atualizado em 13/10/2026.

## Concluído

- Materiais de referência inspecionados.
- Repositório Git local iniciado em branch própria.
- Estrutura React, TypeScript e Vite criada.
- Navegação principal e identidade visual inicial.
- Tela inicial e “Meu trabalho” funcionais.
- Usuários simulados e dados demonstrativos anonimizados.
- Persistência local isolada por contrato.
- Testes básicos de tarefas.
- Documentação de produto, arquitetura, Git e sincronização.
- Automação de validação para Pull Requests.

## Em andamento

- Publicação da fundação no repositório remoto.

## Próximo passo

1. Convidar a segunda pessoa para o repositório privado.
2. Ela deve clonar o repositório fora do OneDrive.
3. Criar uma branch própria a partir de `main`.
4. Iniciar Marco 1 e o adaptador de sincronização em trabalhos separados.

## Decisões pendentes

- Provedor do armazenamento central.
- Estratégia de autenticação.
- Política definitiva de conflito entre edições simultâneas.

## Riscos e limitações

- `localStorage` não oferece colaboração simultânea.
- O seletor de usuário não é autenticação.
- A pasta atual está no OneDrive e pode conflitar com o Git.

## Verificações executadas

- 3 testes automatizados aprovados.
- Análise estática aprovada.
- Verificação de tipos e build de produção aprovados.
- Interface verificada em larguras de desktop e celular.
- Navegação para “Meu trabalho” e abertura do formulário de tarefa verificadas.
- Nenhum erro ou aviso registrado no console do navegador.

## Comandos de validação

```bash
npm run test
npm run lint
npm run build
```


## Entrega de sincronização — 13/10/2026

Implementada na branch feature/sincronizacao-atividades, sujeita à revisão por PR:

- API central Node/SQLite com autenticação por credenciais individuais.
- Operações transacionais, revisão otimista, idempotência e auditoria.
- Snapshot consistente, feed incremental paginado e assinatura por polling.
- Cache/fila durável por usuário no dispositivo; recuperação após queda de conexão e reabertura.
- Tarefas pessoais privadas e remoção do cache após revogação de acesso.
- Integração opcional com a interface, estados de sincronização e resolução explícita de conflitos.
- Task e TaskRepository originais preservados.
- Sem merge, deploy ou publicação da aplicação.

Decisões de armazenamento, autenticação provisória, política de conflitos e escopos
iniciais estão documentadas em decisoes/0003-sincronizacao-central.md e precisam de
revisão. Execução: sincronizacao-operacao.md. A escolha definitiva de SSO e a política
operacional de backups/retenção continuam pendentes.

Verificação desta entrega: 18 testes aprovados (3 existentes e 15 novos), lint e
build de produção aprovados. Instalação concluída com auditoria npm sem vulnerabilidades.

## Correções da revisão do PR #1 — 13/10/2026

- Fila em localStorage versionado por identidade, com migração segura da sessão anterior.
- Validação completa do cache e descarte automático de entradas inválidas.
- Respostas vazias, não JSON ou fora do contrato mantêm comandos para nova tentativa.
- Área de sincronização e comparação de conflitos formatada para desktop e celular.
- Identidade autenticada sem simulação e texto de armazenamento adequado ao modo central.
- Testes adicionais de persistência, migração, cache corrompido, respostas inválidas e interface.
- Decisão e limites do armazenamento durável em decisoes/0004-fila-duravel.md.

Validação das correções: 50 testes aprovados; npm run lint e npm run build aprovados nos modos local e central. Inspeção visual desktop realizada; conferência móvel final interrompida pelo navegador.
