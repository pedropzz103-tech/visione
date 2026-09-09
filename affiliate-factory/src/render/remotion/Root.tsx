import {Composition} from 'remotion';
import type {ChannelCreativeVariant} from '../../contracts/index.js';
import {
  CommercialVertical,
  type CommercialVerticalProps
} from './CommercialVertical.js';

const defaultVariant: ChannelCreativeVariant = {
  schemaVersion: '1.0.0',
  channel: 'tiktok',
  productId: 'fixture',
  headline: 'DEMONSTRACAO VISUAL',
  productName: 'Produto demonstrativo - nao publicar',
  priceText: 'R$ 0,00',
  benefits: ['Fixture interna'],
  assets: [{
    id: 'product-card',
    kind: 'image',
    file: 'assets/product-card.svg',
    provenance: {
      sourceType: 'repository-created',
      source: 'fixture'
    }
  }],
  cta: 'NAO PUBLICAR',
  caption: 'TESTE INTERNO #publicidade',
  affiliateUrl: 'https://s.shopee.com.br/fixture',
  branding: {
    label: 'Affiliate Factory',
    primaryColor: '#FF5A36',
    backgroundColor: '#0D0D12',
    textColor: '#FFFFFF'
  },
  width: 1080,
  height: 1920,
  fps: 30,
  durationSeconds: 12,
  safeZones: {top: 180, right: 150, bottom: 300, left: 90},
  sections: [
    {kind: 'hook', startFrame: 0, endFrame: 61, text: 'DEMONSTRACAO VISUAL'},
    {kind: 'product', startFrame: 61, endFrame: 144, text: 'Produto demonstrativo', assetId: 'product-card'},
    {kind: 'benefits', startFrame: 144, endFrame: 227, text: 'Fixture interna'},
    {kind: 'price', startFrame: 227, endFrame: 299, text: 'R$ 0,00'},
    {kind: 'cta', startFrame: 299, endFrame: 360, text: 'NAO PUBLICAR'}
  ]
};

export const RemotionRoot = (): React.JSX.Element => (
  <Composition
    id="commercial-vertical"
    component={CommercialVertical}
    durationInFrames={360}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{variant: defaultVariant}}
    calculateMetadata={({props}) => ({
      durationInFrames: props.variant.durationSeconds * props.variant.fps,
      fps: props.variant.fps,
      width: props.variant.width,
      height: props.variant.height
    })}
  />
);
