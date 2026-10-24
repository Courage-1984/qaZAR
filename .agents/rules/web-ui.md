---
trigger: model_decision
description: Apply when editing anything under web/ (UI pages, styles, api client, Vite config) or the GitHub Pages workflow.
---

# Web UI rules

- Stack: Vite multi-page (`index.html`, `results.html`), vanilla JS modules, vanilla CSS. No frameworks, no Tailwind, no runtime CDN scripts (fonts only).
- All server strings rendered via `esc()` from `web/api.js`; never `innerHTML` raw API data.
- API base is user-configurable (`localStorage` `qazar.apiBase`); never hardcode other hosts. Handle API-down state with a clear message.
- Accessibility: every input has a `<label for>`, interactive elements have unique `id`/`aria-label`, targets >= 48px, respect `prefers-reduced-motion`. One `<h1>` per page, meta title+description.
- Design tokens live in `:root` of `web/style.css` (dark, indigo→pink accent). Reuse tokens; do not introduce ad-hoc colours.
- Relative asset paths only (`base: './'`) – the site is served from `/qaZAR/` on GitHub Pages.
- After changes: `npm run build:web` must pass; check both pages at mobile (390px) and desktop widths (use browser subagent if available).
