# weekly-oil-price-notification Specification

## Purpose

Provide a reliable weekly LINE notification that summarizes CPC oil price movement after the Sunday noon data update, even though the upstream CPC data source only exposes the latest price set.

## Requirements

### Requirement: Weekly oil price snapshots are retained
The system SHALL persist normalized weekly CPC oil price snapshots for all tracked oil products so future runs can compare the latest prices against a previously observed price set.

#### Scenario: New effective date is observed
- **WHEN** the scheduled notification flow fetches CPC oil price data with an effective date that is not yet stored
- **THEN** the system stores one normalized snapshot record per tracked oil product for that effective date

#### Scenario: Effective date is already stored
- **WHEN** the scheduled notification flow fetches CPC oil price data for an effective date that already has complete stored snapshots
- **THEN** the system does not create duplicate snapshot records for that effective date and product set

### Requirement: Weekly price movement is calculated
The system SHALL compare the latest stored price set with the immediately previous stored price set and classify each tracked oil product as increased, decreased, or unchanged.

#### Scenario: Previous snapshot exists
- **WHEN** the system has a latest complete snapshot set and a previous complete snapshot set
- **THEN** the system calculates the per-product price difference and movement direction for each tracked oil product

#### Scenario: Previous snapshot is missing
- **WHEN** the system stores its first complete snapshot set and no previous complete snapshot set exists
- **THEN** the system records that comparison is unavailable and does not send a weekly movement notification

### Requirement: Weekly notification is sent after CPC updates
The system SHALL send a LINE notification after CPC's Sunday noon update only when a new complete effective price set is available and comparison against the previous price set is possible.

#### Scenario: New comparable snapshot is available
- **WHEN** the scheduled notification flow observes a new complete effective price set after the configured Sunday update window
- **THEN** the system sends a LINE notification that includes the effective date, tracked oil products, current prices, and per-product movement from the previous price set

#### Scenario: CPC data has not updated yet
- **WHEN** the scheduled notification flow runs after Sunday noon but CPC still returns the previously stored effective date
- **THEN** the system does not send a weekly movement notification for that run

#### Scenario: Source data is incomplete
- **WHEN** the scheduled notification flow cannot find all tracked oil products in the CPC response
- **THEN** the system does not send a weekly movement notification and records the run as failed or skipped with an explanatory reason

### Requirement: Notification delivery is idempotent
The system SHALL prevent duplicate weekly notifications for the same effective price date, even if the scheduler retries or invokes the flow multiple times.

#### Scenario: Notification already sent
- **WHEN** the scheduled notification flow runs for an effective date that already has a successful notification record
- **THEN** the system does not send another LINE notification for that effective date

#### Scenario: Previous delivery failed
- **WHEN** the scheduled notification flow runs for an effective date that has a failed notification record but no successful notification record
- **THEN** the system may retry delivery and updates the notification run status according to the result

### Requirement: Notification is broadcast to official account friends
The system SHALL send weekly oil price notifications by LINE broadcast so all users who have added the official account can receive the notification.

#### Scenario: Broadcast notification is ready
- **WHEN** a weekly movement notification is ready to send
- **THEN** the system sends it with LINE broadcast without requiring configured target IDs
