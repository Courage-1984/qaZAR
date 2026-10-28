/** First line of an error message (or stringified value) for run/email status fields. */
export function firstLine(err) {
  return String(err?.message || err).split('\n')[0];
}
