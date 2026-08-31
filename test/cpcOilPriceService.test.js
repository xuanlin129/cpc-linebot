import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OilPriceDataError,
  normalizeCpcEffectiveDate,
  normalizeCpcOilPrices,
} from '../services/cpcOilPriceService.js';

const CPC_FIXTURE = [
  createCpcOil('92無鉛汽油', '29.1'),
  createCpcOil('95無鉛汽油', '30.6'),
  createCpcOil('98無鉛汽油', '32.6'),
  createCpcOil('超級柴油', '27.2'),
];

test('normalizes tracked CPC oil prices', () => {
  const snapshotSet = normalizeCpcOilPrices(CPC_FIXTURE);

  assert.equal(snapshotSet.effectiveDate, '2026-08-31');
  assert.equal(snapshotSet.products.length, 4);
  assert.equal(snapshotSet.products[0].productCode, '92');
  assert.equal(snapshotSet.products[0].price, 29.1);
  assert.equal('sourceHash' in snapshotSet, false);
  assert.equal('rawPayload' in snapshotSet.products[0], false);
});

test('rejects missing tracked products', () => {
  assert.throws(
    () => normalizeCpcOilPrices(CPC_FIXTURE.filter((item) => item.產品名稱 !== '超級柴油')),
    OilPriceDataError,
  );
});

test('normalizes ROC effective date to ISO date', () => {
  assert.equal(normalizeCpcEffectiveDate(1150831), '2026-08-31');
});

function createCpcOil(name, price) {
  return {
    產品名稱: name,
    參考牌價_金額: price,
    牌價生效日期: 1150831,
  };
}
