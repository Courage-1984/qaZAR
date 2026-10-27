# Finding review (precision / recall)

qaZAR does **not** replace the health score with a precision/recall score. Instead each violation is triaged:

| Status | Meaning |
|---|---|
| `retained` | Treat as a confirmed finding (errors/warns that are not indeterminate). |
| `needs-review` | Info rules and indeterminate paints (e.g. contrast over images). |
| `withdrawn` | Explicit override (`run.reviewOverrides[key]`) after human review. |

## API

- `GET /api/runs/:id/review` — full `{ counts, findings }` (owner-scoped).
- `GET /api/share/:token` — includes `review` counts only when the run is `done`.

Overrides live on the run document as `reviewOverrides` (key → status). Live Logia / Logi-Ink calibration of retained vs withdrawn rates is an ops process on top of this scaffold.

## Screenshot-pixel contrast

Pixel sampling of screenshots for contrast is **not** shipped yet. DOM compositing contrast remains the engine; indeterminate paints stay `needs-review`.
