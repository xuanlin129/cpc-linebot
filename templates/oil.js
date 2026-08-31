import { TRACKED_OIL_PRODUCTS } from '../config/oilProducts.js';
import { formatEffectiveDate } from '../services/cpcOilPriceService.js';
import { formatSignedDifference } from '../services/oilPriceComparisonService.js';

const BRAND_RED = '#C62027';
const MUTED_TEXT = '#888888';

export function createCurrentOilPriceMessage(snapshotSet) {
  return createOilFlexMessage({
    title: '今日油價',
    effectiveDate: snapshotSet.effectiveDate,
    rows: snapshotSet.products.map((product) =>
      createCurrentOilPriceRow(getProductConfig(product.productCode), product.price),
    ),
  });
}

export function createWeeklyOilMovementMessage(effectiveDate, movements) {
  return createOilFlexMessage({
    title: '本週油價',
    effectiveDate,
    rows: movements.map((movement) =>
      createWeeklyOilMovementRow(getProductConfig(movement.productCode), movement),
    ),
  });
}

export default createCurrentOilPriceMessage;

function createOilFlexMessage({ title, effectiveDate, rows }) {
  return {
    type: 'flex',
    altText: title,
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [createHeader(title), ...rows],
      },
      footer: {
        type: 'box',
        layout: 'horizontal',
        contents: [
          {
            type: 'text',
            text: '牌價生效日期：',
            size: 'xs',
            flex: 0,
          },
          {
            type: 'text',
            text: formatEffectiveDate(effectiveDate),
            flex: 0,
            size: 'xs',
          },
        ],
        justifyContent: 'center',
        spacing: 'sm',
      },
    },
  };
}

function createHeader(title) {
  return {
    type: 'box',
    layout: 'horizontal',
    contents: [
      {
        type: 'text',
        text: title,
        size: 'xxl',
        weight: 'bold',
        color: BRAND_RED,
      },
      {
        type: 'text',
        text: '（單位：元／公升）',
        size: 'xs',
        flex: 0,
      },
    ],
    alignItems: 'center',
  };
}

function createCurrentOilPriceRow(oilConfig, price) {
  return createOilRow(oilConfig, [
    {
      type: 'text',
      text: price.toFixed(1),
      size: 'xxl',
      weight: 'bold',
      color: BRAND_RED,
      flex: 0,
      align: 'end',
    },
    {
      type: 'text',
      text: '元',
      color: MUTED_TEXT,
      align: 'end',
      flex: 0,
      margin: 'md',
    },
  ]);
}

function createWeeklyOilMovementRow(oilConfig, movement) {
  const differenceText = formatSignedDifference(movement.difference);
  const color = getMovementColor(movement.direction);

  return createOilRow(oilConfig, [
    {
      type: 'text',
      text: movement.currentPrice.toFixed(1),
      size: 'xl',
      weight: 'bold',
      color: BRAND_RED,
      flex: 0,
      align: 'end',
    },
    {
      type: 'text',
      text: differenceText,
      color,
      align: 'end',
      flex: 0,
      margin: 'md',
      weight: 'bold',
    },
  ]);
}

function createOilRow(oilConfig, priceContents) {
  return {
    type: 'box',
    layout: 'horizontal',
    contents: [
      {
        type: 'box',
        layout: 'horizontal',
        contents: [
          {
            type: 'text',
            text: oilConfig.label,
            size: oilConfig.size,
            weight: 'bold',
            flex: 0,
          },
          ...(oilConfig.subtitle
            ? [
                {
                  type: 'text',
                  text: oilConfig.subtitle,
                  size: 'xs',
                  color: MUTED_TEXT,
                  flex: 0,
                  wrap: true,
                  margin: 'sm',
                },
              ]
            : []),
        ],
        flex: 0,
        alignItems: 'center',
      },
      {
        type: 'box',
        layout: 'horizontal',
        contents: priceContents,
        alignItems: 'center',
        flex: 0,
      },
    ],
    justifyContent: 'space-between',
    paddingStart: '10%',
    paddingEnd: '10%',
    margin: 'xl',
  };
}

function getProductConfig(productCode) {
  return TRACKED_OIL_PRODUCTS.find((product) => product.code === productCode);
}

function getMovementColor(direction) {
  if (direction === 'increased') {
    return '#D32F2F';
  }

  if (direction === 'decreased') {
    return '#00796B';
  }

  return MUTED_TEXT;
}
