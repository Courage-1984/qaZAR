/** Map request auth to run-store owner scope. */

/** Key callers are scoped to their ownerId; pages/operator see everything. */
export function ownerScopeFromAuth(auth) {
  return auth?.via === 'key' ? auth.ownerId : null;
}

export function createOwnerId(auth) {
  return auth?.ownerId || 'operator';
}
