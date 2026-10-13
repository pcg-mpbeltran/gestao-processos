# Decisão 0004 — Fila durável e recuperação defensiva

Data: 13/10/2026. Estado: implementada para revisão no PR #1.

A fila e o snapshot usam localStorage, separados por identidade, em envelope versão 2.
A escolha preserva o contrato síncrono SyncCache e evita alterar Task/TaskRepository.
O servidor SQLite continua sendo a fonte central. Credenciais permanecem somente em memória.

A restauração valida tarefas, revisões, cursor, comandos, unicidade e identidade.
Cache inválido é removido apenas para a identidade atual, permitindo novo snapshot.
A migração do sessionStorage só remove a origem depois da gravação durável bem-sucedida.
Falhas de quota não sobrescrevem a última gravação válida.

Respostas HTTP vazias, não JSON ou incompatíveis com o contrato são recuperáveis:
o comando conserva seu identificador e pode ser reenviado com idempotência no servidor.
Erros válidos de autenticação, permissão e conflito mantêm sua classificação original.

## Limites para revisão

- A durabilidade depende dos dados do site: limpeza manual, navegação privada ou políticas
  do navegador podem removê-los. localStorage tem quota e não substitui backup central.
- Usar uma aba ativa por identidade/dispositivo: coordenação entre abas da mesma conta
  ainda não foi implementada. Contas diferentes têm filas separadas.
- Dados em cache são acessíveis a quem controla o perfil do navegador; sair remove a
  credencial e os dados da tela, mas preserva pendências para recuperação autenticada.
- Não há migração dos dados demonstrativos do modo local para o servidor.
