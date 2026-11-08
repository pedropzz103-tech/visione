# APK de teste — 2026-11-08

Objetivo autorizado: gerar e entregar APK Android instalável, sem EAS pago, publicação ou deploy de produção.

- Manter Expo/React Native e o app existente. Gerar projeto Android com Expo prebuild, Java 21, SDK 36 e Gradle; APK com JS/Hermes embutido, assinado somente com chave de teste, sem depender de Metro.
- Mapa Android: Leaflet/OSM dentro de WebView nativa, com código Leaflet empacotado, atribuição visível e ponte validada. Evita exigir chave/billing do Google. Mapa iOS e web existentes preservados.
- API: permitir configurar URL no aparelho e salvá-la localmente; validar HTTPS ou HTTP em rede privada, sem credenciais embutidas. Nenhum backend público foi autorizado/publicado. Isolar o cache por servidor e manter exclusão/cancelamento existentes.
- Verificar testes, tipos e bundles; compilar arm64-v8a (Android 7+), inspecionar manifesto/assinatura/JS e entregar APK + checksum. Não alegar teste físico que não foi realizado.
- Registrar instruções reproduzíveis e mudanças no PR #26. Artefato binário/chave local fora do Git.
