# PMO App Roadmap: Features

## Goals

- Add features that match the current PMO workflow and data model.
- Improve trust in uploads and reporting.
- Reduce the amount of business logic that currently lives only in code.

## Recommended Features

1. Upload history and batch comparison
   - Show each upload batch
   - Include upload time, source type, row count, and validation warnings
   - Allow comparison with the previous batch

2. Configurable business rules in the app
   - Allowed AMs
   - KPI PM lists
   - Classification keywords
   - GP target values

3. Trend reporting across batches
   - GP achievement over time
   - Backlog aging trend
   - Prospect conversion by month
   - PM/project health trend

4. Audit trail
   - User role changes
   - Account status changes
   - Manual backlog status updates
   - Other sensitive administrative actions

## Suggested Implementation Order

1. Upload history and batch comparison
2. Config-driven business rules
3. Trend analytics
4. Audit workflows

## Suggested Outcome

- Users can trust what was uploaded and what changed between batches.
- Operational rules become configurable instead of requiring code edits.
- Reporting becomes more historical and decision-friendly.
