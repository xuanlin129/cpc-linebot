import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureOilPriceIndexes } from '../db/mongo.js';

test('creates MongoDB indexes for oil snapshots and notification runs', async () => {
  const db = new FakeDb();

  await ensureOilPriceIndexes(db);

  assert.deepEqual(db.indexes, [
    {
      collection: 'oil_price_snapshots',
      keys: { effectiveDate: 1, productCode: 1 },
      options: { unique: true, name: 'uniq_effective_date_product' },
    },
    {
      collection: 'oil_price_snapshots',
      keys: { effectiveDate: -1 },
      options: { name: 'idx_effective_date_desc' },
    },
    {
      collection: 'oil_price_notification_runs',
      keys: { effectiveDate: 1 },
      options: { unique: true, name: 'uniq_notification_effective_date' },
    },
  ]);
});

class FakeDb {
  constructor() {
    this.indexes = [];
  }

  collection(name) {
    return {
      createIndex: async (keys, options) => {
        this.indexes.push({ collection: name, keys, options });
      },
    };
  }
}
