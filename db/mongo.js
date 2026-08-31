import { MongoClient } from 'mongodb';

let cachedClient;

export function getMongoConfig(env = process.env) {
  return {
    uri: env.MONGODB_URI || '',
    dbName: env.MONGODB_DB_NAME || undefined,
  };
}

export async function createMongoClient(config = getMongoConfig()) {
  if (!config.uri) {
    throw new Error('MONGODB_URI is required');
  }

  const client = new MongoClient(config.uri);
  await client.connect();

  return client;
}

export async function getMongoDb(config = getMongoConfig()) {
  if (!cachedClient) {
    cachedClient = await createMongoClient(config);
  }

  return cachedClient.db(config.dbName);
}

export async function closeMongoClient() {
  if (!cachedClient) {
    return;
  }

  await cachedClient.close();
  cachedClient = undefined;
}

export async function ensureOilPriceIndexes(db) {
  await db.collection('oil_price_snapshots').createIndex(
    { effectiveDate: 1, productCode: 1 },
    { unique: true, name: 'uniq_effective_date_product' },
  );

  await db.collection('oil_price_snapshots').createIndex(
    { effectiveDate: -1 },
    { name: 'idx_effective_date_desc' },
  );

  await db.collection('oil_price_notification_runs').createIndex(
    { effectiveDate: 1 },
    { unique: true, name: 'uniq_notification_effective_date' },
  );
}
