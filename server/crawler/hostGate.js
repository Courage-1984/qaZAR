import { config } from '../config.js';

const lanes = new Map();
const remembered = new Map();

function gapMs(origin, robotsDelaySec) {
  if (robotsDelaySec != null) remembered.set(origin, Number(robotsDelaySec) || 0);
  const sec = remembered.get(origin) || 0;
  const bounded = Math.min(Math.max(sec, config.hostGapSec), config.hostGapCapSec);
  return bounded * 1000;
}

/** Wait for this origin's crawl gap. Call the returned function when the fetch finishes. */
export async function waitForHost(origin, robotsDelaySec, deps = {}) {
  const sleep = deps.sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const now = deps.now || Date.now;
  let lane = lanes.get(origin);
  if (!lane) {
    lane = { active: 0, wait: [], last: 0 };
    lanes.set(origin, lane);
  }
  if (lane.active >= config.hostInflight) {
    await new Promise((resolve) => lane.wait.push(resolve));
  }
  lane.active += 1;
  const gap = gapMs(origin, robotsDelaySec);
  const stamp = now();
  const wait = lane.last ? Math.max(0, lane.last + gap - stamp) : 0;
  lane.last = stamp + wait;
  if (wait) await sleep(wait);
  return () => {
    lane.active -= 1;
    const next = lane.wait.shift();
    if (next) next();
  };
}

export function resetHostGate() {
  lanes.clear();
  remembered.clear();
}
