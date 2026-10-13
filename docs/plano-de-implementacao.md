# Plano de implementação

## Marco 0 — Fundação

Escopo: documentação, estrutura React, navegação, modelos, persistência local isolada, dados demonstrativos e testes básicos.

Critérios de aceite:

- aplicação inicia localmente;
- navegação principal funciona;
- “Meu trabalho” lista, filtra, cria e conclui tarefas;
- troca de usuário demonstra diferentes visões;
- dados sobrevivem ao recarregamento;
- testes, análise estática e build passam;
- fluxo Git e contrato de sincronização estão documentados.

## Marco 1 — Gestão do trabalho

Tarefas pessoais e de equipe, subtarefas, recorrência, comentários, filtros completos, histórico e formulários detalhados.

## Marco 2 — Processos e relações

Importação controlada da hierarquia, catálogo, requisições, dependências e mapa visual.

## Marco 3 — Cronogramas

Eventos, calendário, lista, Kanban, Gantt, sobreposições, fechamento e geração idempotente.

## Marco 4 — POs

Editor, publicação, versões, variantes, aplicabilidade e vínculo histórico.

## Marco 5 — Pessoas e governança

Perfis, permissões, substituições, notificações e auditoria confiável.

## Trabalho paralelo permitido

A segunda pessoa pode iniciar o desenho e a implementação da sincronização depois que o contrato do Marco 0 estiver estabilizado. Mudanças em `Task`, `TaskRepository` ou permissões devem ser alinhadas por Pull Request antes da integração.

