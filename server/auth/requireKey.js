/** Express helpers that require a partner/operator bearer key. */

export function requireKeyAuth(req, res) {
  if (req.auth?.via !== 'key') {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}
