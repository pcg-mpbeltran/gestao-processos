# Executar e revisar a sincronização central

## Preparação

Use Node 22.13 ou superior, npm e a cópia local fora do OneDrive:

    npm install

O modo local continua sendo o padrão. Para habilitar a sincronização, crie .env.local:

    VITE_CENTRAL_SYNC=true

A aplicação usa /api no mesmo domínio. Em desenvolvimento o Vite encaminha para
127.0.0.1:3001. Não coloque tokens em variáveis VITE_*.

## Credenciais

Crie um arquivo privado, fora do Git, por exemplo var/equipe.credentials.json.
A estrutura é uma lista de objetos:

    [
      {
        "tokenHash": "<SHA-256 hexadecimal de um token aleatório de 32 bytes>",
        "user": {
          "id": "pessoa-a",
          "name": "Pessoa A",
          "initials": "PA",
          "role": "Colaborador",
          "team": "Equipe demonstrativa"
        }
      }
    ]

Gere cada token no próprio computador, por exemplo em Node:

    node -e "const c=require('node:crypto'); const t=c.randomBytes(32).toString('base64url'); console.log('Token:',t); console.log('Hash:',c.createHash('sha256').update(t).digest('hex'))"

Coloque somente o hash no arquivo do servidor. Entregue o token individualmente ao
respectivo usuário. Nunca faça commit desse arquivo ou dos tokens. Nomes e IDs de
exemplo são demonstrativos; o servidor não importa demoUsers nem aceita identidade
enviada no corpo do comando como autenticação. Cada ID e hash deve ser único.

## Iniciar em dois terminais PowerShell

API:

    $env:SYNC_CREDENTIALS_FILE = 'C:\Projetos\gestao-processos\var\equipe.credentials.json'
    npm run sync:server

Interface, em outro terminal:

    npm run dev

Abra o endereço exibido pelo Vite. Entre com uma credencial individual. O seletor
passa a mostrar somente a identidade autenticada; o formulário de delegação recebe
a lista de usuários da mesma equipe, fornecida pelo servidor.

Variáveis opcionais da API: SYNC_DATABASE (padrão ./var/sync.sqlite),
SYNC_PORT (padrão 3001). Se mudar a porta, ajuste também o proxy de desenvolvimento.
A API escuta somente em loopback. Para operação remota, uma etapa futura deverá
configurar proxy HTTPS, controle operacional de credenciais e backups. Nenhum deploy
faz parte desta entrega.

## Conferência entre duas pessoas

1. Abra duas sessões com credenciais diferentes da mesma equipe.
2. A cria uma tarefa atribuída a B. B a recebe em até um ciclo de polling.
3. B conclui a tarefa. A recebe a revisão atualizada.
4. Faça duas edições sobre a mesma revisão: a segunda permanece em conflito.
5. Pare a API, registre uma alteração e reinicie a API com o mesmo banco: a fila é
   reenviada, sem duplicação. A fila também sobrevive à recarga e ao fechamento do navegador normal (localStorage).
6. Crie uma tarefa pessoal sem delegar: só o autor recebe seu conteúdo.
7. Desconectar remove os dados da tela e a credencial da sessão ativa; cache/fila
   permanecem no dispositivo, separados por identidade, para permitir recuperação.
   Entre novamente com a mesma identidade para recuperar a fila. Limpar dados do site ou encerrar navegação privada pode apagar pendências.

## API

Todas as rotas exigem Authorization: Bearer <token> e não habilitam CORS.

- GET /api/session — identidade e pessoas da equipe.
- GET /api/tasks — snapshot autorizado e cursor consistente.
- GET /api/changes?cursor=N — até 500 eventos examinados, dados autorizados e novo cursor.
- POST /api/commands — create, update ou comment conforme o contrato TypeScript.
- GET /api/history?taskId=ID — eventos autorizados em ordem.

Update exige revision. O patch pode alterar status/responsável e demais campos
permitidos, mas não id, origem, solicitante, criação ou versão do PO.
401 indica credencial inválida, 403 permissão insuficiente, 404 entidade não visível,
409 conflito/idempotência e 410 cursor inválido. O adaptador recupera snapshot após 410.
Comandos inválidos não produzem auditoria nem modificações parciais.

## Verificações

    npm run test
    npm run lint
    npm run build

Os testes usam arquivos SQLite temporários e contas fictícias; incluem tráfego HTTP
real em loopback, concorrência em duas conexões, privacidade, histórico, paginação,
perda de resposta após commit e recuperação da fila.

Veja docs/decisoes/0003-sincronizacao-central.md para decisões e limitações.
