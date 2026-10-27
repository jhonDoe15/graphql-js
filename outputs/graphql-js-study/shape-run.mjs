import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { freemem } from 'node:os';
import assert from 'node:assert/strict';

const [engine, executable, tag] = process.argv.slice(2);
assert(['node', 'bun'].includes(engine));
assert(/^[a-z0-9-]+$/.test(tag));
const out = resolve('outputs/graphql-js-study'), path = `${out}/${tag}.json`;
assert(!existsSync(path));
const files = ['outputs/graphql-js-study/shape-case.mjs', 'outputs/graphql-js-study/shape-run.mjs', 'work/graphql-js-pr/src/execution/Executor.ts', 'work/graphql-js-pr/src/jsutils/promiseForObject.ts', 'work/graphql-js-pr/src/jsutils/CompactExecutionResultMap.ts', 'work/graphql-js-study/src/execution/Executor.ts', 'work/graphql-js-study/src/jsutils/promiseForObject.ts'];
const fingerprint = () => Object.fromEntries(files.map(p => [p, createHash('sha256').update(readFileSync(p)).digest('hex')]));
const report = { engine, executable, source: fingerprint(), startedAt: new Date().toISOString(), events: [] };
const save = () => writeFileSync(path, JSON.stringify(report, null, 2));
const env = { ...process.env }; delete env.NODE_OPTIONS; delete env.NODE_V8_COVERAGE;
save();
for (const width of [1, 8, 32, 100]) for (let rep = 0; rep < 5; rep++) {
  const pair = [];
  for (const variant of rep % 2 ? ['compact', 'base'] : ['base', 'compact']) {
    assert(freemem() > 6500000000);
    assert.deepEqual(fingerprint(), report.source);
    const c = { width, rows: Math.min(100000, Math.floor(1000000 / width)), rep, variant };
    const args = engine === 'node' ? ['--expose-gc', '--max-old-space-size=2813', '--max-semi-space-size=16'] : [];
    const child = spawnSync(executable, [...args, `${out}/shape-case.mjs`, JSON.stringify(c)], { env, encoding: 'utf8', timeout: 120000, maxBuffer: 1048576 });
    assert.equal(child.status, 0, child.stderr || child.error?.message);
    const result = JSON.parse(child.stdout);
    report.events.push(result); pair.push(result); save();
  }
  assert.equal(pair[0].bytes, pair[1].bytes); assert.equal(pair[0].sha256, pair[1].sha256);
  console.log(JSON.stringify({ engine, width, rep, results: pair.map(r => ({ variant: r.config.variant, executionMs: r.executionMs, addedHeap: r.addedHeap, retainedOutputHeap: r.retainedOutputHeap })) }));
}
report.completedAt = new Date().toISOString(); save();
