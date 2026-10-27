import test from 'node:test';
import assert from 'node:assert/strict';

test('local storage is the default and no S3 client is built', async () => {
  delete process.env.STORAGE_DRIVER;
  const { storage } = await import('../storage/storageAdapter.js');
  const { s3ClientsBuilt } = await import('../storage/s3Storage.js');
  assert.equal(storage.driver, 'local');
  assert.equal(s3ClientsBuilt(), 0);
});
