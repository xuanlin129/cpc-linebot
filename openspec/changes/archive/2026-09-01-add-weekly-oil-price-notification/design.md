## Context

The current bot is an Express LINE webhook deployed through the single `index.js` entrypoint. On-demand oil price lookup fetches CPC data from `https://vipmbr.cpc.com.tw/opendata/sixtypeoillistprice` and builds a Flex message directly from the latest response.

CPC updates the weekly price source around Sunday 12:00 and does not expose historical weekly values. The application currently has no persistence layer, no scheduled route, and no LINE broadcast flow. This change uses MongoDB for persistence.

## Goals / Non-Goals

**Goals:**

- Persist enough CPC price data to compare the newest effective price set with the immediately previous stored price set.
- Make the weekly scheduler safe to retry without duplicate notifications.
- Keep oil price fetching, normalization, comparison, and message composition reusable between scheduled notifications and on-demand lookup.
- Broadcast notifications to users who have added the LINE official account.

**Non-Goals:**

- Build a full subscription management UX in this change.
- Backfill historical CPC prices from external sources.
- Predict future oil price changes before CPC publishes the new effective price set.
- Replace the existing station lookup behavior.

## Decisions

### Store weekly snapshot history instead of only one previous value

Persist a complete price snapshot per effective date and tracked product in the `oil_price_snapshots` MongoDB collection:

- `effectiveDate`: normalized CPC effective date.
- `productCode`: stable internal code such as `92`, `95`, `98`, `diesel`.
- `productName`: CPC product name.
- `price`: numeric price per liter.
- `createdAt`: time the snapshot document was first inserted.
- `updatedAt`: same as `createdAt` for inserted snapshots; snapshots are historical records and are not mutated by duplicate saves.

Rationale: the data volume is tiny, history helps troubleshoot notifications, and this avoids fragile overwrite-only state.

Alternative considered: store only the previous week's prices. This is simpler but makes debugging, missed-run recovery, and future trend features harder.

### Record notification runs by effective date

Persist notification attempts separately from price snapshots in the `oil_price_notification_runs` MongoDB collection:

- `effectiveDate`: the price date being notified.
- `status`: `pending`, `sent`, `skipped`, or `failed`.
- `scheduledAt`: expected scheduler execution time.
- `sentAt`: delivery completion time when successful, otherwise `null`.
- `messageSummary`: compact movement summary.
- `errorMessage`: failure or skip reason.
- `createdAt`: time the run document was first inserted.
- `updatedAt`: time the run document was last replaced.

Add a unique index on `effective_date`/`effectiveDate` so only one notification run record exists for a given effective price date. Failed or skipped states can be updated by later retries, while a `sent` state prevents duplicate delivery.

Rationale: scheduler platforms may retry jobs, and manual reruns are likely while debugging. The notification run table gives a durable idempotency boundary.

Alternative considered: rely on scheduler exactly-once execution. That is not reliable enough for user-facing push messages.

### Run the scheduler after the CPC update window and verify freshness

Schedule the weekly flow after Sunday 12:00, preferably 12:05 or 12:10 Asia/Taipei. Vercel Cron invokes the configured path with an HTTP GET request and uses UTC cron expressions, so Sunday 12:10 Asia/Taipei maps to `10 4 * * 0`. The flow must compare the fetched `effective_date` with stored snapshots before sending.

If CPC still returns the previous effective date, record a skipped or retryable run and do not send a notification. A later retry can safely process the new effective date because snapshot and notification writes are idempotent.

Alternative considered: run exactly at Sunday 12:00. That risks fetching stale data during the upstream update boundary.

### Use LINE broadcast for weekly notifications

Use LINE Messaging API broadcast delivery for the weekly oil price notification. The app does not need to store recipient user IDs because LINE delivers broadcast messages to users who have added the official account and can receive messages from it.

Rationale: the desired behavior is official-account-wide delivery, not opt-in target management. Broadcast keeps the implementation simpler and avoids maintaining subscriber state.

Alternative considered: push or multicast to configured target IDs. That allows narrower targeting but does not match the requirement that all official account friends receive the notification.

### Refactor the oil message template into a fresh-message builder

The current on-demand oil price command mutates the imported `oilMsg` object before returning it. The scheduled notification implementation should avoid shared mutable templates by creating a fresh message object per request.

Rationale: shared mutation can duplicate Flex message contents across invocations in a warm server process.

Alternative considered: clone the existing object before mutation. This is acceptable as an implementation detail, but a pure builder is clearer and easier to test.

## Risks / Trade-offs

- CPC response format changes -> Normalize and validate source data before storing; rely on application logs for source-level diagnosis.
- First scheduled run has no previous data -> Store the first snapshot and skip movement notification until the next comparable snapshot exists.
- Scheduler fires multiple times -> Enforce idempotency through snapshot uniqueness and notification run records.
- Database is unavailable -> Do not send notifications when snapshots or run records cannot be persisted; record/log the failure for retry.
- Broadcast delivery fails -> Record the notification run as failed so a later scheduler or manual retry can try the same effective date again.

## Migration Plan

1. Add MongoDB configuration and indexes for snapshots and notification runs.
2. Deploy persistence code without enabling the scheduled notification route.
3. Run an initial manual/scheduled fetch to seed the first snapshot set.
4. Enable the weekly scheduled route after the Sunday noon update window.
5. Roll back by disabling the scheduler first; keep stored snapshots because they are append-only historical data.
