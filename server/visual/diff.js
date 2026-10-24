import fs from 'node:fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

/** Pad a PNG onto a white canvas of the given size. */
function pad(png, w, h) {
  if (png.width === w && png.height === h) return png;
  const out = new PNG({ width: w, height: h });
  out.data.fill(255);
  PNG.bitblt(png, out, 0, 0, png.width, png.height, 0, 0);
  return out;
}

/**
 * Compare two PNG files; write highlighted diff to diffPath.
 * Returns { diffPixels, diffPercent, sizeChanged, width, height }.
 */
export function diffImages(basePath, currentPath, diffPath) {
  const a = PNG.sync.read(fs.readFileSync(basePath));
  const b = PNG.sync.read(fs.readFileSync(currentPath));
  const sizeChanged = a.width !== b.width || a.height !== b.height;
  const w = Math.max(a.width, b.width);
  const h = Math.max(a.height, b.height);
  const pa = pad(a, w, h);
  const pb = pad(b, w, h);
  const diff = new PNG({ width: w, height: h });
  const diffPixels = pixelmatch(pa.data, pb.data, diff.data, w, h, { threshold: 0.1, includeAA: false });
  fs.writeFileSync(diffPath, PNG.sync.write(diff));
  return { diffPixels, diffPercent: (diffPixels / (w * h)) * 100, sizeChanged, width: w, height: h };
}
