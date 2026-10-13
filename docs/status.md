# Status do projeto

Atualizado em 13/10/2026.

## Concluído

- Materiais de referência inspecionados.
- Repositório Git local iniciado em branch própria.
- Estrutura React, TypeScript e Vite criada.
- Navegação principal e identidade visual inicial.
- Tela inicial e “Meu trabalho” funcionais.
- Usuários simulados e dados demonstrativos anonimizados.
- Persistência local isolada por contrato.
- Testes básicos de tarefas.
- Documentação de produto, arquitetura, Git e sincronização.
- Automação de validação para Pull Requests.

## Em andamento

- Publicação da fundação no repositório remoto.

## Próximo passo

1. Convidar a segunda pessoa para o repositório privado.
2. Ela deve clonar o repositório fora do OneDrive.
3. Criar uma branch própria a partir de `main`.
4. Iniciar Marco 1 e o adaptador de sincronização em trabalhos separados.

## Decisões pendentes

- Provedor do armazenamento central.
- Estratégia de autenticação.
- Política definitiva de conflito entre edições simultâneas.

## Riscos e limitações

- `localStorage` não oferece colaboração simultânea.
- O seletor de usuário não é autenticação.
- A pasta atual está no OneDrive e pode conflitar com o Git.

## Verificações executadas

- 3 testes automatizados aprovados.
- Análise estática aprovada.
- Verificação de tipos e build de produção aprovados.
- Interface verificada em larguras de desktop e celular.
- Navegação para “Meu trabalho” e abertura do formulário de tarefa verificadas.
- Nenhum erro ou aviso registrado no console do navegador.

## Comandos de validação

```bash
npm run test
npm run lint
npm run build
```

