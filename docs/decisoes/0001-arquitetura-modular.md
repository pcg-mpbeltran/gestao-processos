# 0001 — Arquitetura modular

Status: aceita em 13/10/2026.

## Decisão

Usar React, TypeScript e Vite. Separar regras em `domain`, telas em `features` e integrações em `infrastructure`.

## Motivo

A separação reduz acoplamento, facilita testes e permite que a persistência local seja substituída pelo armazenamento central.

