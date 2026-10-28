import test from 'node:test';
import assert from 'node:assert/strict';
import { TUNNEL_READY_MS, cloudflaredTunnelArgs, discoveryResponse } from '../tunnelArgs.js';

test('cloudflaredTunnelArgs and TUNNEL_READY_MS pin spawn contract', () => {
  assert.deepEqual(cloudflaredTunnelArgs(8787), ['tunnel', '--url', 'http://localhost:8787']);
  assert.equal(TUNNEL_READY_MS, 15_000);
  assert.deepEqual(discoveryResponse({ localIp: '1.2.3.4', port: 9 }), { localIp: '1.2.3.4', port: 9 });
});
