import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compareOilPriceSnapshots,
  summarizeMovements,
} from '../services/oilPriceComparisonService.js';

test('classifies increased, decreased, and unchanged oil prices', () => {
  const movements = compareOilPriceSnapshots(
    snapshotSet('2026-09-07', [
      ['92', '92無鉛汽油', 29.3],
      ['95', '95無鉛汽油', 30.4],
      ['98', '98無鉛汽油', 32.6],
    ]),
    snapshotSet('2026-08-31', [
      ['92', '92無鉛汽油', 29.1],
      ['95', '95無鉛汽油', 30.6],
      ['98', '98無鉛汽油', 32.6],
    ]),
  );

  assert.deepEqual(
    movements.map((movement) => [movement.productCode, movement.difference, movement.direction]),
    [
      ['92', 0.2, 'increased'],
      ['95', -0.2, 'decreased'],
      ['98', 0, 'unchanged'],
    ],
  );
  assert.equal(summarizeMovements(movements), '92 ↑0.2, 95 ↓0.2, 98 不調整');
});

function snapshotSet(effectiveDate, rows) {
  return {
    effectiveDate,
    products: rows.map(([productCode, productName, price]) => ({
      productCode,
      productName,
      price,
    })),
  };
}
