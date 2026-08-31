export class MongoOilPriceRepository {
  constructor(db) {
    this.snapshots = db.collection('oil_price_snapshots');
    this.notificationRuns = db.collection('oil_price_notification_runs');
  }

  async saveSnapshots(snapshotSet, now = new Date()) {
    const documents = snapshotSet.products.map((product) => ({
      effectiveDate: snapshotSet.effectiveDate,
      productCode: product.productCode,
      productName: product.productName,
      price: product.price,
      createdAt: now,
      updatedAt: now,
    }));

    if (documents.length === 0) {
      return { insertedCount: 0 };
    }

    try {
      const result = await this.snapshots.insertMany(documents, { ordered: false });

      return { insertedCount: result.insertedCount };
    } catch (error) {
      if (!isDuplicateKeyOnlyError(error)) {
        throw error;
      }

      return {
        insertedCount: getInsertedCountFromDuplicateError(error, documents.length),
      };
    }
  }

  async getLatestEffectiveDate() {
    const latest = await this.snapshots.findOne({}, { sort: { effectiveDate: -1 } });
    return latest?.effectiveDate || null;
  }

  async getCompleteSnapshotSet(effectiveDate, expectedProductCodes) {
    const records = await this.snapshots
      .find({ effectiveDate, productCode: { $in: expectedProductCodes } })
      .sort({ productCode: 1 })
      .toArray();

    if (records.length !== expectedProductCodes.length) {
      return null;
    }

    return {
      effectiveDate,
      products: records.map(toSnapshotProduct),
    };
  }

  async getPreviousCompleteSnapshotSet(beforeEffectiveDate, expectedProductCodes) {
    const dates = await this.snapshots
      .distinct('effectiveDate', { effectiveDate: { $lt: beforeEffectiveDate } });

    const sortedDates = dates.sort().reverse();

    for (const effectiveDate of sortedDates) {
      const snapshotSet = await this.getCompleteSnapshotSet(effectiveDate, expectedProductCodes);

      if (snapshotSet) {
        return snapshotSet;
      }
    }

    return null;
  }

  async getNotificationRun(effectiveDate) {
    return this.notificationRuns.findOne({ effectiveDate });
  }

  async saveNotificationRun(effectiveDate, status, details = {}, now = new Date()) {
    const existingRun = await this.getNotificationRun(effectiveDate);
    const document = createNotificationRunDocument(effectiveDate, status, details, now, existingRun);

    if (existingRun) {
      await this.notificationRuns.replaceOne({ _id: existingRun._id }, document);
      return this.getNotificationRun(effectiveDate);
    }

    try {
      await this.notificationRuns.insertOne(document);
    } catch (error) {
      if (!isDuplicateKeyOnlyError(error)) {
        throw error;
      }

      const duplicatedRun = await this.getNotificationRun(effectiveDate);
      const replacement = createNotificationRunDocument(effectiveDate, status, details, now, duplicatedRun);
      await this.notificationRuns.replaceOne({ _id: duplicatedRun._id }, replacement);
    }

    return this.getNotificationRun(effectiveDate);
  }
}

function createNotificationRunDocument(effectiveDate, status, details, now, existingRun) {
  return {
    ...(existingRun?._id ? { _id: existingRun._id } : {}),
    effectiveDate,
    status,
    scheduledAt: details.scheduledAt || now,
    sentAt: status === 'sent' ? details.sentAt || now : null,
    messageSummary: details.messageSummary || '',
    errorMessage: details.errorMessage || '',
    createdAt: existingRun?.createdAt || now,
    updatedAt: now,
  };
}

function isDuplicateKeyOnlyError(error) {
  return error?.code === 11000 || error?.writeErrors?.every((writeError) => writeError.code === 11000);
}

function getInsertedCountFromDuplicateError(error, documentCount) {
  if (Number.isInteger(error?.result?.insertedCount)) {
    return error.result.insertedCount;
  }

  if (Number.isInteger(error?.insertedCount)) {
    return error.insertedCount;
  }

  return documentCount - (error?.writeErrors?.length || documentCount);
}

function toSnapshotProduct(record) {
  return {
    productCode: record.productCode,
    productName: record.productName,
    price: Number(record.price),
  };
}
