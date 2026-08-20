# Affiliate Factory

Pipeline isolado para transformar pacotes manuais de produtos afiliados Shopee
em vídeos verticais e publicar por Buffer no TikTok, X e Threads. O projeto não
raspa páginas da Shopee, não usa a API da Shopee e não depende da API da OpenAI.

## Rotina diária

Envie ao bot do Telegram uma foto ou álbum por produto. A legenda segue este
modelo:

```text
/produto
nome: Nome exato fornecido pelo operador
preco: 129,90
preco_anterior: 159,90
beneficios: Benefício factual 1 | Benefício factual 2
link: https://s.shopee.com.br/seu-link-de-afiliado
headline: Texto opcional de até 70 caracteres
cta: Confira pelo link de afiliado
legenda: #publicidade Descrição factual fornecida pelo operador
```

Depois de enviar até aproximadamente oito produtos, abra no GitHub Actions o
workflow **Affiliate Factory - manual intake** e clique em **Run workflow**. A
configuração padrão é produção com publicação automática, sem aprovação
editorial. Cada entrada válida gera o MP4 do TikTok, posts com imagens para X e
Threads, recibos idempotentes e o retorno do MP4 pelo Telegram.

Enviar apenas o link não é suficiente. O operador fornece também nome, preço,
benefícios factuais, CTA, legenda e as imagens que tem direito de usar.

## Desenvolvimento local

```powershell
Set-Location affiliate-factory
npm.cmd ci
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run dry-run
```

O fixture local é marcado como `purpose: fixture`, não contém alegações
comerciais e não pode ser publicado. Consulte [docs/operations.md](docs/operations.md)
para configuração, segurança, recuperação e operação completa.
