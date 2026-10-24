export const VIEWPORTS = [
  { name: 'ultrawide', width: 2560, height: 1600, touch: false },
  { name: 'fhd', width: 1920, height: 1080, touch: false },
  { name: 'macbook', width: 1512, height: 982, touch: false },
  { name: 'desktop', width: 1440, height: 900, touch: false },
  { name: 'laptop', width: 1100, height: 700, touch: false },
  { name: 'tablet', width: 768, height: 1024, touch: true },
  { name: 'mobile', width: 390, height: 844, touch: true },
];

const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

/** Playwright context options for one viewport. */
export function contextOptions(vp) {
  return {
    viewport: { width: vp.width, height: vp.height },
    hasTouch: vp.touch,
    isMobile: vp.touch,
    deviceScaleFactor: vp.touch ? 2 : 1,
    reducedMotion: 'reduce',
    locale: 'en-US',
    timezoneId: 'UTC',
    ...(vp.touch ? { userAgent: MOBILE_UA } : {}),
  };
}
