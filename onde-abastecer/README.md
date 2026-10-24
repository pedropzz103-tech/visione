# Onde Abastecer ⛽🗺️

MVP de um comparador de preços de combustíveis no mapa, com foco em preço real para o motorista: preço do litro, distância/desvio, combustível, atualização e descontos.

## Países-alvo do lançamento

ES · FR · DE · AT · IT · PT · GR · SI · GB

A arquitetura usa um adaptador por país. Isso permite normalizar fontes oficiais diferentes para um único contrato de dados sem acoplar o app mobile aos formatos de cada governo.

### Estado das integrações

- **ES · Espanha — LIVE**: serviço REST oficial de preços de carburantes.
- **FR · França — LIVE**: feed instantâneo oficial Open Data, ZIP/XML, atualização inferior a 10 minutos.
- **IT · Itália — LIVE**: MIMIT Open Data, cadastro de postos + preços oficiais diários em CSV.
- **DE · Alemanha — aprovação necessária**: integração preparada para MTS-K.
- **AT · Áustria — planejado**: Spritpreisrechner / E-Control.
- **PT · Portugal — revisão de licença**: não monetizar a fonte até validar as condições de reutilização.
- **GR · Grécia — planejado**: observatório oficial.
- **SI · Eslovênia — planejado**: Goriva.si.
- **GB · Reino Unido — planejado**: Fuel Finder.

## Estrutura

```
onde-abastecer/
  mobile/   Expo + React Native + TypeScript
  api/      Cloudflare Worker + TypeScript
```

## MVP

- mapa com marcadores de preço;
- escala verde → amarelo → vermelho calculada dentro da região consultada;
- filtro por Gasolina 95, Gasolina 98, Diesel, Diesel Premium e GLP;
- localização atual do usuário;
- detecção automática de país via localização;
- seletor manual dos nove países de lançamento;
- detalhes do posto;
- botão de navegação;
- API normalizada por país;
- fonte e timestamp do preço;
- base para cálculo de economia real por desvio.

## Mobile

```bash
cd mobile
npm install
npx expo start
```

Por padrão, se `EXPO_PUBLIC_API_URL` não estiver definido, o app entra em modo demo local.

## API

```bash
cd api
npm install
npm run dev
```

Endpoints:

- `GET /health`
- `GET /v1/countries`
- `GET /v1/stations?country=ES&lat=42.2406&lng=-8.7207&radiusKm=25&fuel=gasoline95`
- `GET /v1/stations?country=FR&lat=48.8566&lng=2.3522&radiusKm=20&fuel=diesel`
- `GET /v1/stations?country=IT&lat=45.4642&lng=9.1900&radiusKm=20&fuel=gasoline95`

## Regra de cor

As cores são relativas aos preços retornados na busca atual e distribuídas em cinco faixas, de muito barato a muito caro.

## CI / Deploy

O workflow `.github/workflows/onde-abastecer-api.yml`:

1. instala dependências;
2. executa `tsc --noEmit`;
3. publica o Worker se os secrets `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` estiverem disponíveis.

## Próximas etapas

1. Fuel Finder do Reino Unido.
2. Fluxo MTS-K da Alemanha.
3. Áustria, Grécia e Eslovênia.
4. Fechar licenciamento de Portugal.
5. Adicionar rota e custo real do desvio.
6. Histórico, alertas de preço e descontos.
