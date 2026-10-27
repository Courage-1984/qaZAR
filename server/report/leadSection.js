import { esc } from './esc.js';

function rows(profile) {
  const rich = profile.leadContacts?.contacts || [];
  if (rich.length) return rich;
  const lc = profile.leadContacts || {};
  return [
    ...(lc.emails || []).map((value) => ({ value, kind: 'email', role: '', page: '' })),
    ...(lc.phones || []).map((value) => ({ value, kind: 'phone', role: '', page: '' })),
    ...(lc.socials || []).map((value) => ({ value, kind: 'social', role: '', page: '' })),
  ];
}

/** Lead block for the executive report. Empty when the crawl found nothing public. */
export function renderLeadSection(profile) {
  if (!profile?.leadContacts) return '';
  const contacts = rows(profile);
  const bookings = profile.bookingLinks || [];
  if (!contacts.length && !bookings.length && !profile.companyName) return '';
  const notSales = (value) => /privacy|complaint|regulator|ico\.|gdpr|abuse@|legal@|dpo@/i.test(value);
  const cards = contacts.map((c) => {
    const label = c.kind === 'phone' ? 'Phone' : c.kind === 'social' ? 'Social' : 'Email';
    const note = notSales(c.value) ? ' · not a sales contact' : '';
    const role = c.role ? ` · ${esc(c.role)}` : '';
    const page = c.page ? `<span class="muted sm">${esc(c.page)}</span>` : '';
    const body = c.kind === 'social'
      ? `<a href="${esc(c.value)}" target="_blank" rel="noopener">${esc(c.value)}</a>`
      : `<b>${esc(c.value)}</b>`;
    return `<div><span style="color:var(--muted); font-size:0.75rem; text-transform:uppercase; display:block;">${label}${role}${esc(note)}</span>${body}${page}</div>`;
  }).join('');
  const books = bookings.map((b) => `<div><span class="muted sm">Booking</span><a href="${esc(b)}" target="_blank" rel="noopener">${esc(b)}</a></div>`).join('');
  const heat = Number.isFinite(profile.leadHeat) ? `${profile.leadHeat}/100` : '—';
  const company = profile.companyName ? `<div><span class="muted sm">Company</span><b>${esc(profile.companyName)}</b></div>` : '';
  return `<section class="impact-section">
      <h2>Publicly listed contacts</h2>
      <div class="card contacts">
        <div><span class="muted sm">Lead heat</span><b>${heat}</b></div>
        ${company}
        ${cards}
        ${books}
      </div>
      <p class="muted">These addresses were visible on the audited pages. They are not proof of domain ownership.</p>
    </section>`;
}
