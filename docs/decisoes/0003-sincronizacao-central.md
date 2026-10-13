# Decisão 0003 — Fonte central e sincronização incremental

Data: 13/10/2026. Estado: proposta implementada para revisão no Pull Request.

## Decisões

- API Node com SQLite em arquivo local ao servidor, fora do OneDrive. WAL e transações
  IMMEDIATE serializam alterações. Tarefa, revisão, auditoria e resultado idempotente são
  gravados ou revertidos juntos. Node mínimo 22.13; desenvolvimento validado em 24.18.
- Uma instância central, sem dependência de serviço pago. Não compartilhar o arquivo
  SQLite por rede. Escala horizontal/alta disponibilidade exigirá outro adaptador,
  por exemplo PostgreSQL. A API não foi implantada.
- Contrato adicional em src/infrastructure/sync/contract.ts. Task e TaskRepository
  existentes permanecem intactos. O método save(tasks) do modo local não oferece
  semântica segura de concorrência; por isso o modo central usa comandos explícitos.
- Comandos possuem identificador único por autor; reenvio com o mesmo conteúdo
  retorna o resultado original. A mesma chave com outro conteúdo é rejeitada.
  IDs de tarefas são globalmente únicos no banco.
- Revisão inteira do servidor com comparação otimista. Conflito mantém o comando
  pendente. A pessoa compara o comando e a versão central e decide descartar ou
  reaplicar com nova chave e revisão. Não existe last-write-wins silencioso.
- Polling de dois segundos implementa a assinatura do adaptador. Feed paginado de
  500 eventos, ordenado por cursor global. Snapshot e cursor são lidos na mesma
  transação. O cliente deduplica por revisão e cursor.
- Cache e fila ficam em sessionStorage por identidade. Sobrevivem à recarga da mesma
  aba, mas não ao fechamento definitivo da sessão. Tokens ficam apenas em memória;
  a reconexão após recarga pede novamente a credencial. Outra conta não reutiliza
  a fila da anterior. Não há migração automática dos dados demonstrativos locais.
- Tarefas pessoais sem delegação são privadas, mesmo se o cliente pedir visibilidade
  de equipe. Delegação explícita abre acesso aos envolvidos. Permissões são aplicadas
  em snapshot, feed, comandos, replay idempotente e histórico.
- Mudança de visibilidade envia remoção sem conteúdo aos clientes que perderam acesso.
  Histórico privado anterior à delegação não é exposto. Não é possível apagar informação
  que um destinatário já recebeu; a remoção do cache depende da reconexão.
- Auditoria somente de acréscimo pela API, com autor autenticado, horário do servidor,
  ação, revisões e campos alterados. Comentários são eventos revisionados. A API não
  expõe operações para alterar/excluir auditoria; não é um log criptograficamente
  inviolável contra administradores com acesso direto ao arquivo.

## Autenticação e permissões para revisão

Credenciais bearer aleatórias, fornecidas individualmente, são verificadas por SHA-256
no servidor. Não existe token padrão, login pelo seletor nem segredo VITE_*.
O arquivo privado associa a credencial à identidade, equipe e perfil. Mudanças de
credenciais/perfis exigem reiniciar o servidor. Uso remoto exige HTTPS via proxy.

Política inicial: mesma equipe para consulta/atribuição; visualizador só consulta;
colaborador e dono do processo editam apenas tarefas em que estão envolvidos; gestor
e administrador editam tarefas visíveis da própria equipe. Só solicitante ou gestor/
administrador altera responsável/visibilidade. Ninguém consulta conteúdo pessoal
privado alheio, inclusive gestores. Escopos por processo/área e autenticação corporativa
OIDC permanecem pendentes; o perfil dono do processo não recebe poderes globais.

## Limites operacionais

- Sem SSO, expiração automática de tokens, administração de usuários ou multi-instância.
- Sem edição offline de uma mesma tarefa com múltiplos comandos na fila.
- Feed e auditoria não são compactados; retenção e backups precisam de política operacional.
- Uma restauração de backup pode invalidar cursores e exigir recarga; perda de comandos já
  confirmados em backup antigo não é resolvida automaticamente. Não restaurar banco antigo
  sob sessões ativas. Manter backup consistente do SQLite (incluindo WAL quando aplicável).
- Snapshot ainda não paginado. SQLite síncrono destina esta primeira versão a equipes pequenas.
- Interface mantém o desenho existente e acrescenta somente conexão, estado e conflitos.
  Comentários, atribuição e histórico têm API/contrato; não foi criada uma tela de histórico
  nem um editor completo para essas operações.

## Referência técnica

SQLite do Node: https://nodejs.org/docs/latest-v24.x/api/sqlite.html .
