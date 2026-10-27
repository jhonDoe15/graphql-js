# Width and engine assessment

Exact source candidate `11f2b7ad49bf42d31021609dd9b36518ac14bda8` against `c93662d3c1e6ad71b31e5926319998abf1378db7`, Windows x64. Node **24.22.1**, V8 **13.6.233.17-node.58**; Bun **1.3.14** (JavaScriptCore). The Node/V8 labels are read from the raw process metadata. Bun's compatibility `process.versions.v8` value does not identify its actual engine.

Five fresh AB/BA pairs per engine/width. Each fixture selects integer fields from a flat list: 100,000 rows for widths 1 and 8, 31,250 rows for width 32, 10,000 rows for width 100. Responses range from 0.90 to 8.82 MB. All 40 pairs have matching response bytes and SHA-256. Every output row has a null prototype and the expected field count; sibling results are independent. These fixtures complement, rather than replace, the larger nested response trials.

Positive percentages below mean reduction; negative means regression. Values are medians of paired reductions.

| Engine | Fields | Request-added heap | Peak RSS | Execution elapsed | Execution + encoding/hash elapsed |
| --- | ---: | ---: | ---: | ---: | ---: |
| Node 24.22.1 | 1 | 34.00% | 10.48% | -4.36% | 14.24% |
| Node 24.22.1 | 8 | 55.12% | 21.96% | 13.78% | 19.97% |
| Node 24.22.1 | 32 | 2.77% | -0.18% | -5.56% | -2.04% |
| Node 24.22.1 | 100 | -2.00% | -0.05% | -1.51% | 0.28% |
| Bun 1.3.14 | 1 | -0.53% | 0.76% | -4.02% | -3.98% |
| Bun 1.3.14 | 8 | -0.04% | 0.82% | -3.36% | -3.16% |
| Bun 1.3.14 | 32 | 0.01% | -5.36% | 5.90% | 4.88% |
| Bun 1.3.14 | 100 | -0.00% | 0.65% | -1.60% | -3.20% |

The Node retained-output heap delta after forced GC decreases **78.72% / 79.77%** for widths 1 / 8, but is effectively unchanged for widths 32 / 100. This supports a small-object storage benefit, not a universal object-memory benefit. Node width-32 timing regresses on four of five pairs; Bun width-8 execution and total elapsed regress on all five pairs. Bun width-32 RSS increases on four of five pairs. These tradeoffs should be reviewed before merge, not hidden behind the favorable 100 MB result.

Bun's post-GC heap readings vary markedly between runs and sometimes exceed the no-GC checkpoint readings. Do not infer a retained-object saving from those Bun deltas. The stable headline is that this matrix establishes **no consistent Bun memory benefit**. Timings are short (approximately 70–600 ms execution), have outliers, and are descriptive results rather than confidence intervals or cross-engine speed comparisons.

## Protocol and reproduction

100 small warmups; forced GC before idle and input-ready checkpoints; caller-owned input remains live. No forced GC or profiler in the timed execution/serialization/encoding/hash interval. Heap is read at execution/encoding checkpoints, not continuously; RSS is process-lifetime high water. Post-GC retained measurements are outside timing. Node flags: `--expose-gc --max-old-space-size=2813 --max-semi-space-size=16`; Bun uses `Bun.gc(true)` at baseline/retention checkpoints and its default heap policy. Launch requires 6.5 GB free RAM; each child has a 120-second timeout, and fixtures are bounded to at most one million scalar fields. No build, test or other benchmark ran concurrently with these pairs.

Use the base/candidate checkouts described in README. From this evidence checkout root:

```sh
node outputs/graphql-js-study/shape-run.mjs node /absolute/path/to/node reproduction-shapes-node
node outputs/graphql-js-study/shape-run.mjs bun /absolute/path/to/bun reproduction-shapes-bun
node outputs/graphql-js-study/shape-analyze.mjs outputs/graphql-js-study/reproduction-shapes-node.json outputs/graphql-js-study/reproduction-shapes-bun.json
```

The runner refuses existing result files, fingerprints source/scripts, and records the actual runtime versions in every child result. Raw runs and paired summaries are `pr-shapes-node24` and `pr-shapes-bun`. No source change or engine-detection branch was added in response to this matrix; the PR remains a small allocation change for maintainer assessment.
