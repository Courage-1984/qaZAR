import fs from 'node:fs';
import path from 'node:path';
import { config, runsDir, baselinesDir } from '../config.js';

/**
 * Storage adapter interface for run artifacts and baselines.
 * Local filesystem implementation by default; ready for S3 / Cloudflare R2 drop-in.
 */
class LocalFileStorageAdapter {
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
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  getBaselinePath(domain, slug, viewport) {
    const siteHash = domain.replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9.-]/g, '_');
    return path.join(this.baselinesRoot, siteHash, slug, `${viewport}.png`);
  }

  hasBaseline(domain, slug, viewport) {
    return fs.existsSync(this.getBaselinePath(domain, slug, viewport));
  }

  saveBaseline(domain, slug, viewport, sourceFile) {
    const dest = this.getBaselinePath(domain, slug, viewport);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(sourceFile, dest);
    return dest;
  }
}

export const storage = new LocalFileStorageAdapter();
