import { createMongoClient, ensureOilPriceIndexes, getMongoConfig } from '../db/mongo.js';

async function main() {
  const config = getMongoConfig();
  const client = await createMongoClient(config);

  try {
    const db = client.db(config.dbName);
    await db.command({ ping: 1 });
    await ensureOilPriceIndexes(db);
    console.log('MongoDB connection and oil price indexes are ready');
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
