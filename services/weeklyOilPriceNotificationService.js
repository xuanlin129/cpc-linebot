import { getTrackedProductCodes } from './cpcOilPriceService.js';
import { compareOilPriceSnapshots, summarizeMovements } from './oilPriceComparisonService.js';
import { broadcastMessage } from './lineOilNotificationService.js';
import { createWeeklyOilMovementMessage } from '../templates/oil.js';

export async function runWeeklyOilPriceNotification({
  fetchCurrentOilPrices,
  oilPriceRepository,
  lineClient,
  now = new Date(),
}) {
  const latestStoredEffectiveDate = await oilPriceRepository.getLatestEffectiveDate();
  const latestSnapshotSet = await fetchCurrentOilPrices();
  const existingRun = await oilPriceRepository.getNotificationRun(latestSnapshotSet.effectiveDate);

  if (existingRun?.status === 'sent') {
    return skip(oilPriceRepository, latestSnapshotSet.effectiveDate, 'Notification already sent', now);
  }

  const isStaleSource = latestStoredEffectiveDate === latestSnapshotSet.effectiveDate && !existingRun;

  if (isStaleSource) {
    return skip(oilPriceRepository, latestSnapshotSet.effectiveDate, 'CPC data has not updated yet', now);
  }

  await oilPriceRepository.saveSnapshots(latestSnapshotSet, now);

  const expectedProductCodes = getTrackedProductCodes();
  const previousSnapshotSet = await oilPriceRepository.getPreviousCompleteSnapshotSet(
    latestSnapshotSet.effectiveDate,
    expectedProductCodes,
  );

  if (!previousSnapshotSet) {
    return skip(oilPriceRepository, latestSnapshotSet.effectiveDate, 'Previous snapshot unavailable', now);
  }

  const movements = compareOilPriceSnapshots(latestSnapshotSet, previousSnapshotSet);
  const messageSummary = summarizeMovements(movements);

  try {
    const message = createWeeklyOilMovementMessage(latestSnapshotSet.effectiveDate, movements);
    const delivery = await broadcastMessage(lineClient, message);

    await oilPriceRepository.saveNotificationRun(latestSnapshotSet.effectiveDate, 'sent', {
      scheduledAt: now,
      sentAt: now,
      messageSummary,
    });

    return {
      status: 'sent',
      effectiveDate: latestSnapshotSet.effectiveDate,
      messageSummary,
      sentCount: delivery.sentCount,
    };
  } catch (error) {
    return fail(oilPriceRepository, latestSnapshotSet.effectiveDate, error.message, now, { messageSummary });
  }
}

async function skip(repository, effectiveDate, reason, now, details = {}) {
  await repository.saveNotificationRun(effectiveDate, 'skipped', {
    scheduledAt: now,
    errorMessage: reason,
    messageSummary: details.messageSummary,
  });

  return {
    status: 'skipped',
    effectiveDate,
    reason,
  };
}

async function fail(repository, effectiveDate, reason, now, details = {}) {
  await repository.saveNotificationRun(effectiveDate, 'failed', {
    scheduledAt: now,
    errorMessage: reason,
    messageSummary: details.messageSummary,
  });

  return {
    status: 'failed',
    effectiveDate,
    reason,
  };
}
