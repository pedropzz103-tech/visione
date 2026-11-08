# APK Android de teste — 08/11/2026

APK gerado localmente do app Expo/React Native existente, em modo release com bundle Hermes embutido e assinatura de teste. Não usa Expo Go/Metro para abrir, não foi publicado em loja e não houve deploy de backend.

## Arquivo verificado

- Arquivo: `onde-abastecer-preview-arm64.apk` — 28.620.988 bytes (~27,3 MiB).
- Identificador: `one.visione.ondeabastecer.preview` (separado de produção).
- Versão: 0.1.0 / código 1; Android 7.0+ (API 24), ARM64 (`arm64-v8a`), target SDK 36.
- SHA-256: `1181b8da831307d6340805419ba5a15a2a53a81a03d31f79b51bf09e9b92094d`.
- Assinatura APK v2 validada pelo `apksigner`; certificado Android Debug RSA 2048, somente para testes. Sem keystore de produção ou taxa de distribuição.
- `zipalign -c -P 16 4`: aprovado. Manifesto confirma nome de teste, backup desativado e HTTP habilitado apenas no perfil preview para uso em rede privada.
- Bundle nativo: `assets/index.android.bundle` (1.611.116 bytes). Inspeção confirmou o ajuste de zoom revisado e ausência dos postos sintéticos usados nos testes.

O arquivo e seu `.sha256` ficam em `/workspace/shared/downloads/` neste ambiente; binários e chaves não entram no Git. Compatibilidade em aparelho físico ainda não foi testada. Esta validação de pacote/assinatura não é uma aprovação para produção.

## Instalação e configuração

1. Transfira o APK ao Android ARM64 e abra o arquivo. Se solicitado, permita a instalação de aplicativos dessa origem para esta instalação de teste.
2. Abra **Onde Abastecer (teste)**. O mapa Android usa Leaflet/OSM com atribuição visível, código empacotado e tiles HTTPS; não exige chave do Google. É necessária conexão para carregar tiles e preços.
3. Em **Servidor da API**, informe o endereço do backend e toque em **Salvar servidor**. Nenhuma API pública foi publicada nesta entrega. HTTPS é aceito; HTTP é limitado a endereços de rede privada/local, sem credenciais ou parâmetros na URL.
4. Para testar com o servidor local, computador e celular precisam estar na mesma rede. No computador, a partir de `onde-abastecer`, execute `HOST=0.0.0.0 PORT=8788 npm run dev:api` e configure no aparelho `http://IP-DO-COMPUTADOR:8788`. Em ambiente que exige proxy, Node 24 pode precisar de `NODE_USE_ENV_PROXY=1`.
5. Selecione ES, FR ou PT, busque uma área e aguarde a fonte. `127.0.0.1` no telefone aponta para o próprio telefone, não para o computador. Não há preços demo se o servidor estiver ausente.

Localização continua dependente da permissão do Android. Coordenadas manuais permanecem disponíveis. A configuração do servidor é local, o cache é isolado por servidor e a exclusão de dados remove também essa configuração.

## Reproduzir o build

Requisitos: Node 22.13+/24, JDK 21 completo com `javac`, Android SDK 36, Build Tools 36.0.0 e 35.0.0, NDK 27.1.12297006 e CMake 3.22.1. Gradle vem do wrapper gerado pelo Expo. Tenha espaço para SDK/caches e compilação; este ambiente de 7,9 GB exigiu limpeza de caches e uso de armazenamento temporário em memória. As primeiras tentativas detectaram ausência do launcher javac e falta de espaço; esses erros foram corrigidos antes do build bem-sucedido.

```bash
cd onde-abastecer
npm ci
npm run install:apps
cd mobile
export JAVA_HOME=/caminho/do/jdk-21
export ANDROID_HOME=/caminho/do/android-sdk
npm run build:apk
```

O script prepara o mapa local, executa `expo prebuild --platform android --no-install` com perfil preview e `:app:assembleRelease -PreactNativeArchitectures=arm64-v8a`. Copia o resultado para `onde-abastecer/artifacts/` e calcula o checksum; `ONDE_APK_OUTPUT_DIR` pode definir outro diretório. O projeto nativo gerado e os artefatos são ignorados no Git. A chave é a de teste gerada pelo template, nunca uma assinatura de publicação.

## Verificações desta alteração

- Build real Gradle: **BUILD SUCCESSFUL**, 390 tarefas, 6m33s na tentativa final com dependências previamente baixadas.
- **45/45** testes unitários/de integração; **12/12** cenários Chromium, incluindo documento do mapa Android, seleção de marcador, preservação do zoom e configuração da API persistida.
- Lint/typecheck aprovados; Expo Doctor **21/21**; auditoria de dependências mobile sem vulnerabilidades conhecidas.
- Revisão independente encontrou o recuo de zoom ao pesquisar a área; reproduzido com teste que falhou e depois passou. O teste Chromium verifica a lógica do mapa, não o WebView de um aparelho físico.
- Mapas iOS/web existentes preservados. Android usa WebView nativa para o mapa; o restante continua React Native. Leaflet e sua licença são empacotados durante a instalação das dependências, sem scripts remotos.

Não houve contratação de EAS, publicação em Google Play ou hospedagem paga. Validação física, orçamento do Worker e publicação do backend continuam como etapas separadas.
