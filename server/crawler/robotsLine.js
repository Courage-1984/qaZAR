/** One robots.txt line → field/value, ignoring comments. */

export function robotsLineParts(rawLine) {
  const line = String(rawLine || '').split('#')[0].trim();
  if (!line) return null;
  const idx = line.indexOf(':');
  if (idx < 0) return null;
  return {
    field: line.slice(0, idx).trim().toLowerCase(),
    val: line.slice(idx + 1).trim(),
  };
}

export function isRobotsRuleField(field) {
  return field === 'disallow' || field === 'allow' || field === 'crawl-delay';
}
