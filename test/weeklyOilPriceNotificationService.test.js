import test from 'node:test';
import assert from 'node:assert/strict';
import { runWeeklyOilPriceNotification } from '../services/weeklyOilPriceNotificationService.js';

test('scheduled flow stores new snapshots and sends one notification', async () => {
  const repository = new InMemoryOilPriceRepository([
    snapshotSet('2026-08-31', [
      ['92', '92無鉛汽油', 29.1],
      ['95', '95無鉛汽油', 30.6],
      ['98', '98無鉛汽油', 32.6],
      ['diesel', '超級柴油', 27.2],
    ]),
  ]);
  const lineClient = createLineClient();
  const latestSnapshotSet = snapshotSet('2026-09-07', [
    ['92', '92無鉛汽油', 29.3],
    ['95', '95無鉛汽油', 30.8],
    ['98', '98無鉛汽油', 32.8],
    ['diesel', '超級柴油', 27.2],
  ]);

  const firstResult = await runWeeklyOilPriceNotification({
    fetchCurrentOilPrices: async () => latestSnapshotSet,
    oilPriceRepository: repository,
    lineClient,
    now: new Date('2026-09-06T04:10:00.000Z'),
  });
  const secondResult = await runWeeklyOilPriceNotification({
    fetchCurrentOilPrices: async () => latestSnapshotSet,
    oilPriceRepository: repository,
    lineClient,
    now: new Date('2026-09-06T04:11:00.000Z'),
  });

  assert.equal(firstResult.status, 'sent');
  assert.equal(secondResult.status, 'skipped');
  assert.equal(secondResult.reason, 'Notification already sent');
  assert.equal(lineClient.broadcasts.length, 1);
  assert.equal(repository.snapshotKeyCount('2026-09-07'), 4);
});

test('scheduled flow skips the first snapshot when no previous data exists', async () => {
  const repository = new InMemoryOilPriceRepository();
  const result = await runWeeklyOilPriceNotification({
    fetchCurrentOilPrices: async () =>
      snapshotSet('2026-08-31', [
        ['92', '92無鉛汽油', 29.1],
        ['95', '95無鉛汽油', 30.6],
        ['98', '98無鉛汽油', 32.6],
        ['diesel', '超級柴油', 27.2],
    ]),
    oilPriceRepository: repository,
    lineClient: createLineClient(),
  });

  assert.equal(result.status, 'skipped');
  assert.equal(result.reason, 'Previous snapshot unavailable');
  assert.equal(repository.runs.get('2026-08-31').status, 'skipped');
});

test('scheduled flow skips stale CPC data without sending', async () => {
  const repository = new InMemoryOilPriceRepository([
    snapshotSet('2026-08-31', [
      ['92', '92無鉛汽油', 29.1],
      ['95', '95無鉛汽油', 30.6],
      ['98', '98無鉛汽油', 32.6],
      ['diesel', '超級柴油', 27.2],
    ]),
  ]);
  const lineClient = createLineClient();

  const result = await runWeeklyOilPriceNotification({
    fetchCurrentOilPrices: async () =>
      snapshotSet('2026-08-31', [
        ['92', '92無鉛汽油', 29.1],
        ['95', '95無鉛汽油', 30.6],
        ['98', '98無鉛汽油', 32.6],
        ['diesel', '超級柴油', 27.2],
      ]),
    oilPriceRepository: repository,
    lineClient,
  });

  assert.equal(result.status, 'skipped');
  assert.equal(result.reason, 'CPC data has not updated yet');
  assert.equal(lineClient.broadcasts.length, 0);
});

test('scheduled flow records failed LINE delivery', async () => {
  const repository = createRepositoryWithPreviousSnapshot();

  const result = await runWeeklyOilPriceNotification({
    fetchCurrentOilPrices: async () =>
      snapshotSet('2026-09-07', [
        ['92', '92無鉛汽油', 29.3],
        ['95', '95無鉛汽油', 30.8],
        ['98', '98無鉛汽油', 32.8],
        ['diesel', '超級柴油', 27.2],
    ]),
    oilPriceRepository: repository,
    lineClient: createLineClient({ shouldFail: true }),
  });

  assert.equal(result.status, 'failed');
  assert.equal(result.reason, 'LINE failed');
  assert.equal(repository.runs.get('2026-09-07').status, 'failed');
});

class InMemoryOilPriceRepository {
  constructor(initialSnapshotSets = []) {
    this.snapshots = new Map();
    this.runs = new Map();

    initialSnapshotSets.forEach((snapshotSet) => this.saveSnapshotSetSync(snapshotSet));
  }

  async saveSnapshots(snapshotSet) {
    let insertedCount = 0;

    snapshotSet.products.forEach((product) => {
      const key = this.snapshotKey(snapshotSet.effectiveDate, product.productCode);

      if (this.snapshots.has(key)) {
        return;
      }

      insertedCount += 1;
      this.snapshots.set(key, {
        effectiveDate: snapshotSet.effectiveDate,
        productCode: product.productCode,
        productName: product.productName,
        price: product.price,
      });
    });

    return { insertedCount };
  }

  async getLatestEffectiveDate() {
    return [...this.snapshots.values()]
      .map((snapshot) => snapshot.effectiveDate)
      .sort()
      .at(-1) || null;
  }

  async getPreviousCompleteSnapshotSet(beforeEffectiveDate, expectedProductCodes) {
    const dates = [...new Set([...this.snapshots.values()].map((snapshot) => snapshot.effectiveDate))]
      .filter((effectiveDate) => effectiveDate < beforeEffectiveDate)
      .sort()
      .reverse();

    for (const effectiveDate of dates) {
      const snapshotSet = await this.getCompleteSnapshotSet(effectiveDate, expectedProductCodes);

      if (snapshotSet) {
        return snapshotSet;
      }
    }

    return null;
  }

  async getCompleteSnapshotSet(effectiveDate, expectedProductCodes) {
    const products = expectedProductCodes
      .map((productCode) => this.snapshots.get(this.snapshotKey(effectiveDate, productCode)))
      .filter(Boolean);

    if (products.length !== expectedProductCodes.length) {
      return null;
    }

    return { effectiveDate, products };
  }

  async getNotificationRun(effectiveDate) {
    return this.runs.get(effectiveDate) || null;
  }

  async saveNotificationRun(effectiveDate, status, details = {}) {
    const run = {
      effectiveDate,
      status,
      messageSummary: details.messageSummary || '',
      errorMessage: details.errorMessage || '',
    };
    this.runs.set(effectiveDate, run);
    return run;
  }

  snapshotKeyCount(effectiveDate) {
    return [...this.snapshots.keys()].filter((key) => key.startsWith(`${effectiveDate}:`)).length;
  }

  saveSnapshotSetSync(snapshotSet) {
    snapshotSet.products.forEach((product) => {
      this.snapshots.set(this.snapshotKey(snapshotSet.effectiveDate, product.productCode), {
        effectiveDate: snapshotSet.effectiveDate,
        productCode: product.productCode,
        productName: product.productName,
        price: product.price,
      });
    });
  }

  snapshotKey(effectiveDate, productCode) {
    return `${effectiveDate}:${productCode}`;
  }
}

function createRepositoryWithPreviousSnapshot() {
  return new InMemoryOilPriceRepository([
    snapshotSet('2026-08-31', [
      ['92', '92無鉛汽油', 29.1],
      ['95', '95無鉛汽油', 30.6],
      ['98', '98無鉛汽油', 32.6],
      ['diesel', '超級柴油', 27.2],
    ]),
  ]);
}

function createLineClient({ shouldFail = false } = {}) {
  return {
    broadcasts: [],
    async broadcast(payload) {
      if (shouldFail) {
        throw new Error('LINE failed');
      }

      this.broadcasts.push(payload);
    },
  };
}

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
