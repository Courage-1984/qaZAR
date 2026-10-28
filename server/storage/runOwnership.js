/** Pure owner-scope checks for the SQL run store. */

export function runVisibleToOwner(run, ownerId = null) {
  if (!run) return false;
  if (!ownerId) return true;
  return run.ownerId === ownerId;
}

export function filterRunsByOwner(runs = [], ownerId = null) {
  if (!ownerId) return [...runs];
  return runs.filter((r) => r.ownerId === ownerId);
}

/** Newest-first by createdAt ISO string. */
export function sortRunsNewestFirst(runs = []) {
  return [...runs].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}
