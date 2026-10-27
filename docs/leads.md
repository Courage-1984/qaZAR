# Hot leads

qaZAR reads public business contacts from pages the user already submitted. It does not log in, bypass paywalls, or pull private directories. The SSRF guard is unchanged.

Each contact is `{ value, kind, role, page }`. `kind` is `email`, `phone`, or `social`.

## What is kept

- Emails from `mailto:`. Visible text is used only when the page has no `mailto:`.
- Phones from `tel:` and WhatsApp (`wa.me`, `api.whatsapp.com`). Stored as digits, with a leading `+` when the source had one. Strings that are not a real number (fewer than 7 digits, more than 15, all zeros, or one repeated digit) are dropped.
- JSON-LD `Organization`, `LocalBusiness`, and `ContactPoint`: company name, email, and phone. A contact-point name of founder, sales, support, or press becomes the role.
- Company name from that JSON-LD `name`, otherwise `og:site_name`.
- Role from the words founder, sales, support, or press next to a `mailto:`.
- Booking links on Calendly, Cal.com, SavvyCal, and HubSpot meetings. Tracking query strings are removed.

## What is dropped

- Junk mail: `noreply`, `sentry`, `wix`, `example`, `schema.org`, image filenames, and CSS escapes.
- Share buttons (`intent/tweet`, `sharer.php`, LinkedIn sharing) and profile URLs that are only a bare domain.
- Social links that are not a company profile on LinkedIn, X, Twitter, GitHub, or Instagram. Click ids are not stored.

## Lead heat

Starts at 0 and caps at 100.

| Signal | Points |
| --- | --- |
| At least one email | 30 |
| At least one phone | 20 |
| Lead form | 15 |
| Booking link | 15 |
| Contact, team, book, or demo URL | 10 |
| Pricing or plans URL | 10 |

The profile stores `leadHeat`, `companyName`, `bookingLinks`, and `leadContacts` (string lists plus the richer `contacts` array).

## Where it is collected

- A BFS crawl reads the HTML it already downloaded.
- Sitemap and explicit page lists do not download that HTML twice. The desktop capture reads the rendered page once and merges contacts into `siteProfile`.
- The executive report shows heat, company, each contact with role and page, and booking links.
- The results page shows heat and up to two contacts.

Page selection keeps the homepage and the highest-scoring contact, team, or booking URL inside `max_pages`. Those paths score +40. See [crawler-roi.md](crawler-roi.md).
