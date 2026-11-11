# Zend Clone Bot

Clone funcional, em `discord.js`, do bot Zend/zenSallers observado no Discord.

## Como rodar

1. Instale dependencias:

```powershell
npm install
```

2. Configure as credenciais em `.env`. O arquivo `.env.example` mostra os nomes esperados; nunca publique nem compartilhe o `.env`.

```env
DISCORD_TOKEN=seu_token_do_bot
CLIENT_ID=id_da_aplicacao_do_bot
GUILD_ID=id_do_servidor
GEMINI_API_KEY=sua_chave_gemini
GEMINI_MODEL=gemini-2.5-flash
```

3. Inicie:

```powershell
npm start
```

4. Para sincronizar os emojis de `discord-emojis/upload` como emojis da aplicação do bot, sem consumir o limite do servidor:

```powershell
npm run syncemojis
```

## Comandos

- Foram mapeados e registrados os slash commands visiveis do app Zend, incluindo `/panel`, `/manage_product`, `/manage_item`, `/manage_stock`, `/postproduto`, `/entregar`, `/sales`, `/zenwallet` e `/syncemojis`.

Os dados ficam em `data/state.json`. O clone inclui os fluxos observados: loja, produto, campos/estoque, emojis customizados, cupons, posicoes, saldo interno, condecoracoes, cargo temporario, OAuth2 de compras, postagem de venda, ticket, boas-vindas, automacoes, customizacao, extrato, giveaway, configuracoes, pagamentos, zenCloud e zenProtect.

O `/panel` é restrito à equipe autorizada. Em `zenProtect`, configure o canal de logs e os limites para entradas em rajada, spam, menções em massa e mudanças em canais/cargos. Timeout/kick por entradas fica desativado até um administrador escolher essa ação.

Os atalhos de Spotify Premium e Discord Nitro levam somente às páginas oficiais; o Zend não gera contas ou códigos de resgate.

Antes de iniciar, verifique a sintaxe do projeto e os painéis:

```sh
npm run check:all
npm run test:paineis
```

Créditos do projeto: **ns_wz**.

## Alterar emojis

Todos os IDs usados pelo bot ficam no arquivo `emoji.json`, na raiz do projeto. Cada item possui um nome em portugues para facilitar a busca. Para trocar um emoji, altere somente o ID correspondente e reinicie o bot. Exemplo:

```json
"Cupom": "1518360390936039647"
```

Os emojis que ainda usam símbolos comuns ficam na seção `EmojisSemId`. Para substituir um deles por um emoji personalizado, preencha `id`. Se o emoji for GIF/animado, altere também `animado` para `true`:

```json
"Casa": { "id": "COLOQUE_O_ID_AQUI", "padrao": "🏠" }
```

Deixe `id` vazio para continuar usando o emoji padrão.

## Estrutura de configuração

- `src/configuracoes/emojis-zend.js`: pasta e extensões dos emojis locais.
- `src/configuracoes/temas-zend.js`: cinco cores de estado e temas visuais.
- `src/configuracoes/canais-zend.js`: nomes usados na criação automática de canais.
- `src/infraestrutura/resposta-painel.js`: atualização da mesma mensagem durante a navegação.
