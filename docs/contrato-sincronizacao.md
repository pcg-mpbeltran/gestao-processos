# Contrato para sincronização de atividades compartilhadas

## Responsabilidade

Implementar a fonte central das atividades compartilhadas e a atualização entre sessões, sem acoplar a interface ao banco ou ao transporte de rede.

## Limite de módulos

A implementação deve respeitar as entidades em `src/domain` e o contrato de persistência em `src/infrastructure`. Caso o contrato precise mudar, faça a alteração em um Pull Request pequeno antes de implementar o restante.

## Atividades compartilhadas

São tarefas de equipe, processo, cronograma, recorrência, requisição e tarefas pessoais explicitamente delegadas. Tarefas pessoais não delegadas permanecem privadas.

## Capacidades mínimas

- fonte oficial central;
- carregamento inicial e sincronização incremental;
- reconexão e recuperação por cursor;
- identificação idempotente dos comandos;
- eventos deduplicados e ordenados;
- revisão controlada pelo servidor;
- conflitos apresentados sem sobrescrita silenciosa;
- permissões validadas no servidor;
- auditoria com autor, instante e campos alterados.

## Contrato lógico

O adaptador central deverá oferecer operações equivalentes a:

- listar atividades autorizadas;
- consultar mudanças depois de um cursor;
- criar atividade com chave de idempotência;
- atualizar atividade informando a revisão conhecida;
- mudar responsável ou status;
- registrar comentário;
- consultar histórico;
- assinar eventos de atualização.

## Estados de interface

A integração deve informar: salvando, sincronizado, sem conexão, alteração pendente, conflito e falha.

## Cenários de aceite

1. A cria uma tarefa de equipe e B a recebe.
2. B altera o status e A recebe a atualização.
3. Edições simultâneas produzem conflito recuperável.
4. A reconexão recupera mudanças sem duplicação.
5. Reenvio de comando não duplica registros.
6. Tarefa pessoal privada não é entregue a outro usuário.
7. Operação sem permissão é rejeitada no servidor.
8. Mudanças aceitas geram auditoria.

## Fora do escopo desta frente

- redesenho das telas;
- migração do Asana;
- envio real de e-mail;
- upload de documentos;
- alteração retroativa de versões de PO.

