## Why

The bot can show the current CPC oil price on demand, but CPC's weekly source data is overwritten after the Sunday noon update and does not retain the previous week's values. To send reliable weekly increase/decrease notifications, the application must persist its own oil price snapshots before comparing and broadcasting changes.

## What Changes

- Add a scheduled weekly oil price notification flow that runs after CPC's Sunday 12:00 data update.
- Persist normalized oil price snapshots for the tracked products so the bot can compare the latest CPC data against the previous stored snapshot.
- Calculate per-product price movement as increased, decreased, or unchanged.
- Send a LINE broadcast notification summarizing weekly oil price movement.
- Record notification runs so retries or duplicated scheduler invocations do not send duplicate notifications for the same effective price date.
- Keep the existing on-demand oil price query behavior, while allowing it to share the normalized fetch and message-building logic.

## Capabilities

### New Capabilities

- `weekly-oil-price-notification`: Scheduled CPC oil price snapshot retention, weekly comparison, and LINE notification delivery.

### Modified Capabilities

- None.

## Impact

- Affected code: oil price fetch/format logic, LINE messaging flow, application routing for scheduled invocations, and message templates.
- New persistence layer: MongoDB collections for oil price snapshots and notification runs.
- New scheduling/deployment concern: a weekly Vercel Cron request that runs after CPC's Sunday noon update, with retry behavior when the source data has not updated yet.
- New configuration: database connection settings and scheduler authorization/secret values.
