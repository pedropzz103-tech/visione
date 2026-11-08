# Onde Abastecer — entrega para revisão

Data: 07/11/2026. [PR #26, em rascunho](https://github.com/pedropzz103-tech/visione/pull/26). Branch: `codex/onde-abastecer-reliability`. O objetivo global continua em execução; esta entrega corrige o MVP e implementa uma base funcional verificável. Nenhuma publicação em produção, merge ou contratação foi realizada.

## O que existia e foi aproveitado

O [PR #23](https://github.com/pedropzz103-tech/visione/pull/23) estava aberto e em rascunho: Expo/React Native/TypeScript, react-native-maps, localização/navegação, adaptadores ES/FR/IT e Worker/Actions. Seus 34 commits foram preservados mediante merge numa branch nova baseada no main atual. Os outros sites/produtos da VISIONE permaneceram intactos. AGENTS.md foi criado na raiz.

A auditoria encontrou longitudes negativas descartadas, coordenadas ausentes aceitas como zero, preços demo por falta de configuração, E10 misturado com SP95, codificação francesa incorreta e ausência de testes/lista/busca/preferências. Evidências completas em [AUDIT.md](AUDIT.md).

## Implementado

- Mapa nativo e mapa web com postos de fonte oficial, cores por preço relativo e clusters; lista e busca por coordenadas; endereço/cidade pelo geocodificador nativo; GPS mediante ação e permissão.
- Filtros por combustível, raio, marca, preço, favoritos e dados confirmados de automação 24h/serviços quando fornecidos; ordenação por preço/proximidade em linha reta.
- Detalhes com moeda/unidade, endereço, origem, data original/normalizada e idade. Navegação e compartilhamento por recurso do sistema.
- Economia por volume ou tanque/percentual restante, consumo e distância rodoviária adicional informada. Ida e volta e parada ao longo da rota têm semânticas diferentes. Valores líquidos insuficientes, offline, antigos ou incompatíveis são recusados. Não há FX inventado nem rota inferida de distância reta.
- Favoritos/preferências locais e último cache exato, com aviso offline; exclusão protegida contra respostas/gravações pendentes. Interface PT/EN e controles acessíveis.
- Normalização compartilhada, erros explícitos, timeout/retry, cache de fonte, deduplicação e rate limit aproximado do Worker. Sem telemetria própria.
- CI com instalação travada, lint, tipos, testes, auditoria e bundles; deploy somente por ação manual explícita. Módulos futuros registrados como planejados, sem dados publicados.

## Cobertura real

| País | Fonte | Resultado observado após as correções |
|---|---|---|
| ES | REST oficial / Geoportal de gasolineras | 150 postos num raio de 30 km de Vigo, 11:20:08 UTC; carga fria de 31 s. A data é de publicação do feed, não da última alteração individual do preço. |
| FR | Feed governamental Prix des carburants | 395 postos com diesel num raio de 20 km de Paris, 11:20:13 UTC. E10 distinto de SP95; preços individuais podem ser antigos. |
| PT | DGEG | 387 postos num raio de 30 km de Lisboa, 11:20:15 UTC. Reutilização, IDs de combustível e parâmetros de exportação verificados; atribuição e data mantidas. |

Esses números são consultas específicas em 07/11/2026, não totais nacionais ou garantia de disponibilidade futura. IT está desabilitado após HTTP 503 e licença atual não verificada. DE/AT/GB/GR/SI não têm cobertura implementada. [COUNTRY_COVERAGE.md](COUNTRY_COVERAGE.md) registra fontes, condições e estados reais.

## Testes e limites

- **42/42** testes unitários/integração com fixtures: aprovados.
- **9/9** cenários Chromium: aprovados, incluindo economia, filtros, favoritos, busca manual, offline, GPS e concorrência/exclusão. A suíte usa fontes sintéticas identificadas e bloqueia tiles externos; o aplicativo normal não contém modo fixture/demo.
- Lint e typecheck API/mobile: aprovados.
- Expo Doctor: **21/21**; as falhas iniciais de conexão externa foram resolvidas com o proxy e permanecem registradas na auditoria.
- Worker dry bundle e exports JS/Hermes web/Android/iOS: aprovados. **Não equivalem a APK/AAB/IPA nem execução em aparelhos.**
- Auditoria completa de dependências dos três pacotes: zero vulnerabilidades conhecidas após correções transitivas. Varredura direcionada de segredos e `git diff --check`: sem achados.
- Fontes reais ES/FR/PT e app no navegador: verificados com os adaptadores reais/servidor Node de desenvolvimento. Nenhum erro de página no fluxo observado.
- **Falha explicitada:** o workerd local retornou 502 por resolução DNS neste ambiente com proxy. O fallback Node usa o mesmo handler; isso não comprova deploy do Worker.
- O [CI atual](https://github.com/pedropzz103-tech/visione/pull/26/checks) deve ser consultado no PR; os números acima descrevem a validação local registrada.

A revisão independente identificou cinco problemas importantes e dois de validação, corrigidos com regressões. Não houve segunda aprovação independente após as correções. O PR permanece disponível para revisão humana.

## Commits

[Todos os commits do PR](https://github.com/pedropzz103-tech/visione/pull/26/commits), incluindo:

- [c1a1e0e — auditoria e plano](https://github.com/pedropzz103-tech/visione/commit/c1a1e0e).
- [c7e6835 — fontes e motor de economia](https://github.com/pedropzz103-tech/visione/commit/c7e6835).
- [d07a8df — experiência mobile/cache](https://github.com/pedropzz103-tech/visione/commit/d07a8df).
- [4a03477 — validação de fontes e metadados](https://github.com/pedropzz103-tech/visione/commit/4a03477).
- [5e39b2b — concorrência, GPS e exclusão local](https://github.com/pedropzz103-tech/visione/commit/5e39b2b).

## Custo e próximas ações

Nenhum serviço pago, compra, assinatura, credencial paga ou OpenAI API foi usado/exigido. Não foi provisionada infraestrutura de produção. O funcionamento em escala precisa respeitar as cotas gratuitas vigentes dos provedores; não há promessa de tráfego ilimitado ou entrega de alertas em segundo plano. OSM exige atribuição e política de uso; não há cache offline de tiles. Contas/taxas de distribuição Android/iOS não fazem parte desta entrega gratuita.

Bloqueios reais para lançamento: testar aparelhos Android/iOS/configuração dos mapas, medir CPU/memória/tráfego no plano gratuito do Worker e revalidar termos/quotas antes de uso comercial. ES/FR podem exigir ingestão espacial agendada em vez de processamento nacional por carga fria. Busca de endereço web, rotas/ordenação por economia por posto, FX, histórico/alertas e países/categorias adicionais continuam no [ROADMAP.md](ROADMAP.md). Monetização permanece proposta, com resultados orgânicos separados de qualquer patrocínio futuro.

## Executar e testar

A partir da raiz do checkout:

```bash
cd onde-abastecer
npm ci
npm run install:apps
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Execução verificada neste ambiente com Node 24 e proxy, em dois terminais:

```bash
# Terminal 1, a partir da raiz do checkout:
cd onde-abastecer
NODE_USE_ENV_PROXY=1 npm run dev:api
```

```bash
# Terminal 2, a partir da raiz do checkout:
cd onde-abastecer/mobile
EXPO_PUBLIC_API_URL=http://127.0.0.1:8788 npm run web -- --port 8082
```

Abra `http://127.0.0.1:8082`. Em redes sem proxy, omita `NODE_USE_ENV_PROXY`. Para Android/iOS, URLs LAN/emulador, geocodificação nativa, Expo Doctor e o Worker padrão, siga o [README.md](README.md). O servidor Node é somente de desenvolvimento e não tem o binding de rate limit da Cloudflare.

## Atualização — APK de teste em 08/11/2026

Foi gerado e verificado um APK ARM64/Android 7+ de 28.620.988 bytes, com assinatura de teste e JavaScript/Hermes embutido. O mapa Android passou a usar Leaflet/OSM em WebView nativa sem chave Google; a URL do servidor pode ser configurada no próprio aparelho. Testes atualizados: 45 unitários/de integração e 12 cenários de navegador aprovados; Expo Doctor 21/21. Nenhum backend foi publicado e ainda falta teste em aparelho físico. Instruções, checksum e limites em [ANDROID_APK.md](docs/ANDROID_APK.md).
