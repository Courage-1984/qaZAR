import fs from 'node:fs';
import { DeleteObjectsCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { ownerSeg, siteHash } from './paths.js';

let built = 0;
export const s3ClientsBuilt = () => built;

/** Local files for Playwright, plus a copy in S3 or Cloudflare R2. */
export class S3Storage {
  driver = 's3';

  constructor(local) {
    this.local = local;
    this.bucket = process.env.S3_BUCKET || '';
    this.client = new S3Client({
      region: process.env.S3_REGION || 'auto',
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: Boolean(process.env.S3_ENDPOINT),
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || '',
        secretAccessKey: process.env.S3_SECRET_KEY || '',
      },
    });
    built += 1;
  }

  get runsRoot() { return this.local.runsRoot; }
  get baselinesRoot() { return this.local.baselinesRoot; }
  getRunDir(id) { return this.local.getRunDir(id); }
  getArtifactPath(id, rel) { return this.local.getArtifactPath(id, rel); }
  getBaselinePath(domain, slug, viewport, ownerId) {
    return this.local.getBaselinePath(domain, slug, viewport, ownerId);
  }
  hasBaseline(domain, slug, viewport, ownerId) {
    return this.local.hasBaseline(domain, slug, viewport, ownerId);
  }

  async put(key, body) {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body }));
  }

  writeArtifact(runId, rel, content) {
    const abs = this.local.writeArtifact(runId, rel, content);
    this.put(`runs/${runId}/${rel}`, content).catch((e) => console.error('s3 put failed', e.message || e));
    return abs;
  }

  async readArtifact(runId, rel) {
    const local = this.local.readArtifact(runId, rel);
    if (local) return local;
    try {
      const out = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: `runs/${runId}/${rel}` }));
      return Buffer.from(await out.Body.transformToByteArray());
    } catch {
      return null;
    }
  }

  hasArtifact(runId, rel) {
    return this.local.hasArtifact(runId, rel);
  }

  async mirrorArtifact(runId, rel) {
    const abs = this.getArtifactPath(runId, rel);
    if (!fs.existsSync(abs)) return;
    await this.put(`runs/${runId}/${rel}`, fs.readFileSync(abs));
  }

  saveBaseline(domain, slug, viewport, sourceFile, ownerId = 'operator') {
    const dest = this.local.saveBaseline(domain, slug, viewport, sourceFile, ownerId);
    const key = `baselines/${ownerSeg(ownerId)}/${siteHash(domain)}/${slug}/${viewport}.png`;
    this.put(key, fs.readFileSync(dest)).catch((e) => console.error('s3 baseline failed', e.message || e));
    return dest;
  }

  deleteRunArtifacts(runId) {
    this.local.deleteRunArtifacts(runId);
    this.deletePrefix(`runs/${runId}/`).catch((e) => console.error('s3 delete failed', e.message || e));
  }

  deleteBaselineSite(ownerId, hash) {
    this.local.deleteBaselineSite(ownerId, hash);
    this.deletePrefix(`baselines/${ownerSeg(ownerId)}/${hash}/`)
      .catch((e) => console.error('s3 baseline delete failed', e.message || e));
  }

  async deletePrefix(prefix) {
    const listed = await this.client.send(new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix }));
    const objects = (listed.Contents || []).map((item) => ({ Key: item.Key }));
    if (!objects.length) return;
    await this.client.send(new DeleteObjectsCommand({ Bucket: this.bucket, Delete: { Objects: objects } }));
  }
}
