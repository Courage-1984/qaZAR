import { db } from './databaseAdapter.js';
import { storage } from './storageAdapter.js';
import { countActiveRuns as countActive } from './db.js';

export const runPath = (id) => storage.getRunDir(id);
export const loadAll = () => db.loadAll();
export const countActiveRuns = () => countActive();
export const createRun = (input, opts) => db.create(input, opts);
export const getRun = (id, opts) => db.get(id, opts);
export const getByShareToken = (token) => db.getByShareToken(token);
export const listRuns = (opts) => db.list(opts);
export const save = (run) => db.save(run);
export const removeRun = (id, opts) => db.delete(id, opts);
export const subscribe = (id, res) => db.subscribe(id, res);
export const broadcast = (id, data) => db.broadcast(id, data);
