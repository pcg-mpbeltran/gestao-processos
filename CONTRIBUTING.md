# Como contribuir

## Preparação

1. Clone o repositório fora do OneDrive.
2. Execute `npm install`.
3. Crie uma branch a partir de `main`.

```bash
git switch main
git pull --ff-only
git switch -c feature/nome-curto
```

## Durante o desenvolvimento

- Faça alterações pequenas e focadas.
- Não compartilhe a mesma branch entre duas pessoas.
- Atualize sua branch antes de abrir o Pull Request.
- Registre mudanças de arquitetura em `docs/decisoes`.
- Não use dados pessoais reais em exemplos ou testes.

## Antes do Pull Request

```bash
npm run test
npm run lint
npm run build
```

O Pull Request deve descrever o objetivo, os arquivos principais, as verificações executadas, os riscos e os pontos que precisam de revisão.

