# Orientações para agentes

## Contexto

Este repositório contém o sistema interno de gestão de processos da equipe. A interface e a documentação devem permanecer em português do Brasil.

## Regras de trabalho

- Leia `README.md` e `docs/status.md` antes de editar.
- Preserve alterações existentes e não altere arquivos fora do escopo.
- Use uma branch por funcionalidade e commits pequenos.
- Não faça merge, push, deploy ou publicação sem autorização explícita.
- Mantenha regras de negócio fora dos componentes visuais.
- Acesse persistência somente por contratos em `src/infrastructure`.
- Não use `localStorage` diretamente na camada de domínio.
- Não inclua dados pessoais reais. Use dados demonstrativos anonimizados.
- Atualize testes e documentação quando mudar regras ou contratos.
- Execute `npm run test`, `npm run lint` e `npm run build` antes de declarar a tarefa concluída.

## Divisão atual

- Fundação e aplicação local: branch `feature/marco-0-fundacao`.
- Sincronização compartilhada: deve partir da fundação estabilizada e seguir `docs/contrato-sincronizacao.md`.

