# Versionamento dos POs

## Estrutura

- Família: identidade permanente do procedimento.
- Versão: conteúdo publicado em determinado período.
- Variante: fluxo regular ou excepcional.
- Aplicabilidade: regras que selecionam a versão e a variante.

## Ciclo de vida

Rascunho → Em revisão → Aguardando aprovação → Publicado → Substituído → Arquivado.

Uma versão publicada é imutável. Alterações criam uma nova versão.

## Resolução

Ao criar uma tarefa, o domínio resolve a versão aplicável e grava seu identificador na tarefa. Publicações futuras não alteram esse vínculo histórico.

## Cenário de demonstração

- Prorrogação no Evento IX recebe PO V1.
- Prorrogação no Evento X recebe PO V2.
- Cada versão possui fluxo regular e excepcional.
- Migração de tarefas ativas exige análise de impacto e confirmação explícita.

