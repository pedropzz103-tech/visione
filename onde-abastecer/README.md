# Onde Abastecer ⛽🗺️

MVP de um comparador de preços de combustíveis no mapa, com foco em preço real para o motorista: preço do litro, distância/desvio, combustível, atualização e descontos.

## Países-alvo do lançamento

ES · FR · DE · AT · IT · PT · GR · SI · GB

A arquitetura usa um adaptador por país. Isso permite normalizar fontes oficiais diferentes para um único contrato de dados sem acoplar o app mobile aos formatos de cada governo.

### Estado inicial das integrações

- **ES**: adaptador implementado usando o serviço REST oficial de preços de carburantes.
- **FR, DE, AT, IT, PT, GR, SI, GB**: registrados no backend e prontos para receber seus adaptadores.
- **PT**: manter revisão específica de licenciamento antes de monetizar dados da DGEG.

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

## Regra de cor

As cores são relativas aos preços retornados na busca atual e distribuídas em cinco faixas, de muito barato a muito caro.

## Próximas etapas

1. Integrar França e Itália.
2. Integrar Reino Unido/Fuel Finder.
3. Preparar autorização alemã MTS-K.
4. Validar Áustria, Grécia e Eslovênia.
5. Fechar licenciamento de Portugal.
6. Adicionar rota e custo real do desvio.
7. Histórico, alertas de preço e descontos.
