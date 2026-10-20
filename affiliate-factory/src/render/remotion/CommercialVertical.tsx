import type {CSSProperties} from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig
} from 'remotion';
import type {ChannelCreativeVariant} from '../../contracts/index.js';

export type CommercialVerticalProps = {
  variant: ChannelCreativeVariant;
};

const fill: CSSProperties = {
  width: '100%',
  height: '100%'
};

function opacityFor(
  frame: number,
  startFrame: number,
  endFrame: number
): number {
  return interpolate(
    frame,
    [startFrame - 8, startFrame + 12, endFrame - 10, endFrame + 2],
    [0, 1, 1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
  );
}

export const CommercialVertical = ({
  variant
}: CommercialVerticalProps): React.JSX.Element => {
  const frame = useCurrentFrame();
  const video = useVideoConfig();
  const firstAsset = variant.assets[0];
  if (firstAsset === undefined) {
    throw new Error('RENDER_ASSET_MISSING');
  }
  const entrance = spring({
    frame,
    fps: video.fps,
    config: {damping: 18, stiffness: 90, mass: 0.8}
  });
  const imageScale = interpolate(
    frame,
    [0, video.durationInFrames],
    [1.03, 1.15],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
  );
  const rotation = interpolate(
    frame,
    [0, video.durationInFrames],
    [-2, 2],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
  );
  const sectionByKind = new Map(
    variant.sections.map((section) => [section.kind, section])
  );
  const sectionOpacity = (kind: (typeof variant.sections)[number]['kind']) => {
    const section = sectionByKind.get(kind);
    return section === undefined
      ? 0
      : opacityFor(frame, section.startFrame, section.endFrame);
  };

  return (
    <AbsoluteFill
      style={{
        ...fill,
        overflow: 'hidden',
        backgroundColor: variant.branding.backgroundColor,
        color: variant.branding.textColor,
        fontFamily: 'Arial, Helvetica, sans-serif'
      }}
    >
      <AbsoluteFill
        style={{
          background: [
            'radial-gradient(circle at 82% 14%, ' + variant.branding.primaryColor + '66 0, transparent 34%)',
            'linear-gradient(155deg, #171722 0%, ' + variant.branding.backgroundColor + ' 58%, #050507 100%)'
          ].join(','),
          transform: 'scale(' + (1 + entrance * 0.025) + ')'
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 100,
          top: 116,
          padding: '14px 24px',
          border: '2px solid rgba(255,255,255,0.24)',
          borderRadius: 999,
          background: 'rgba(0,0,0,0.22)',
          backdropFilter: 'blur(16px)',
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: 'uppercase'
        }}
      >
        {variant.branding.label}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 100,
          top: 200,
          width: 820,
          minHeight: 190,
          display: 'flex',
          alignItems: 'flex-start',
          fontSize: 76,
          lineHeight: '82px',
          fontWeight: 900,
          letterSpacing: -2.5,
          textTransform: 'uppercase',
          opacity: sectionOpacity('hook'),
          transform: 'translateY(' + (24 - 24 * entrance) + 'px)'
        }}
      >
        {variant.headline}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 105,
          top: 410,
          width: 870,
          height: 650,
          borderRadius: 54,
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.08)',
          border: '2px solid rgba(255,255,255,0.16)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.44)',
          transform: 'translateY(' + (60 - entrance * 60) + 'px) rotate(' + rotation + 'deg)'
        }}
      >
        <Img
          src={staticFile(firstAsset.file.replaceAll('\\', '/'))}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scale(' + imageScale + ')'
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, transparent 48%, rgba(0,0,0,0.76) 100%)'
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 110,
          top: 1020,
          width: 800,
          height: 160,
          display: 'flex',
          alignItems: 'flex-end',
          fontSize: 52,
          lineHeight: '60px',
          fontWeight: 800,
          opacity: sectionOpacity('product')
        }}
      >
        {variant.productName}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 110,
          top: 1190,
          width: 800,
          height: 130,
          display: 'flex',
          alignItems: 'center',
          gap: 26,
          opacity: sectionOpacity('price')
        }}
      >
        <span
          style={{
            fontSize: 88,
            lineHeight: '96px',
            fontWeight: 900,
            color: variant.branding.primaryColor
          }}
        >
          {variant.priceText}
        </span>
        {variant.previousPriceText === undefined ? null : (
          <span
            style={{
              fontSize: 34,
              opacity: 0.6,
              textDecoration: 'line-through'
            }}
          >
            {variant.previousPriceText}
          </span>
        )}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 110,
          top: 1320,
          width: 800,
          height: 150,
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          opacity: sectionOpacity('benefits')
        }}
      >
        {variant.benefits.map((benefit) => (
          <div
            key={benefit}
            style={{
              padding: '14px 20px',
              borderRadius: 18,
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.18)',
              fontSize: 30,
              lineHeight: '38px',
              fontWeight: 700
            }}
          >
            {benefit}
          </div>
        ))}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 110,
          top: 1480,
          width: 800,
          minHeight: 130,
          boxSizing: 'border-box',
          padding: '26px 34px',
          borderRadius: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          background: variant.branding.primaryColor,
          color: '#FFFFFF',
          boxShadow: '0 26px 60px ' + variant.branding.primaryColor + '55',
          fontSize: 38,
          lineHeight: '46px',
          fontWeight: 900,
          opacity: sectionOpacity('cta'),
          transform: 'scale(' + (0.94 + entrance * 0.06) + ')'
        }}
      >
        {variant.cta}
      </div>
    </AbsoluteFill>
  );
};
