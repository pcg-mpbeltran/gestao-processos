# Colaboração com Git

## Estado preparado

O projeto usa `main` como branch de integração e `feature/marco-0-fundacao` para esta entrega inicial. O remoto ainda precisa ser criado em uma organização ou conta definida pela equipe.

## Publicar pela primeira vez

Depois de criar um repositório privado vazio no GitHub:

```bash
git remote add origin URL_DO_REPOSITORIO
git push -u origin feature/marco-0-fundacao
```

Abra um Pull Request da branch de fundação para `main`. Depois da revisão e do merge, cada pessoa deve criar sua própria branch a partir de `main`.

## Divisão recomendada

- Pessoa 1: fundação, interface e evolução de gestão do trabalho.
- Pessoa 2: armazenamento central e sincronização, conforme `docs/contrato-sincronizacao.md`.

## Evitar conflitos

- Não trabalhar na mesma branch.
- Não alterar simultaneamente `src/domain/task.ts` ou `src/infrastructure/taskRepository.ts` sem alinhar o contrato.
- Atualizar a branch com frequência usando merge ou rebase conforme o padrão acordado.
- Integrar somente por Pull Request aprovado.

## Proteções recomendadas para `main`

- exigir Pull Request;
- exigir pelo menos uma aprovação;
- exigir a validação automatizada;
- impedir push direto;
- impedir exclusão da branch.

## OneDrive

Após o primeiro push, cada pessoa deve clonar o repositório em uma pasta local como `C:\Projetos\gestao-processos`. Não compartilhe a mesma pasta física nem sincronize `.git` pelo OneDrive.

