# Crawler & ROI Page Scoring

qaZAR's crawler is optimized to maximize testing ROI within bounded run limits (`max_pages`). Instead of capturing duplicate paginated pages, it selects high-impact, template-diverse pages.

## Discovery Pipeline

1. **Explicit Sitemap**: Fetches URL specified by user (`sitemap_url`).
2. **Auto-Discovered Sitemap**: Checks `robots.txt`, `/sitemap.xml`, and `/sitemap_index.xml`.
3. **Static BFS Crawl**: Fetches HTML and extracts same-origin `<a href>` links.
4. **Headless JS Crawl Fallback**:
   - For client-rendered SPAs (React, Vue, Next.js) where static HTML yields `<div id="root"></div>`.
   - Uses Playwright to navigate, wait for `domcontentloaded` and `networkidle`, and evaluate live DOM anchor tags.

## ROI Scoring Algorithm (`server/crawler/roiScorer.js`)

Each candidate URL is assigned an ROI score based on:

### High ROI Bonuses
- **Root URL / Homepage**: +100 bonus.
- **Commercial & Core UX Paths**:
  - `pricing`, `plans`, `billing`, `upgrade`: +50
  - `signup`, `register`, `login`, `auth`: +45
  - `checkout`, `cart`, `order`, `pay`: +45
  - `dashboard`, `app`, `portal`, `console`: +40
  - `features`, `product`, `solutions`: +35
  - `contact`, `support`, `faq`: +40
  - `team`, `people`, `staff`: +40
  - `book`, `demo`, `schedule`: +40
  - `about`, `company`, `careers`: +25
  - `docs`, `documentation`, `api`: +25
- **Path Depth**: Shallow depth (1-2 segments) receives priority (+20 / +10).

### Penalties & Diversity Protection
- **Pagination**: `/page/\d+`, `?page=\d+` (-40 penalty).
- **Date Archives**: `/\d{4}/\d{2}/` (-30 penalty).
- **Template Clustering**: When multiple URLs share a common root segment (e.g. `/blog/post-1`, `/blog/post-2`), successive candidates receive a progressive penalty (`-15 * count`), preserving page budget for other distinct templates.

When the candidate list is longer than `max_pages`, the homepage and the highest-scoring contact, team, or booking URL are kept inside the budget. Public contact rules are in [leads.md](leads.md).

## On-page SEO

Captured pages are checked for titles, meta descriptions, H1s, indexability, canonicals, and JSON-LD. See [seo.md](seo.md). A BFS crawl reads the HTML it already fetched. Sitemap and explicit page lists read the same fields from the desktop capture.
