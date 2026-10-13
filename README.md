# Gestão de Processos

Aplicação interna para centralizar tarefas, processos, cronogramas, requisições e procedimentos operacionais.

## Estado atual

O Marco 0 está em construção. Esta versão demonstra a arquitetura, a navegação, o módulo “Meu trabalho”, usuários simulados e persistência local isolada por contrato. Ainda não existe colaboração simultânea nem autenticação real.

## Requisitos

- Node.js 22 ou superior
- npm 10 ou superior

## Executar

```bash
npm install
npm run dev
```

Acesse o endereço exibido pelo Vite, normalmente `http://127.0.0.1:5173`.

## Validar

```bash
npm run test
npm run lint
npm run build
```

## Estrutura

- `src/domain`: entidades e regras de negócio.
- `src/infrastructure`: contratos e adaptadores de persistência.
- `src/features`: módulos de interface.
- `src/data`: dados demonstrativos anonimizados.
- `docs`: requisitos, decisões e memória do projeto.

## Colaboração

Consulte `CONTRIBUTING.md` e `docs/colaboracao-git.md`. A sincronização de atividades compartilhadas possui contrato próprio em `docs/contrato-sincronizacao.md`.

## Limitação importante

O repositório está atualmente em uma pasta sincronizada pelo OneDrive. Isso pode gerar arquivos duplicados e conflitos com o Git. Recomenda-se clonar o repositório remoto em `C:\Projetos\gestao-processos` antes de iniciar o trabalho simultâneo.


## Sincronização central (opcional)

A branch de sincronização acrescenta uma API SQLite, credenciais individuais,
comandos idempotentes e revisão de conflitos. O modo local continua disponível.
Consulte [execução e revisão](docs/sincronizacao-operacao.md) e
[decisões e limitações](docs/decisoes/0003-sincronizacao-central.md).
