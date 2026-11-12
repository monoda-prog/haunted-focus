# Implementation decisions — 2026-11-12

This application implements the original requirements and design drafts. This record was authored by an OpenAI assistant; it is not evidence of Kiro use.

- Plain JavaScript modules + Vite; static hosting, no backend.
- Default focus/break durations: 25 and 5 minutes. No automatic phase transitions.
- Deadline-based timers persist across reloads. Background completions use the scheduled completion timestamp, with unique session IDs preventing duplicate rewards.
- Statistics use completion day in the viewer's current local timezone. Partial sessions do not count. Clock changes affect the remaining duration.
- Seven scene windows are illuminated from today's session count. Higher counts remain visible numerically.
- Browser localStorage stores tasks, completed sessions, timer and reduced-motion preference. JSON export provides a manual backup; no import or sync is implemented.
- Storage failures are disclosed, and corrupt stored content is not overwritten. Web Locks provide a single-tab editor where available.
- All state is readable without decorative graphics. Semantic forms, text controls, live transition messages, visible focus and both system/user reduced-motion are provided.
- No notifications, audio, analytics, account, or cloud permissions.

Original proposal files remain unchanged for provenance. See README for executable verification commands. Contest eligibility and genuine Kiro usage must be established separately.
