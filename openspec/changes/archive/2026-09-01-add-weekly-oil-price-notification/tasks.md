## 1. Persistence

- [x] 1.1 Configure the MongoDB project dependency, then verify the app can establish a connection in local development.
- [x] 1.2 Add MongoDB index support for oil price snapshots with uniqueness by effective date and product code, then verify duplicate inserts cannot create duplicate product snapshots.
- [x] 1.3 Add MongoDB index support for notification runs with an idempotency boundary by effective date, then verify a successful run prevents a second successful notification for the same effective date.
- [x] 1.4 Remove notification target storage from the weekly flow, then verify MongoDB indexes only cover snapshots and notification runs.

## 2. Oil Price Domain Logic

- [x] 2.1 Extract CPC oil price fetching and normalization into a reusable service, then verify it returns the tracked products with normalized effective date, product code, name, and numeric price.
- [x] 2.2 Add validation for incomplete or malformed CPC responses, then verify missing tracked products produce a controlled failure or skip result.
- [x] 2.3 Implement snapshot persistence for new effective dates, then verify an already stored effective date is not inserted twice.
- [x] 2.4 Implement comparison between the latest complete snapshot and the previous complete snapshot, then verify increased, decreased, and unchanged products are classified correctly.

## 3. LINE Message Delivery

- [x] 3.1 Replace shared mutable oil message template usage with a fresh-message builder, then verify repeated on-demand oil price lookups do not duplicate Flex message contents.
- [x] 3.2 Add a weekly oil price movement message builder, then verify it includes effective date, current prices, and movement amounts for all tracked products.
- [x] 3.3 Implement LINE broadcast delivery, then verify delivery does not require configured target IDs.

## 4. Scheduled Flow

- [x] 4.1 Add an authenticated scheduled endpoint or job entrypoint for the weekly notification flow, then verify unauthenticated calls are rejected.
- [x] 4.2 Configure the deployment scheduler to run after CPC's Sunday 12:00 Asia/Taipei update window, then verify the configured schedule is later than noon.
- [x] 4.3 Implement stale-source handling when CPC has not published a new effective date, then verify the flow does not send a notification for previously stored effective dates.
- [x] 4.4 Implement notification run status updates for sent, skipped, and failed outcomes, then verify each outcome is persisted with a useful reason or summary.

## 5. Verification

- [x] 5.1 Add unit tests for normalization, comparison, idempotency, and message building, then verify the test suite passes.
- [x] 5.2 Add an integration-level test or scripted dry run for the scheduled flow with seeded previous and latest snapshots, then verify exactly one notification attempt is recorded.
- [x] 5.3 Run `openspec validate "add-weekly-oil-price-notification" --type change --strict --no-interactive` and verify the change passes validation.
