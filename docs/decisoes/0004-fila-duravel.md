# Decisão 0004 — Fila durável e recuperação defensiva

Data: 13/10/2026. Estado: implementada para revisão no PR #1.

A fila e o snapshot usam localStorage, separados por identidade, em envelope versão 2.
A escolha mantém a serialização do cache e evita alterar Task/TaskRepository.
Operações públicas do adaptador são assíncronas para aguardar coordenação entre abas.
O servidor SQLite continua sendo a fonte central. Credenciais permanecem somente em memória.

A restauração valida tarefas, revisões, cursor, comandos, unicidade e identidade.
Cache inválido é removido apenas para a identidade atual, permitindo novo snapshot.
A migração do sessionStorage só remove a origem depois da gravação durável bem-sucedida.
Falhas de quota não sobrescrevem a última gravação válida.

Respostas 2xx vazias, não JSON ou incompatíveis com o contrato são recuperáveis, assim como falhas de rede e 5xx:
o comando conserva seu identificador e pode ser reenviado com idempotência no servidor.
Erros HTTP 4xx, incluindo 401/403, mantêm seu status mesmo com corpo vazio, HTML ou JSON inválido. Não são convertidos em indisponibilidade.

## Limites para revisão

- A durabilidade depende dos dados do site: limpeza manual, navegação privada ou políticas
  do navegador podem removê-los. localStorage tem quota e não substitui backup central.
- Abas da mesma identidade usam Web Locks exclusivo, nomeado pela chave do cache.
  Toda leitura/migração, inclusão, sincronização, confirmação, descarte e reaplicação
  ocorre sob esse bloqueio, relendo o estado persistido antes de alterar a fila.
  Uma resolução de conflito antiga verifica o commandId antes de modificar a fila.
  Contas diferentes têm filas e bloqueios separados.
- Web Locks requer navegador compatível e contexto seguro (HTTPS ou localhost).
  Sem suporte, o adaptador recusa gravações; não há fallback inseguro.
  Recarregar todas as abas antigas ao atualizar: versões anteriores não adquirem o bloqueio.
- O bloqueio cobre também o envio para evitar confirmações concorrentes. Outra aba pode
  aguardar uma requisição em andamento (timeout HTTP de 15 segundos por requisição).
  Fechar uma aba libera o bloqueio; comandos não confirmados permanecem para replay idempotente.
  O polling atualiza a visualização das demais abas.
- Dados em cache são acessíveis a quem controla o perfil do navegador; sair remove a
  credencial e os dados da tela, mas preserva pendências para recuperação autenticada.
- Não há migração dos dados demonstrativos do modo local para o servidor.

## Referência

[Web Locks API — coordenação por origem](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API).
