/** Resolve on-disk vs S3/R2 storage from env. */

export function resolveStorageDriver(env = process.env) {
  return String(env.STORAGE_DRIVER || '').toLowerCase() === 's3' ? 's3' : 'local';
}

export function shouldBuildS3(env = process.env) {
  return resolveStorageDriver(env) === 's3';
}
