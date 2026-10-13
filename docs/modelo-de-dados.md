# Modelo de dados

## Entidades centrais

### Tarefa

- Identificador
- Título e descrição
- Origem
- Solicitante e responsável
- Prioridade e status
- Início e prazo
- Visibilidade
- Processo, evento e versão de PO relacionados
- Dependências, etiquetas e links
- Datas de criação e atualização

### Processo

Representa nós hierárquicos dos níveis macroprocesso, processo, subprocesso e atividade. Cada nó possui identificador estável e referência opcional ao pai.

### Cronograma e evento

O cronograma define um ciclo publicável. Eventos representam etapas e regras de datas. O fechamento gera tarefas com chave idempotente.

### PO

Separado em família, versão, variante e regra de aplicabilidade. A tarefa guarda o identificador da versão resolvida no momento da criação.

### Substituição

Registra responsável original, substituto, período, limites e necessidade de aprovação. O histórico nunca perde o responsável original.

### Auditoria

Evento imutável com autor, instante, ação, entidade, revisão anterior, revisão nova e campos alterados.

## Identificadores e versões

Identificadores devem ser estáveis e independentes de nomes exibidos. Entidades compartilhadas deverão possuir um número de revisão controlado pelo armazenamento central.

