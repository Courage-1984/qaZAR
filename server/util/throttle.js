/**
 * Coalesce frequent async writes: at most one pending timer, serialised runners.
 * `drain()` drops a waiting timer (caller should write a final snapshot) and
 * awaits any in-flight write.
 */
export function createThrottledWriter(write, intervalMs = 400) {
  let last = 0;
  let pending = null;
  let chain = Promise.resolve();

  return {
    schedule() {
      if (pending) return;
      const wait = Math.max(0, intervalMs - (Date.now() - last));
      pending = setTimeout(() => {
        pending = null;
        last = Date.now();
        chain = chain
          .then(write)
          .catch((e) => console.error('throttled write failed', e));
      }, wait);
    },
    async drain() {
      if (pending) {
        clearTimeout(pending);
        pending = null;
      }
      await chain;
    },
  };
}
