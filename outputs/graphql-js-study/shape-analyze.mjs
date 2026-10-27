import { readFileSync, writeFileSync } from 'node:fs';
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
for (const path of process.argv.slice(2)) {
  const raw = JSON.parse(readFileSync(path));
  const rows = [1, 8, 32, 100].map(width => {
    const pairs = Array.from({ length: 5 }, (_, rep) => {
      const pick = variant => raw.events.find(r => r.config.width === width && r.config.rep === rep && r.config.variant === variant);
      return { base: pick('base'), compact: pick('compact') };
    });
    return { width, rows: pairs[0].base.config.rows, bytes: pairs[0].base.bytes,
      metrics: Object.fromEntries(['executionMs', 'responseMs', 'cpuMs', 'addedHeap', 'retainedOutputHeap', 'peakRss'].map(metric => {
        const reductions = pairs.map(p => 100 * (1 - p.compact[metric] / p.base[metric]));
        return [metric, { base: median(pairs.map(p => p.base[metric])), compact: median(pairs.map(p => p.compact[metric])), medianPairedReduction: median(reductions), min: Math.min(...reductions), max: Math.max(...reductions) }];
      })) };
  });
  const summary = { engine: raw.engine, versions: raw.events[0].versions, rows };
  writeFileSync(path.replace(/\.json$/, '.summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
}
