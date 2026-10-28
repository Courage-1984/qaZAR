/** Shape robots.txt parse results for the crawl queue. */

export function emptyRobotRules() {
  return { disallows: [], allows: [], crawlDelay: 0 };
}

export function robotRulesFromParsed(parsed) {
  return {
    disallows: parsed?.disallows || [],
    allows: parsed?.allows || [],
    crawlDelay: parsed?.crawlDelay || 0,
  };
}

export function robotsLoadOk(parsed) {
  return { hasRobotsTxt: true, robotRules: robotRulesFromParsed(parsed) };
}

export function robotsLoadMiss() {
  return { hasRobotsTxt: false, robotRules: emptyRobotRules() };
}
