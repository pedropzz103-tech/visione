# Operação do Affiliate Factory

## O que entra e o que sai

A descoberta pode ser feita manualmente por um Product Hunter humano, mas o
software não pesquisa nem raspa a Shopee. Cada produto entra manualmente pelo
Telegram ou por uma pasta local. O pacote inclui link de afiliado Shopee, fatos
comerciais, uma a três vantagens factuais e arquivos de imagem com procedência
conhecida.

O pipeline produz um MP4 1080×1920, H.264/AAC, 30 FPS e 10–25 segundos. Após o
quality gate, ele envia o MP4 ao operador pelo Telegram, publica o vídeo no
TikTok via Buffer e publica as imagens fornecidas no X e Threads via Buffer.
Todos os textos recebem o link de afiliado e `#publicidade`.

## Preparar o bot

1. Crie o bot pelo BotFather e guarde o token somente em GitHub Secrets.
2. Inicie uma conversa privada com o bot.
3. Descubra o seu `chat_id` e cadastre-o em `TELEGRAM_ALLOWED_CHAT_ID`.
4. Envie uma foto ou álbum com a legenda do modelo no README.
5. Não use arquivos maiores que 20 MB por imagem. O Bot API comum limita o
   download a 20 MB.

Mensagens de outros chats são ignoradas. Álbuns são agrupados pelo
`media_group_id`. O offset só é salvo no bucket privado depois que todos os
produtos terminam com sucesso, portanto uma falha pode ser retomada sem perder
entrada e uma mensagem concluída não volta em uma execução futura. O Telegram conserva updates
pendentes por até 24 horas; execute o workflow na mesma manhã.

## Recursos Cloudflare R2

Use dois buckets distintos:

- `R2_PRIVATE_BUCKET`: manifests, offsets, estados, claims e recibos; nunca
  exponha domínio público.
- `R2_PUBLIC_BUCKET`: somente `final/publication/...`; associe um domínio HTTPS
  estável e coloque-o em `R2_PUBLIC_BASE_URL`.

O Buffer não recebe uploads. Ele acessa URLs públicas diretas e não expirantes,
por isso URLs pré-assinadas não são usadas. Imagens e vídeos permanecem
disponíveis até a publicação terminar.

## GitHub Secrets exigidos

Cadastre apenas os nomes abaixo; não coloque valores em arquivos ou logs:

```text
CLOUDFLARE_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_PRIVATE_BUCKET
R2_PUBLIC_BUCKET
R2_PUBLIC_BASE_URL
BUFFER_API_KEY
BUFFER_ORGANIZATION_ID
BUFFER_TIKTOK_CHANNEL_ID
BUFFER_X_CHANNEL_ID
BUFFER_THREADS_CHANNEL_ID
TELEGRAM_BOT_TOKEN
TELEGRAM_ALLOWED_CHAT_ID
```

No Buffer, confirme que os três canais estão conectados e com a fila ativa. A
API usa o serviço `tiktok` para TikTok, `twitter` para X e `threads` para
Threads. A publicação é criada com `schedulingType: automatic`,
`mode: addToQueue` e `needsApproval: false`.

## Executar

O workflow é exclusivamente `workflow_dispatch`; não existe cron e ele não
faz deploy nem altera o site VISIONE. Em uso normal escolha `production` e
mantenha `publish=true`. Isso processa todas as entradas pendentes e publica
automaticamente depois do QA.

Para testar o código sem rede:

```powershell
npm.cmd run dry-run
```

Para validar uma pasta manual:

```powershell
npx.cmd tsx src/cli.ts validate --bundle C:\caminho\produto
```

Para renderizar sem publicar:

```powershell
npx.cmd tsx src/cli.ts render --bundle C:\caminho\produto --output artifacts\produto.mp4
```

## Idempotência e falhas incertas

A chave de publicação combina canal, video ID e hash do conteúdo. Antes do
Buffer, um claim é criado com escrita condicional. Um recibo confirmado faz a
próxima execução retornar `skipped_duplicate`. Um claim sem recibo ou uma queda
de rede depois do envio retorna `needs_reconciliation`: o sistema não tenta de
novo automaticamente, porque o Buffer pode já ter criado o post.

Erros definitivos de validação ou credencial são rejeitados. `429`, `5xx` e
falhas de transporte só podem ser repetidos antes de existir claim. Depois do
claim, investigue no Buffer usando a publication key e o horário do recibo.

## Recuperação

1. Não apague `state/idempotency` nem `state/receipts` no bucket privado.
2. Compare o claim, o recibo e os posts do Buffer antes de qualquer intervenção.
3. Se o post existe, grave/reconstrua o recibo em vez de reenviar.
4. Se houver prova de que o Buffer não recebeu o pedido, crie uma nova execução
   somente após remover o claim específico de forma controlada e documentada.
5. Preserve a mídia pública enquanto o post estiver na fila.

## Limites e expansões

O X recebe no máximo quatro imagens por post; Threads recebe até dez. O MP4
enviado pelo bot deve ter no máximo 50 MB. O quality gate do TikTok aceita até
100 MB, portanto um arquivo entre 50 e 100 MB pode publicar mas falhar no retorno
ao Telegram; esse caso deve ser tratado como erro operacional.

TikTok Shop e integrações de dados Shopee ficam desativadas até existir API
oficial, credenciais e termos compatíveis. Novas redes devem implementar a porta
`Publisher`, receber somente URLs públicas e manter a mesma idempotência.
