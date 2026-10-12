// Dedicated demo admission queue, not a replacement for the Partner API's policies.
// One process + one persistent directory. No automatic paid POST replay.
import { mkdir, open, readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';

const terminal = new Set(['succeeded', 'failed', 'upload_failed']);
const uncertain = new Set(['submitting', 'needs_review']);
const statuses = new Set([...terminal, ...uncertain, 'uploading', 'queued', 'running']);
export class QueueError extends Error {
  constructor(message, status = 409) { super(message); this.status = status; }
}

export class DemoQueue {
  static async open({ directory, binding, apiFor, gapMs = 10000, maxPending = 25, now = Date.now }) {
    if (!Number.isInteger(gapMs) || gapMs < 1000 || !Number.isInteger(maxPending) || maxPending < 1) throw new Error('Invalid queue configuration.');
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const lockPath = join(directory, 'owner.lock');
    const lock = await open(lockPath, 'wx', 0o600).catch(() => { throw new Error('Demo queue is locked. Stop; reconcile its owner before restarting.'); });
    let journal;
    try {
      await lock.writeFile(JSON.stringify({ pid: process.pid })); await lock.sync();
      const path = join(directory, 'receipts.jsonl');
      let saved = '';
      try { saved = await readFile(path, 'utf8'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
      const rows = saved.trim() ? saved.trimEnd().split('\n').map(line => JSON.parse(line)) : [];
      if (rows.length && rows[0].binding !== binding) throw new Error('Queue belongs to another integration/environment. Do not reuse its directory.');
      journal = await open(path, 'a', 0o600);
      const queue = new DemoQueue({ directory, binding, apiFor, gapMs, maxPending, now, journal, lock, lockPath });
      for (const row of rows.slice(1)) {
        const entry = row.entry;
        if (!entry?.id || !entry?.owner || !statuses.has(entry?.status)
          || (entry.submittedAt !== undefined && (!Number.isFinite(entry.submittedAt) || entry.submittedAt < 0))
          || (['queued', 'submitting', 'running'].includes(entry.status) && (!entry.payload?.personalAssetId || !entry.payload?.productAssetId))
          || (entry.status === 'running' && (!entry.jobId || !entry.idempotencyKey || entry.submittedAt === undefined))) throw new Error('Invalid queue receipt. Stop and reconcile.');
        queue.entries.set(row.entry.id, row.entry);
        queue.lastSubmittedAt = Math.max(queue.lastSubmittedAt, row.entry.submittedAt ?? 0);
      }
      if (!rows.length) { await journal.writeFile(JSON.stringify({ binding }) + '\n'); await journal.sync(); }
      // Interrupted uploads are never repeated; provisional IDs remain in the receipt.
      for (const entry of queue.entries.values()) if (entry.status === 'uploading') await queue.change(entry.id, { status: 'upload_failed' });
      return queue;
    } catch (error) {
      await journal?.close(); await lock.close(); await unlink(lockPath); throw error;
    }
  }

  constructor(options) {
    Object.assign(this, options);
    this.entries = new Map(); this.lastSubmittedAt = 0; this.serial = Promise.resolve(); this.busy = false;
  }
  exclusive(action) {
    const task = this.serial.then(() => { if (this.fault || this.closed) throw new Error('Queue unavailable.'); return action(); });
    this.serial = task.catch(() => {}); return task;
  }
  async write(entry) {
    try { await this.journal.writeFile(JSON.stringify({ entry }) + '\n'); await this.journal.sync(); }
    catch (error) { this.fault = true; throw error; }
    this.entries.set(entry.id, entry);
    this.lastSubmittedAt = Math.max(this.lastSubmittedAt, entry.submittedAt ?? 0);
    return entry;
  }
  change(id, patch) { return this.exclusive(() => this.write({ ...this.entries.get(id), ...patch })); }
  get blocked() { return this.fault || [...this.entries.values()].some(e => uncertain.has(e.status)); }
  owned(id, owner) {
    const entry = this.entries.get(id);
    if (!entry || entry.owner !== owner) throw new QueueError('Request not found.', 404);
    return entry;
  }
  view(id, owner) {
    const entry = this.owned(id, owner);
    const waiting = [...this.entries.values()].filter(e => e.status === 'queued');
    return { id, status: entry.status, position: entry.status === 'queued' ? waiting.findIndex(e => e.id === id) + 1 : null, queuePaused: Boolean(this.blocked), gapSeconds: this.gapMs / 1000 };
  }
  async accept({ id, owner, fingerprint }, upload) {
    const created = await this.exclusive(async () => {
      if (this.entries.has(id)) {
        if (this.owned(id, owner).fingerprint !== fingerprint) throw new QueueError('Request ID already has different inputs.');
        return false;
      }
      if (this.blocked) throw new QueueError('Demo queue is paused for review.', 503);
      const pending = [...this.entries.values()].filter(e => !terminal.has(e.status));
      if (pending.some(e => e.owner === owner)) throw new QueueError('You already have an active demo request.');
      if (pending.length >= this.maxPending) throw new QueueError('Demo queue is full. Try later.', 429);
      await this.write({ id, owner, fingerprint, status: 'uploading', createdAt: this.now() }); return true;
    });
    if (created) {
      try {
        const payload = await upload((field, value) => this.change(id, { [field]: value }));
        if (!payload.personalAssetId || !payload.productAssetId) throw new Error('Missing completed asset IDs.');
        await this.change(id, { payload, status: 'queued' });
      } catch { await this.change(id, { status: 'upload_failed' }); }
    }
    return this.view(id, owner);
  }
  async tick() {
    if (this.busy || this.closed || this.blocked) return;
    this.busy = true;
    try {
      const active = [...this.entries.values()].find(e => e.status === 'running');
      if (active) {
        try {
          const job = await this.apiFor(active.owner).request(`/dressme/jobs/${encodeURIComponent(active.jobId)}`);
          if (job.id !== active.jobId || !['queued', 'running', 'succeeded', 'failed'].includes(job.status) || job.simulated === true) throw new Error('Unexpected real job response.');
          if (job.status === 'succeeded' || job.status === 'failed') {
            // An upstream 'failed' submission_unconfirmed is still uncertain, not safe to replay.
            await this.change(active.id, { status: job.error?.code === 'submission_unconfirmed' ? 'needs_review' : job.status, ...(job.result?.id ? { resultId: job.result.id } : {}) });
          }
        } catch { await this.change(active.id, { status: 'needs_review' }); }
        return;
      }
      if (this.now() < this.lastSubmittedAt + this.gapMs) return;
      const next = [...this.entries.values()].find(e => e.status === 'queued');
      if (!next) return;
      // Persist identity, exact payload and start time BEFORE the only paid POST.
      await this.change(next.id, { status: 'submitting', submittedAt: this.now(), idempotencyKey: next.id });
      // File sync may be slow. Measure the gap from the actual call, not before I/O.
      const submittedAt = this.now();
      this.lastSubmittedAt = submittedAt;
      try {
        const job = await this.apiFor(next.owner).createJob(next.payload, next.id);
        if (typeof job.id !== 'string' || !job.id || job.simulated === true) throw new Error('Missing real job receipt.');
        await this.change(next.id, { status: 'running', jobId: job.id, submittedAt });
      } catch { await this.change(next.id, { status: 'needs_review', submittedAt }); }
    } finally { this.busy = false; }
  }
  async close() {
    if (this.busy) throw new Error('Stop the dispatcher and await in-flight work before closing.');
    await this.serial; this.closed = true;
    await this.journal.close(); await this.lock.close(); await unlink(this.lockPath);
  }
}
