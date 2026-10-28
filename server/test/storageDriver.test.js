import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveStorageDriver, shouldBuildS3 } from '../storage/storageDriver.js';

test('local storage is the default and no S3 client is built', async () => {
  delete process.env.STORAGE_DRIVER;
  const { storage } = await import('../storage/storageAdapter.js');
  const { s3ClientsBuilt } = await import('../storage/s3Storage.js');
  assert.equal(storage.driver, 'local');
  assert.equal(s3ClientsBuilt(), 0);
});

test('resolveStorageDriver only enables S3 when STORAGE_DRIVER=s3', () => {
  assert.equal(resolveStorageDriver({}), 'local');
  assert.equal(resolveStorageDriver({ STORAGE_DRIVER: 'local' }), 'local');
  assert.equal(resolveStorageDriver({ STORAGE_DRIVER: 'S3' }), 's3');
  assert.equal(shouldBuildS3({ STORAGE_DRIVER: 's3' }), true);
  assert.equal(shouldBuildS3({}), false);
});
