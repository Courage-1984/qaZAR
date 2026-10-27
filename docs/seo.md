# On-page SEO checks

qaZAR reads search tags from the HTML already downloaded while building the page queue. The result is `siteProfile.seo` on the run: a score, an issue list, and one row per captured page.

Checks use the static response. A title or canonical that exists only after client-side JavaScript will look missing. Core Web Vitals are not part of this pass.

Sources:

- [Title links](https://developers.google.com/search/docs/appearance/title-link)
- [Snippets](https://developers.google.com/search/docs/appearance/snippet)
- [Robots meta tag](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)
- [Canonicalization](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Structured data](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)

## Scored issues

The score starts at 100 and floors at 20. Informational notes do not move it.

| Check | Severity | Points |
| --- | --- | --- |
| `noindex` or `none` in `meta name="robots"`, `meta name="googlebot"`, or a Google `X-Robots-Tag` | error | −25 per page, cap −50 |
| URL disallowed by robots.txt (submitted pages are still captured) | error | shares the −25 / −50 cap |
| Missing or empty `<title>` | error | −20 per page |
| Same title on two or more captured pages | warn | −10 per duplicate group |
| Vague title whose whole text is Home, Index, Untitled, Welcome, or Profile | warn | listed only |
| Missing meta description | warn | −8 per page |
| Same meta description on two or more captured pages | warn | −5 per duplicate group |
| No H1 | warn | −5 per page |
| JSON-LD `script` that does not parse | warn | −8 per page |

A page that is both `noindex` and disallowed counts once toward the cap. Rules aimed at a bot other than Googlebot are ignored. `nosnippet` and `max-snippet` do not count as `noindex`.

## Noted, not scored

Google publishes no character cap. 60 and 160 are display hints, because title links and snippets are truncated to the device width.

- Title longer than 60 characters, description longer than 160
- More than one H1
- Missing canonical, a canonical that is not an absolute `http(s)` URL, or a canonical on another host
- No JSON-LD (invalid JSON-LD is scored; absence is not)
- `html` element without `lang`
- Missing `og:title` or `og:image` (social preview, separate from the search score)

## Where it runs

Sitemap and explicit-page runs fetch every URL that will be captured, up to `max_pages`, and read robots.txt first. A BFS run reuses the HTML from discovery and scores only the URLs selected for capture.

The executive report renders this as **Search appearance**. The results page shows the score and the first error or warning.
