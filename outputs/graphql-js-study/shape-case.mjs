import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';

const c = JSON.parse(process.argv[2]);
const g = await import(c.variant === 'compact' ? '../../work/graphql-js-pr/src/index.ts' : '../../work/graphql-js-study/src/index.ts');
const gc = globalThis.Bun ? () => Bun.gc(true) : () => global.gc();
const names = Array.from({ length: c.width }, (_, i) => `f${i}`);
const schema = g.buildSchema(`type Query { rows: [Row!]! } type Row { ${names.map(n => `${n}: Int!`).join(' ')} }`);
const document = g.parse(`{ rows { ${names.join(' ')} } }`);
const row = Object.fromEntries(names.map((n, i) => [n, i]));
const execute = () => g.execute({ schema, document, rootValue: globalThis.studyInput });
globalThis.studyInput = { rows: Array.from({ length: 20 }, () => ({ ...row })) };
for (let i = 0; i < 100; i++) await execute();
globalThis.studyInput = undefined;
await new Promise(r => setTimeout(r, 0));
gc(); gc();
const idle = process.memoryUsage();
globalThis.studyInput = { rows: Array.from({ length: c.rows }, () => ({ ...row })) };
await new Promise(r => setTimeout(r, 0));
gc(); gc();
const inputReady = process.memoryUsage();
const cpu = process.cpuUsage(), start = performance.now();
globalThis.studyResult = execute();
const executionMs = performance.now() - start;
assert(!globalThis.studyResult.errors);
const executed = process.memoryUsage();
let encoded = Buffer.from(JSON.stringify(globalThis.studyResult));
const bytes = encoded.length, sha256 = createHash('sha256').update(encoded).digest('hex');
const responseMs = performance.now() - start, responseCpu = process.cpuUsage(cpu);
const serialized = process.memoryUsage();
encoded = undefined;
await new Promise(r => setTimeout(r, 0));
gc(); gc();
const retained = process.memoryUsage();
assert.equal(globalThis.studyResult.data.rows.length, c.rows);
for (const result of globalThis.studyResult.data.rows) {
  assert.equal(Object.getPrototypeOf(result), null);
  assert.equal(Object.keys(result).length, c.width);
}
assert.notEqual(globalThis.studyResult.data.rows[0], globalThis.studyResult.data.rows[1]);
globalThis.studyResult = globalThis.studyInput = undefined;
await new Promise(r => setTimeout(r, 0));
gc(); gc();
const released = process.memoryUsage();
console.log(JSON.stringify({ config: c, versions: process.versions, idle, inputReady, executed, serialized, retained, released,
  executionMs, responseMs, cpuMs: (responseCpu.user + responseCpu.system) / 1000, bytes, sha256,
  addedHeap: Math.max(executed.heapUsed, serialized.heapUsed) - idle.heapUsed,
  retainedOutputHeap: retained.heapUsed - inputReady.heapUsed,
  peakRss: process.resourceUsage().maxRSS * 1024 }));
