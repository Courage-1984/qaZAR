import { deleteBaselineMeta, getTier, listBaselineMeta } from '../storage/db.js';
import { storage } from '../storage/storageAdapter.js';

const DAY = 24 * 60 * 60 * 1000;

/** Drop free baselines older than 14 days and pro baselines older than 365. Operator rows stay. */
export async function pruneBaselines(now = Date.now()) {
  for (const row of await listBaselineMeta()) {
    if (row.owner_id === 'operator') continue;
    const days = (await getTier(row.owner_id)) === 'pro' ? 365 : 14;
    if (now - row.updated_at < days * DAY) continue;
    storage.deleteBaselineSite(row.site_hash);
    await deleteBaselineMeta(row.site_hash);
  }
}
