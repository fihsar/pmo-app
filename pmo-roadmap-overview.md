# PMO App Roadmap Overview

This roadmap is organized into three tracks:

1. Features
2. Security
3. Stability

Recommended implementation order:

1. Upload history and batch comparison
2. Config-driven business rules
3. Trend analytics and audit workflows
4. Security and RLS hardening
5. Schema and migration cleanup

Why this order:

- Feature work comes first so the team gets visible product value earlier.
- Security still matters, but it can follow once the next business-facing improvements are defined.
- Stability work remains important because it makes later changes safer and easier to maintain.

Highest-value near-term feature:

- Upload history and batch comparison

Why it stands out:

- It gives immediate operational value to PMO users.
- It helps explain why numbers changed after a new upload.
- It supports later work on trend reporting and auditability.

See the companion files for the track-level details:

- `pmo-roadmap-security.md`
- `pmo-roadmap-stability.md`
- `pmo-roadmap-features.md`
