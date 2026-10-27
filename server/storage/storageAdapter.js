import fs from 'node:fs';
import path from 'node:path';
import { runsDir, baselinesDir } from '../config.js';
import { S3Storage } from './s3Storage.js';
import { ownerSeg, siteHash } from './paths.js';

export { ownerSeg, siteHash };

/**
 * Storage adapter. Local disk by default. STORAGE_DRIVER=s3 selects S3 or R2.
 * Baselines live under baselines/<owner>/<siteHash>/…
 */
class LocalFileStorageAdapter {
  driver = 'local';
  get runsRoot() { return runsDir(); }
  get baselinesRoot() { return baselinesDir(); }

  constructor() {
    fs.mkdirSync(this.runsRoot, { recursive: true });
    fs.mkdirSync(this.baselinesRoot, { recursive: true });
  }

  getRunDir(runId) {
    return path.join(this.runsRoot, runId);
  }

  getArtifactPath(runId, relPath) {
    return path.join(this.getRunDir(runId), relPath);
  }

  writeArtifact(runId, relPath, content) {
    const absPath = this.getArtifactPath(runId, relPath);
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, content);
    return absPath;
  }

  readArtifact(runId, relPath) {
    const absPath = this.getArtifactPath(runId, relPath);
    if (!fs.existsSync(absPath)) return null;
    return fs.readFileSync(absPath);
  }

  hasArtifact(runId, relPath) {
    return fs.existsSync(this.getArtifactPath(runId, relPath));
  }

  deleteRunArtifacts(runId) {
    const dir = this.getRunDir(runId);
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  }

  getBaselinePath(domain, slug, viewport, ownerId = 'operator') {
    return path.join(this.baselinesRoot, ownerSeg(ownerId), siteHash(domain), slug, `${viewport}.png`);
  }

  mirrorArtifact() {}

  deleteBaselineSite(ownerId, hash) {
    const dir = path.join(this.baselinesRoot, ownerSeg(ownerId), hash);
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  }

  hasBaseline(domain, slug, viewport, ownerId = 'operator') {
    return fs.existsSync(this.getBaselinePath(domain, slug, viewport, ownerId));
  }

  saveBaseline(domain, slug, viewport, sourceFile, ownerId = 'operator') {
    const dest = this.getBaselinePath(domain, slug, viewport, ownerId);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(sourceFile, dest);
    return dest;
  }
}

export function createStorage() {
  const local = new LocalFileStorageAdapter();
  if (process.env.STORAGE_DRIVER === 's3') return new S3Storage(local);
  return local;
}

export const storage = createStorage();
