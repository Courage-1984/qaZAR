/** Run `fn` over `items` with at most `n` calls in flight. */
export async function mapPool(items, n, fn) {
  const list = [...items];
  if (!list.length) return;
  const width = Math.max(1, Math.min(n | 0 || 1, list.length));
  let cursor = 0;
  await Promise.all(
    Array.from({ length: width }, async () => {
      while (cursor < list.length) await fn(list[cursor++]);
    }),
  );
}

/**
 * Visit a mutable queue in waves of `width`.
 * Items pushed during a wave run in a later wave, so a crawl stays breadth-first.
 * `keepGoing` is checked between waves.
 */
export async function drainWaves(queue, width, visit, keepGoing = () => true) {
  const n = Math.max(1, width | 0 || 1);
  while (queue.length && keepGoing()) {
    const batch = queue.splice(0, n);
    await Promise.all(batch.map((item) => visit(item)));
  }
}
