import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, dirname, resolve, sep, basename} from 'node:path';
import {spawnSync} from 'node:child_process';
import {buildPublicDownload, publicFiles} from '../src/downloads.mjs';

// This test deliberately stays outside publicFiles so its subprocess cannot recurse.
test('downloaded ZIP runs its agent-discovery tests without borrowing checkout files', async t => {
  const temp = await mkdtemp(join(tmpdir(), 'velox-public-download-test-'));
  const destination = resolve(temp);
  t.after(async () => {
    assert.equal(dirname(destination), resolve(tmpdir()));
    assert.match(basename(destination), /^velox-public-download-test-[a-zA-Z0-9]+$/);
    await rm(destination, {recursive:true, force:true});
  });
  const {bytes} = await buildPublicDownload();
  let offset = 0, files = 0;
  while (bytes.readUInt32LE(offset) === 0x04034b50) {
    assert.equal(bytes.readUInt16LE(offset + 8), 0, 'Expected stored ZIP entries');
    const size = bytes.readUInt32LE(offset + 18);
    const nameLength = bytes.readUInt16LE(offset + 26);
    const extraLength = bytes.readUInt16LE(offset + 28);
    const name = bytes.subarray(offset + 30, offset + 30 + nameLength).toString();
    assert.ok(publicFiles.includes(name));
    const target = resolve(destination, name);
    assert.ok(target.startsWith(destination + sep), 'ZIP path must remain under the test directory');
    const start = offset + 30 + nameLength + extraLength;
    await mkdir(dirname(target), {recursive:true});
    await writeFile(target, bytes.subarray(start, start + size));
    files++;
    offset = start + size;
  }
  assert.equal(files, publicFiles.length);
  assert.equal(bytes.readUInt32LE(offset), 0x02014b50);
  const childEnv = {...process.env};
  // A fresh CLI run must not inherit the parent test runner's IPC context.
  delete childEnv.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', 'test/agent-discovery.test.mjs'], {
    cwd:destination, env:childEnv, encoding:'utf8', timeout:30000,
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /# pass 6/);
});
