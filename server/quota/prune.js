import { deleteBaselineMeta, getTier, listBaselineMeta } from '../storage/sqliteDb.js';
import { storage } from '../storage/storageAdapter.js';

const DAY = 24 * 60 * 60 * 1000;

/** Drop free baselines older than 14 days and pro baselines older than 365. Operator rows stay. */
export function pruneBaselines(now = Date.now()) {
  for (const row of listBaselineMeta()) {
    if (row.owner_id === 'operator') continue;
    const days = getTier(row.owner_id) === 'pro' ? 365 : 14;
    if (now - row.updated_at < days * DAY) continue;
    storage.deleteBaselineSite(row.site_hash);
    deleteBaselineMeta(row.site_hash);
  }
}
