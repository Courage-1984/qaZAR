import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../config.js';
import { resetHostGate, waitForHost } from '../crawler/hostGate.js';

test('crawl-delay is waited and a huge delay is capped', async () => {
  resetHostGate();
  const slept = [];
  const sleep = (ms) => { slept.push(ms); return Promise.resolve(); };
  const origin = 'https://delay.example';
  await waitForHost(origin, 2, { sleep, now: () => 1_000 });
  await waitForHost(origin, 2, { sleep, now: () => 1_000 });
  assert.ok(slept.some((ms) => ms >= 2000));
  resetHostGate();
  const capped = [];
  await waitForHost('https://cap.example', 100, { sleep: (ms) => { capped.push(ms); return Promise.resolve(); }, now: () => 5_000 });
  await waitForHost('https://cap.example', 100, { sleep: (ms) => { capped.push(ms); return Promise.resolve(); }, now: () => 5_000 });
  assert.equal(Math.max(...capped), config.hostGapCapSec * 1000);
});

test('only two fetches run at once for one host', async () => {
  resetHostGate();
  const origin = 'https://lane.example';
  config.hostInflight = 2;
  const sleep = () => Promise.resolve();
  const a = await waitForHost(origin, 0, { sleep, now: () => 10_000 });
  const b = await waitForHost(origin, 0, { sleep, now: () => 10_000 });
  let third = false;
  const pending = waitForHost(origin, 0, { sleep, now: () => 10_000 }).then((release) => { third = true; return release; });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(third, false);
  a();
  const release = await pending;
  assert.equal(third, true);
  b();
  release();
  config.hostInflight = Number(process.env.HOST_INFLIGHT || 2);
});
