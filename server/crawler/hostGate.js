import { config } from '../config.js';
import { boundedGapSec, gapWaitMs } from './hostGap.js';

const lanes = new Map();
const remembered = new Map();

function gapMs(origin, robotsDelaySec) {
  if (robotsDelaySec != null) remembered.set(origin, Number(robotsDelaySec) || 0);
  const sec = remembered.has(origin) ? remembered.get(origin) : 0;
  return boundedGapSec(sec, config.hostGapSec, config.hostGapCapSec) * 1000;
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
  const wait = gapWaitMs(lane.last, stamp, gap);
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
