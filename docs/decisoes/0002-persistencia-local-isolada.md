# 0002 — Persistência local isolada

Status: aceita provisoriamente em 13/10/2026.

## Decisão

Usar armazenamento local somente no protótipo e acessá-lo por `TaskRepository`.

## Consequências

A versão atual funciona sem servidor, mas não oferece colaboração simultânea, autenticação, segurança ou auditoria confiável. O adaptador local será substituído ou rebaixado a cache quando existir uma API central.

