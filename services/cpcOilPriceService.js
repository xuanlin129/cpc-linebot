import axios from 'axios';
import { TRACKED_OIL_PRODUCTS } from '../config/oilProducts.js';

export const CPC_OIL_PRICE_URL = 'https://vipmbr.cpc.com.tw/opendata/sixtypeoillistprice';

export class OilPriceDataError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OilPriceDataError';
  }
}

export async function fetchCurrentOilPrices(httpClient = axios) {
  const { data } = await httpClient.get(CPC_OIL_PRICE_URL);
  return normalizeCpcOilPrices(data);
}

export function normalizeCpcOilPrices(data, trackedProducts = TRACKED_OIL_PRODUCTS) {
  if (!Array.isArray(data)) {
    throw new OilPriceDataError('CPC oil price response must be an array');
  }

  const products = trackedProducts.map((config) => normalizeTrackedProduct(data, config));
  const effectiveDates = new Set(products.map((product) => product.effectiveDate));

  if (effectiveDates.size !== 1) {
    throw new OilPriceDataError('Tracked oil products have inconsistent effective dates');
  }

  const effectiveDate = products[0]?.effectiveDate;

  if (!effectiveDate) {
    throw new OilPriceDataError('No tracked oil products were normalized');
  }

  const snapshotProducts = products.map(({ effectiveDate: _effectiveDate, ...product }) => product);

  return {
    effectiveDate,
    products: snapshotProducts,
  };
}

export function getTrackedProductCodes(trackedProducts = TRACKED_OIL_PRODUCTS) {
  return trackedProducts.map((product) => product.code);
}

function normalizeTrackedProduct(data, config) {
  const sourceItem = data.find((item) => item?.產品名稱 === config.name);

  if (!sourceItem) {
    throw new OilPriceDataError(`Missing CPC oil product: ${config.name}`);
  }

  const price = Number(sourceItem.參考牌價_金額);

  if (!Number.isFinite(price)) {
    throw new OilPriceDataError(`Invalid CPC oil price for ${config.name}`);
  }

  return {
    effectiveDate: normalizeCpcEffectiveDate(sourceItem.牌價生效日期),
    productCode: config.code,
    productName: config.name,
    price,
  };
}

export function normalizeCpcEffectiveDate(date) {
  const rawDate = String(date ?? '').trim().padStart(7, '0');
  const day = rawDate.slice(-2);
  const month = rawDate.slice(-4, -2);
  const rocYear = rawDate.slice(0, -4);
  const adYear = Number.parseInt(rocYear, 10) + 1911;

  if (!Number.isInteger(adYear) || !isValidDatePart(month, 1, 12) || !isValidDatePart(day, 1, 31)) {
    throw new OilPriceDataError('Invalid CPC effective date');
  }

  return `${adYear}-${month}-${day}`;
}

export function formatEffectiveDate(effectiveDate) {
  return String(effectiveDate || '').replaceAll('-', '/');
}

function isValidDatePart(value, min, max) {
  const number = Number.parseInt(value, 10);
  return /^\d{2}$/.test(value) && number >= min && number <= max;
}
