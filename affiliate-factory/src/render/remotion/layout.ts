import type {
  ChannelCreativeVariant,
  LayoutEvidence
} from '../../contracts/index.js';

const boxes: LayoutEvidence['textBoxes'] = [
  {
    id: 'headline',
    x: 100,
    y: 200,
    width: 820,
    height: 190,
    fontSize: 76,
    lineHeight: 82,
    maxLines: 2,
    measuredCharacterLimit: 70
  },
  {
    id: 'productName',
    x: 110,
    y: 1020,
    width: 800,
    height: 160,
    fontSize: 52,
    lineHeight: 60,
    maxLines: 2,
    measuredCharacterLimit: 120
  },
  {
    id: 'price',
    x: 110,
    y: 1190,
    width: 800,
    height: 130,
    fontSize: 88,
    lineHeight: 96,
    maxLines: 1,
    measuredCharacterLimit: 24
  },
  {
    id: 'benefits',
    x: 110,
    y: 1320,
    width: 800,
    height: 150,
    fontSize: 36,
    lineHeight: 44,
    maxLines: 3,
    measuredCharacterLimit: 180
  },
  {
    id: 'cta',
    x: 110,
    y: 1480,
    width: 800,
    height: 130,
    fontSize: 38,
    lineHeight: 46,
    maxLines: 2,
    measuredCharacterLimit: 100
  }
];

export function calculateLayout(
  variant: ChannelCreativeVariant
): LayoutEvidence {
  const values: Record<string, string> = {
    headline: variant.headline,
    productName: variant.productName,
    price: variant.priceText,
    benefits: variant.benefits.join(' • '),
    cta: variant.cta
  };
  const overflows = boxes
    .filter((box) => (values[box.id]?.length ?? 0) > box.measuredCharacterLimit)
    .map((box) => box.id);

  return {
    safeZone: {
      x: variant.safeZones.left,
      y: variant.safeZones.top,
      width: variant.width - variant.safeZones.left - variant.safeZones.right,
      height: variant.height - variant.safeZones.top - variant.safeZones.bottom
    },
    textBoxes: structuredClone(boxes),
    overflows
  };
}
