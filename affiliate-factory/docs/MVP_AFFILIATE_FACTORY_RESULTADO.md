# MVP AFFILIATE FACTORY — RESULTADO

Data da verificação: 21 de agosto de 2026.

## Resultado

O MVP foi implementado de forma isolada em `affiliate-factory/`, com um novo
workflow manual próprio. Nenhum arquivo do site público VISIONE nem o workflow
existente de deploy/sincronização foi modificado.

O fluxo implementado recebe produtos manualmente por pasta ou pelo bot do
Telegram. O operador fornece link afiliado Shopee, fatos e imagens. O software
não raspa a Shopee, não usa API da Shopee e não depende da API da OpenAI.

Depois da entrada, o sistema valida o pacote, cria identidade estável, roteiro e
variante TikTok, renderiza em Remotion, normaliza com FFmpeg, valida por FFprobe
e quality gate, envia mídia pública ao R2, publica via Buffer no TikTok, X e
Threads, persiste claims/recibos idempotentes e envia o MP4 e o resumo pelo
Telegram.

## Evidência local verificada

- Testes: 84 aprovados em 28 arquivos; zero falhas.
- TypeScript: `npm.cmd run typecheck` terminou com código 0.
- Build: `npm.cmd run build` terminou com código 0.
- Dry-run real: estado `qa_passed`; render e QA `OK`; redes `dry-run`.
- Inspeção visual: quadro intermediário verificado depois da correção do fixture.
- Isolamento: 90 arquivos no diff aprovado e zero fora de
  `affiliate-factory/`, do novo workflow e dos documentos de implementação.

### MP4 de evidência

- Video ID: `vid_0803bfaddf27b8216829`
- Resolução: 1080×1920
- Proporção: 9:16
- Vídeo: H.264
- Áudio: AAC estéreo silencioso
- FPS: 30
- Duração: 12,000 s
- Tamanho: 749.457 bytes
- SHA-256:
  `ea426f2b8c07a189d775f245e99d5399284d3a91d59b0ce4962c3c21aa0b1675`

O fixture é marcado como não publicável, usa mídia criada no repositório e não
contém produto, preço ou alegação comercial real.

## Publicação multicanal

- TikTok: adapter oficial Buffer implementado e testado com resposta HTTP
  simulada; usa o MP4 público.
- X: adapter oficial Buffer implementado e testado; usa até quatro imagens
  fornecidas e inclui o link afiliado.
- Threads: adapter oficial Buffer implementado e testado; usa até dez imagens
  fornecidas e inclui o link afiliado.
- Buffer: GraphQL `createPost`, `schedulingType: automatic`,
  `mode: addToQueue`, `needsApproval: false`.
- Resultados ambíguos não são reenviados: entram em
  `needs_reconciliation`.
- TikTok Shop e dados automáticos Shopee permanecem desativados.

## Telegram

- Entrada: `getUpdates`, chat autorizado, foto/álbum, legenda estruturada,
  agrupamento por `media_group_id`, `getFile` e offset privado.
- Saída: upload multipart do MP4 por `sendVideo` e resumo por `sendMessage`.
- Limites aplicados: 20 MB por arquivo de entrada e 50 MB para retorno do MP4.
- Tokens e demais secrets são omitidos de logs e erros.

## Integrações externas nesta verificação

Nenhuma credencial estava disponível no ambiente local. Por isso, os itens
abaixo estão bloqueados por configuração e não foram declarados como sucesso:

- criação/leitura real dos dois buckets Cloudflare R2;
- validação real dos canais TikTok, X e Threads no Buffer;
- publicação real nas três redes;
- recebimento e envio real pelo bot do Telegram;
- piloto com um produto comercial real.

Também não foi fornecido um pacote real de produto neste ciclo. Assim, nenhum
post comercial foi criado.

## Secrets necessários

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

## Operação diária

1. Enviar ao bot uma foto ou álbum para cada produto, com nome, preço,
   benefícios factuais, link afiliado, CTA e legenda.
2. Executar no GitHub Actions o workflow
   `Affiliate Factory - manual intake`.
3. O padrão do workflow é produção com `publish=true`; após o quality gate,
   não existe aprovação editorial.
4. Receber o MP4 e o resumo multicanal no Telegram.
5. Se surgir `needs_reconciliation`, conferir o Buffer antes de qualquer nova
   tentativa.

O próximo passo externo é cadastrar os secrets, enviar um único produto real e
executar um piloto controlado. Somente depois do recibo Buffer, URL pública R2 e
confirmação Telegram esse piloto poderá ser reportado como publicação real.
