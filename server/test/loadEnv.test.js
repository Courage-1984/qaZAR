import test from 'node:test';
import assert from 'node:assert/strict';
import { applyEnvLines, parseEnvLine } from '../loadEnv.js';

test('parseEnvLine skips comments and unwraps quotes', () => {
  assert.equal(parseEnvLine(''), null);
  assert.equal(parseEnvLine('# LOGI_INK_API_SECRET=hidden'), null);
  assert.deepEqual(parseEnvLine('LOGI_INK_OWNER_ID=logi-ink'), { key: 'LOGI_INK_OWNER_ID', val: 'logi-ink' });
  assert.deepEqual(parseEnvLine('MAIL_FROM="qa@example.com"'), { key: 'MAIL_FROM', val: 'qa@example.com' });
});

test('applyEnvLines does not override existing values', () => {
  const env = { LOGI_INK_API_SECRET: 'already' };
  applyEnvLines(['LOGI_INK_API_SECRET=new', 'AGENCY_INBOX=desk@example.com'], env);
  assert.equal(env.LOGI_INK_API_SECRET, 'already');
  assert.equal(env.AGENCY_INBOX, 'desk@example.com');
});
