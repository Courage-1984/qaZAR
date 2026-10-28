import { config } from '../config.js';
import { resolveExplicitPages } from '../crawler/explicitPages.js';
import {
  assertPublicUrl, isMetadataHost, isPrivateIp, parseProspectEmail,
} from './ssrf.js';

export { assertPublicUrl, isMetadataHost, isPrivateIp, parseProspectEmail };

export async function validateRunInput(body = {}, { publicCaller = false, pageCap = null } = {}) {
  const domain = await assertPublicUrl(String(body.domain || '').trim(), 'domain');
  let sitemap_url = publicCaller ? '' : String(body.sitemap_url || '').trim();
  if (sitemap_url) sitemap_url = await assertPublicUrl(sitemap_url, 'sitemap_url');
  const n = Number.parseInt(body.max_pages ?? (publicCaller ? config.publicMaxPages : 10), 10);
  if (!Number.isFinite(n) || n < 1) throw new Error('max_pages must be a positive integer');
  const listed = publicCaller ? [] : resolveExplicitPages(domain, body.pages);
  for (const page of listed) await assertPublicUrl(page, 'page');
  const pages = listed.length ? listed : null;
  const cap = pageCap ?? (publicCaller ? config.publicMaxPages : config.maxPagesCap);
  return {
    domain,
    sitemap_url: pages ? null : sitemap_url || null,
    max_pages: pages ? Math.min(pages.length, cap) : Math.min(n, cap),
    renderJs: publicCaller ? false : Boolean(body.renderJs),
    pages,
    publicCaller,
    prospectEmail: parseProspectEmail(body.prospectEmail),
    prospectName: String(body.prospectName || '').slice(0, 120),
    source: String(body.source || '').slice(0, 40),
  };
}
