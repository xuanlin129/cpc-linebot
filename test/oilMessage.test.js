import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createCurrentOilPriceMessage,
  createWeeklyOilMovementMessage,
} from '../templates/oil.js';

test('creates a fresh current oil price message for each call', () => {
  const snapshotSet = {
    effectiveDate: '2026-08-31',
    products: [
      { productCode: '92', productName: '92無鉛汽油', price: 29.1 },
      { productCode: '95', productName: '95無鉛汽油', price: 30.6 },
      { productCode: '98', productName: '98無鉛汽油', price: 32.6 },
      { productCode: 'diesel', productName: '超級柴油', price: 27.2 },
    ],
  };

  const firstMessage = createCurrentOilPriceMessage(snapshotSet);
  const secondMessage = createCurrentOilPriceMessage(snapshotSet);

  assert.notEqual(firstMessage, secondMessage);
  assert.equal(firstMessage.contents.body.contents.length, 5);
  assert.equal(secondMessage.contents.body.contents.length, 5);
});

test('weekly movement message includes prices and differences', () => {
  const message = createWeeklyOilMovementMessage('2026-09-07', [
    createMovement('92', '92無鉛汽油', 29.3, 29.1, 0.2, 'increased'),
    createMovement('95', '95無鉛汽油', 30.4, 30.6, -0.2, 'decreased'),
    createMovement('98', '98無鉛汽油', 32.6, 32.6, 0, 'unchanged'),
    createMovement('diesel', '超級柴油', 27.2, 27.2, 0, 'unchanged'),
  ]);

  assert.equal(message.altText, '本週油價');
  assert.equal(message.contents.footer.contents[1].text, '2026/09/07');
  assert.equal(message.contents.body.contents.length, 5);
});

function createMovement(productCode, productName, currentPrice, previousPrice, difference, direction) {
  return {
    productCode,
    productName,
    currentPrice,
    previousPrice,
    difference,
    direction,
  };
}
