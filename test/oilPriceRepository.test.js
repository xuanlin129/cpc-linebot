import test from 'node:test';
import assert from 'node:assert/strict';
import { MongoOilPriceRepository } from '../repositories/oilPriceRepository.js';

test('saves snapshot documents with createdAt and updatedAt at the end', async () => {
  const collection = new FakeSnapshotCollection();
  const repository = new MongoOilPriceRepository(new FakeDb(collection));
  const now = new Date('2026-09-06T04:10:00.000Z');

  await repository.saveSnapshots(
    {
      effectiveDate: '2026-09-07',
      products: [
        {
          productCode: '92',
          productName: '92無鉛汽油',
          price: 29.3,
        },
      ],
    },
    now,
  );

  assert.deepEqual(Object.keys(collection.documents[0]), [
    'effectiveDate',
    'productCode',
    'productName',
    'price',
    'createdAt',
    'updatedAt',
  ]);
  assert.deepEqual(collection.documents[0], {
    effectiveDate: '2026-09-07',
    productCode: '92',
    productName: '92無鉛汽油',
    price: 29.3,
    createdAt: now,
    updatedAt: now,
  });
});

test('treats duplicate snapshot inserts as idempotent', async () => {
  const collection = new FakeSnapshotCollection({
    error: {
      writeErrors: [{ code: 11000 }, { code: 11000 }],
    },
  });
  const repository = new MongoOilPriceRepository(new FakeDb(collection));
  const result = await repository.saveSnapshots({
    effectiveDate: '2026-09-07',
    products: [
      {
        productCode: '92',
        productName: '92無鉛汽油',
        price: 29.3,
      },
      {
        productCode: '95',
        productName: '95無鉛汽油',
        price: 30.8,
      },
    ],
  });

  assert.deepEqual(result, { insertedCount: 0 });
});

test('throws non-duplicate snapshot insert errors', async () => {
  const error = new Error('Mongo failed');
  const collection = new FakeSnapshotCollection({ error });
  const repository = new MongoOilPriceRepository(new FakeDb(collection));

  await assert.rejects(
    () =>
      repository.saveSnapshots({
        effectiveDate: '2026-09-07',
        products: [
          {
            productCode: '92',
            productName: '92無鉛汽油',
            price: 29.3,
          },
        ],
      }),
    error,
  );
});

test('saves notification run documents with createdAt and updatedAt at the end', async () => {
  const notificationRuns = new FakeNotificationRunCollection();
  const repository = new MongoOilPriceRepository(new FakeDb(undefined, notificationRuns));
  const now = new Date('2026-09-06T04:10:00.000Z');

  await repository.saveNotificationRun('2026-09-07', 'sent', {
    scheduledAt: now,
    sentAt: now,
    messageSummary: '92 +0.2',
  }, now);

  assert.deepEqual(Object.keys(notificationRuns.documents[0]), [
    'effectiveDate',
    'status',
    'scheduledAt',
    'sentAt',
    'messageSummary',
    'errorMessage',
    'createdAt',
    'updatedAt',
  ]);
  assert.deepEqual(notificationRuns.documents[0], {
    effectiveDate: '2026-09-07',
    status: 'sent',
    scheduledAt: now,
    sentAt: now,
    messageSummary: '92 +0.2',
    errorMessage: '',
    createdAt: now,
    updatedAt: now,
  });
});

test('replaces notification runs while keeping timestamp fields at the end', async () => {
  const createdAt = new Date('2026-09-06T04:10:00.000Z');
  const updatedAt = new Date('2026-09-06T04:15:00.000Z');
  const notificationRuns = new FakeNotificationRunCollection([
    {
      _id: 'run-1',
      effectiveDate: '2026-09-07',
      status: 'failed',
      scheduledAt: createdAt,
      sentAt: null,
      messageSummary: '92 +0.2',
      errorMessage: 'LINE failed',
      createdAt,
      updatedAt: createdAt,
    },
  ]);
  const repository = new MongoOilPriceRepository(new FakeDb(undefined, notificationRuns));

  await repository.saveNotificationRun('2026-09-07', 'sent', {
    scheduledAt: createdAt,
    sentAt: updatedAt,
    messageSummary: '92 +0.2',
  }, updatedAt);

  assert.deepEqual(Object.keys(notificationRuns.documents[0]), [
    '_id',
    'effectiveDate',
    'status',
    'scheduledAt',
    'sentAt',
    'messageSummary',
    'errorMessage',
    'createdAt',
    'updatedAt',
  ]);
  assert.equal(notificationRuns.documents[0].createdAt, createdAt);
  assert.equal(notificationRuns.documents[0].updatedAt, updatedAt);
  assert.equal(notificationRuns.documents[0].status, 'sent');
});

class FakeDb {
  constructor(snapshotCollection = new FakeSnapshotCollection(), notificationRunCollection = new FakeNotificationRunCollection()) {
    this.snapshotCollection = snapshotCollection;
    this.notificationRunCollection = notificationRunCollection;
  }

  collection(name) {
    if (name === 'oil_price_snapshots') {
      return this.snapshotCollection;
    }

    if (name === 'oil_price_notification_runs') {
      return this.notificationRunCollection;
    }

    return {};
  }
}

class FakeSnapshotCollection {
  constructor({ error } = {}) {
    this.documents = [];
    this.error = error;
  }

  async insertMany(documents) {
    if (this.error) {
      throw this.error;
    }

    this.documents.push(...documents);
    return { insertedCount: documents.length };
  }
}

class FakeNotificationRunCollection {
  constructor(documents = []) {
    this.documents = documents;
  }

  async findOne(filter) {
    return this.documents.find((document) => document.effectiveDate === filter.effectiveDate) || null;
  }

  async insertOne(document) {
    this.documents.push(document);
    return { insertedId: document._id };
  }

  async replaceOne(filter, replacement) {
    const index = this.documents.findIndex((document) => document._id === filter._id);

    if (index === -1) {
      return { matchedCount: 0, modifiedCount: 0 };
    }

    this.documents[index] = replacement;
    return { matchedCount: 1, modifiedCount: 1 };
  }
}
