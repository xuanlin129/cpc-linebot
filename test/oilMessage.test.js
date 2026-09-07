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
  assert.equal(firstMessage.contents.size, undefined);
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

  assert.equal(message.altText, '下週油價公告');
  assert.equal(message.contents.size, 'giga');
  assert.equal(message.contents.header.backgroundColor, '#FFD54F');
  assert.equal(message.contents.header.contents[0].text, '下週油價公告');
  assert.equal(message.contents.footer.contents[1].text, '2026/09/07');
  assert.equal(message.contents.body.contents.length, 4);
  assert.equal(message.contents.body.contents[0].contents[0].contents[0].size, 'xxl');
  assert.equal(getWeeklyPriceText(message, 0).text, '29.3');
  assert.equal(getWeeklyPriceText(message, 0).size, 'xxl');
  assert.equal(getWeeklyPriceText(message, 0).color, '#D32F2F');
  assert.equal(getWeeklyUnitText(message, 0).text, '元');
  assert.equal(getWeeklyUnitText(message, 0).color, '#888888');
  assert.equal(getWeeklyUnitText(message, 0).margin, 'md');
  assert.equal(getWeeklyPriceBox(message, 0).width, '180px');
  assert.equal(message.contents.body.contents[0].paddingStart, 'xxl');
  assert.equal(message.contents.body.contents[0].paddingEnd, 'xxl');
  assert.equal(getWeeklyPriceText(message, 0).flex, 1);
  assert.equal(getWeeklyDifferenceBox(message, 0).width, '54px');
  assert.equal(getWeeklyDifferenceText(message, 0).text, '↑0.2');
  assert.equal(getWeeklyDifferenceText(message, 0).size, 'md');
  assert.equal(getWeeklyPriceText(message, 1).color, '#00796B');
  assert.equal(getWeeklyDifferenceText(message, 1).text, '↓0.2');
  assert.equal(getWeeklyPriceText(message, 2).color, '#888888');
  assert.equal(getWeeklyDifferenceText(message, 2).text, '不調整');
  assert.equal(getWeeklyDifferenceText(message, 2).size, 'sm');
  assert.equal(message.contents.body.contents[3].contents[0].contents[0].size, 'xl');
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

function getWeeklyPriceBox(message, rowIndex) {
  return message.contents.body.contents[rowIndex].contents[1];
}

function getWeeklyPriceText(message, rowIndex) {
  return getWeeklyPriceBox(message, rowIndex).contents[0];
}

function getWeeklyUnitText(message, rowIndex) {
  return getWeeklyPriceBox(message, rowIndex).contents[1];
}

function getWeeklyDifferenceBox(message, rowIndex) {
  return getWeeklyPriceBox(message, rowIndex).contents[2];
}

function getWeeklyDifferenceText(message, rowIndex) {
  return getWeeklyDifferenceBox(message, rowIndex).contents[0];
}
