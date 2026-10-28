# Bot de Discord — Painel de Configurações (Components V2)

## ⚠️ Antes de tudo
Você colou um token de bot e uma connection string do MongoDB em texto puro na conversa.
Ambos devem ser considerados comprometidos:

1. Discord Developer Portal → sua aplicação → Bot → **Reset Token**.
2. MongoDB Atlas → Database Access → troque a senha do usuário.

Só depois disso, preencha o `.env` (veja `.env.example`) com as credenciais **novas**.

## Instalação
```bash
npm install
cp .env.example .env
# edite o .env com TOKEN e MONGO_URI novos
npm start
```

Requer **discord.js v14.17+** (necessário para os componentes Container, Section,
TextDisplay e Separator do Components V2). O `package.json` já fixa essa versão.

## Intents necessárias (Developer Portal → Bot)
Ative: **Server Members Intent** e **Message Content Intent**.

## Comandos
- `n!menu` — abre o painel principal de configurações (prefixo padrão: `n!`,
  pode ser alterado pelo próprio painel, por servidor).

## O que foi implementado
- Menu principal com select menu (Aparência e prefixo / Comunidade e interação).
- **Aparência e prefixo**: nome, avatar e banner do bot via modal (campo de link de
  imagem — upload direto de arquivo em modal é um recurso muito novo da API do
  Discord e ainda não tem suporte estável em bibliotecas; deixei isso documentado
  no código em `ui/aparenciaModals.js`). Prefixo definido digitando no chat
  (mensagem apagada automaticamente, salva por servidor no Mongo).
- **Comunidade e interação**:
  - **Portaria**: canal de boas-vindas, canal de saída, mensagens customizáveis
    (placeholders `{user}`, `{usertag}`, `{server}`).
  - **Auto-roles**: até 5 cargos aplicados automaticamente a quem entra.
  - **Logs do servidor**: um canal de destino recebe logs de entradas/saídas,
    bans/unbans, expulsões (best-effort via audit log), mute/unmute (timeout),
    cargos adicionados/removidos, canais criados/excluídos/editados, fluxo de
    call e mensagens editadas/excluídas.
- Botão "Voltar" presente em todos os sub-painéis.
- Tudo salvo no MongoDB via Mongoose (`database/models`).

## Estrutura
```
index.js                  → bootstrap do client, comandos e eventos
database/                 → conexão + schemas (GuildConfig, BotConfig)
commands/menu.js          → comando n!menu
ui/                       → construtores de componentes V2 de cada painel
handlers/                 → lógica de botões, selects e modais
events/                   → ready, messageCreate (prefixo), interactionCreate
logger/logEvents.js       → todos os listeners de logging do servidor
```

## Deploy no Render
Existem duas formas de rodar isso no Render:

### Opção A — Background Worker (pago, sem sleep, mais confiável)
Não tem plano gratuito, mas roda 24/7 sem truques. Em **New → Background
Worker**, use Build Command `npm install` e Start Command `node index.js`.

### Opção B — Web Service gratuito + UptimeRobot (o que este projeto já traz configurado)
O plano free do Render "dorme" o serviço depois de ~15 min sem receber
requisições HTTP. Para contornar isso, o `index.js` já sobe um mini servidor
HTTP (`keepAlive.js`) que responde na porta indicada pelo Render — é nele que
o UptimeRobot vai bater.

Passos:
1. Suba este projeto num repositório Git (GitHub/GitLab). O `.gitignore` já
   impede que `.env` e `node_modules` sejam enviados.
2. No Render, **New → Blueprint** apontando pro repositório (o `render.yaml`
   já está configurado como `type: web`, plano `free`). Ou, manualmente,
   **New → Web Service** com Build Command `npm install` e Start Command
   `node index.js`.
3. Em **Environment**, adicione `TOKEN` e `MONGO_URI` com as credenciais
   novas (nunca cole o `.env` em texto no chat ou no repositório).
4. No MongoDB Atlas → Network Access, libere `0.0.0.0/0`, já que o Render
   usa IPs dinâmicos.
5. Deploy. Nos logs deve aparecer `[KEEPALIVE] Servidor HTTP ouvindo na porta
   ...` e depois `[BOT] Online como ...`.
6. Copie a URL pública do serviço (algo como
   `https://discord-bot-painel.onrender.com`).
7. No [UptimeRobot](https://uptimerobot.com), crie um **New Monitor**:
   - **Monitor Type:** HTTP(s)
   - **URL:** a URL do passo 6 (a raiz `/` já responde)
   - **Monitoring Interval:** 5 minutos
   - Salve.

A partir daí o UptimeRobot bate na URL a cada 5 minutos e o Render nunca vê
15 minutos de inatividade, então o serviço não dorme.

**Importante:** mesmo com esse truque, o plano free do Render tem limite de
horas de execução por mês e pode ter instabilidades/cold starts ocasionais.
Para um bot que precisa ficar online o tempo todo sem exceções, a Opção A
(Background Worker pago) é a mais confiável.

## Observações
- `client.user.setUsername` é limitado pelo próprio Discord (poucas trocas por hora).
- `client.user.setBanner` exige que a conta do bot tenha "boost"/Nitro visual habilitado
  para banner (regra da própria plataforma).
- O nome/avatar/banner do bot são globais (afetam todos os servidores), então ficam
  salvos em `BotConfig` (documento único), não por servidor.
