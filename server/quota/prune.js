import { deleteBaselineMeta, getTier, listBaselineMeta } from '../storage/db.js';
import { storage } from '../storage/storageAdapter.js';
import { shouldPruneBaseline } from './baselineRetention.js';

/** Drop free baselines older than 14 days and pro baselines older than 365. Operator rows stay. */
export async function pruneBaselines(now = Date.now()) {
  for (const row of await listBaselineMeta()) {
    if (row.owner_id === 'operator') continue;
    const tier = await getTier(row.owner_id);
    if (!shouldPruneBaseline({
      ownerId: row.owner_id,
      tier,
      updatedAt: row.updated_at,
      now,
    })) continue;
    storage.deleteBaselineSite(row.owner_id, row.site_hash);
    await deleteBaselineMeta(row.owner_id, row.site_hash);
  }
}
