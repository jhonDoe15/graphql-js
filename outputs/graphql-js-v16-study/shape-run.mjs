import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { freemem } from 'node:os';
import assert from 'node:assert/strict';
const [engine, executable, tag, baseDir, candidateDir] = process.argv.slice(2);
assert(['node', 'bun'].includes(engine)); assert(/^[a-z0-9-]+$/.test(tag));
const out = resolve('outputs/graphql-js-v16-study'), path = `${out}/${tag}.json`; assert(!existsSync(path));
const files = [out + '/shape-case.mjs', out + '/shape-run.mjs', ...[baseDir, candidateDir].flatMap(dir => ['npmDist/execution/execute.js', 'npmDist/jsutils/promiseForObject.js'].map(p => `${dir}/${p}`)), candidateDir + '/npmDist/jsutils/CompactExecutionResultMap.js'];
const fingerprint = () => Object.fromEntries(files.map(p => [p, createHash('sha256').update(readFileSync(p)).digest('hex')]));
const report = { engine, executable, source: fingerprint(), startedAt: new Date().toISOString(), events: [] };
const save = () => writeFileSync(path, JSON.stringify(report, null, 2));
const env = { ...process.env }; delete env.NODE_OPTIONS; delete env.NODE_V8_COVERAGE; save();
for (const width of [1, 8, 32, 100]) for (let rep = 0; rep < 5; rep++) {
  const pair = [];
  for (const variant of rep % 2 ? ['compact', 'base'] : ['base', 'compact']) {
    assert(freemem() > 6500000000); assert.deepEqual(fingerprint(), report.source);
    const c = { width, rows: Math.min(100000, Math.floor(1000000 / width)), rep, variant, modulePath: `${variant === 'base' ? baseDir : candidateDir}/npmDist/index.js` };
    const args = engine === 'node' ? ['--expose-gc', '--max-old-space-size=2813', '--max-semi-space-size=16'] : [];
    const child = spawnSync(executable, [...args, `${out}/shape-case.mjs`, JSON.stringify(c)], { env, encoding: 'utf8', timeout: 120000, maxBuffer: 1048576 });
    assert.equal(child.status, 0, child.stderr || child.error?.message);
    const result = JSON.parse(child.stdout); report.events.push(result); pair.push(result); save();
  }
  assert.equal(pair[0].bytes, pair[1].bytes); assert.equal(pair[0].sha256, pair[1].sha256);
  console.log(JSON.stringify({ engine, width, rep, executionMs: pair.map(r => r.executionMs) }));
}
report.completedAt = new Date().toISOString(); save();
