# Arquitetura

## Estrutura inicial

```text
Interface React
      ↓
Casos de uso e regras de domínio
      ↓
Contrato de repositório
      ↓
Adaptador local agora | API central futuramente
```

## Módulos

- `domain`: entidades, validações e regras puras.
- `features`: telas e fluxos organizados por capacidade.
- `infrastructure`: persistência, transporte e integrações.
- `data`: demonstração e dados anonimizados.

## Persistência

O adaptador inicial usa o armazenamento local do navegador, mas implementa `TaskRepository`. Componentes não acessam `localStorage` diretamente. A sincronização central deverá criar outro adaptador para o mesmo contrato ou evoluí-lo de forma compatível.

## Estado compartilhado

Enquanto não houver servidor, o estado é carregado na inicialização e salvo após alterações. Essa estratégia não oferece concorrência, colaboração simultânea, auditoria confiável ou segurança real.

## Evolução prevista

1. Separar os casos de uso de criação, atualização e consulta.
2. Introduzir API central e autenticação.
3. Implementar sincronização incremental e conflitos por revisão.
4. Migrar o armazenamento local para cache, não para fonte oficial.

