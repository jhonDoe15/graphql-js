# Compact GraphQL.js result maps: source PR evidence

Candidate: `11f2b7ad49bf42d31021609dd9b36518ac14bda8`.
Base: `c93662d3c1e6ad71b31e5926319998abf1378db7` (`17.x.x`).
Node 24.22.1 / V8 13.6.233.17-node.58, Windows x64 (verified against raw trial metadata; an earlier draft copied the prototype's 24.19.0 label).

This branch preserves evidence separately from the four-file source PR. Benchmarks import the real candidate and base source trees; no source transformation or promise/executor overlay is used.

## Results

| Series | Fresh pairs | Added-heap reduction | RSS reduction | Response elapsed reduction | Execution-only reduction |
| --- | ---: | ---: | ---: | ---: | ---: |
| 25 MB sync pilot | 3 | 55.40% | 35.49% | 21.79% | -9.40% |
| 100 MB sync confirmation | 5 | 53.35% | 43.91% | 28.00% | 10.51% |
| 3 MB promise-heavy | 3 | 7.83% | 4.01% | 4.82% | 0.28% |

Percentages are medians of paired reductions, not ratios of independent medians. Positive is improvement. All 100 MB pairs improve the tabled metrics. CPU timings vary more than memory. The async case returns a promise for every scalar; its median CPU gain is 4.98%, with one pair regressing. Claims apply only to these fixtures and runtime.

At 100 MB, base/PR independent medians are: idle 13.663/13.672 MB, input-ready 219.339/219.340 MB, maximum observed heap 1,147.879/542.810 MB, request-added heap 1,134.215/529.138 MB, peak RSS 1,413.341/792.789 MB. The response contains 4,285,713 completed row objects. SHA-256 is `cc54d23f8c8d9a3b90acb39649166ad132d85296c09ffded785341ec00daa2d3`.

## Method and bounds

Twenty small warmups, then forced-GC idle and parsed-input-ready baselines. Input parsing and temporary parser stack values expire before timing; input stays live through output encoding. The measured response interval includes execution, JSON serialization, Buffer encoding and hashing. Execution-only timing is separate. Heap checkpoints can miss transient peaks; process-lifetime RSS includes parsing, startup and the guard worker. Buffers are external memory rather than `heapUsed`.

One request per fresh process, alternating AB/BA pairs, no simultaneous tests/builds/profilers, old space 2813 MiB, semi-space 16 MiB. Guard: 2.5 GiB RSS / 3 GiB free RAM; launch requires 6.5 GB free; 240-second timeout. No guard fired. The source candidate passed the same predeclared pilot gate as the earlier prototype: >30% median request-added-heap improvement and no >3% median response CPU/elapsed regression before the 100 MB confirmation. The execution-only pilot regression is retained and disclosed.

## Reproduce

Run in the root of this evidence branch checkout, with Node 24.22.1. The benchmark source files use the workspace paths below; create separate base and candidate checkouts without changing this evidence branch:

```sh
git clone https://github.com/graphql/graphql-js.git work/graphql-js-study
git -C work/graphql-js-study checkout c93662d3c1e6ad71b31e5926319998abf1378db7
git clone https://github.com/jhonDoe15/graphql-js.git work/graphql-js-pr
git -C work/graphql-js-pr checkout 11f2b7ad49bf42d31021609dd9b36518ac14bda8
npm ci --ignore-scripts --prefix work/graphql-js-study
npm ci --ignore-scripts --prefix work/graphql-js-pr
node outputs/graphql-js-study/fixture.mjs 25000000 work/fixtures/dense-25000000.json 8 1
node outputs/graphql-js-study/fixture.mjs 100000000 work/fixtures/dense-100000000.json 8 1
node outputs/graphql-js-study/fixture.mjs 3000000 outputs/graphql-js-study/dense-3000000.json 8 1
node outputs/graphql-js-study/source-pr-run.mjs 25000000 3 reproduction-pilot
node outputs/graphql-js-study/source-pr-run.mjs 100000000 5 reproduction-confirmation
node outputs/graphql-js-study/source-pr-run.mjs 3000000 3 reproduction-async true
node outputs/graphql-js-study/analyze.mjs outputs/graphql-js-study/reproduction-confirmation.json
```

Run serially. New result names are required: the runner refuses to overwrite results, validates exact bytes/SHA256, and fingerprints source files before each trial. Raw events and summaries are the `pr-pilot25`, `pr-confirm100` and `pr-async3` JSON files beside this document. All sizes are decimal MB unless explicitly marked MiB/GiB.

## Width and engine assessment

[Additional width/engine evidence](SHAPE-EVIDENCE.md) covers 40 fresh pairs at widths 1, 8, 32 and 100 on Node 24.22.1 and Bun 1.3.14. Node retains about 79% less output heap for 1/8-field objects, but no less for 32/100-field objects. Bun shows no consistent memory benefit. The report retains the observed timing and RSS regressions; the dense 100 MB result should not be generalized to every selection or engine.

## Validation limits

On a clean Linux checkout, 3,112 source tests pass with 100% line/branch/function coverage; 360 examples and 11 fuzz tests pass. Repository lint, types, full formatting, spelling, npm/Deno builds and the Deno package check pass. The integration harness passes 17 cases and fails 12 at unavailable Docker launches; all 15 subsequent direct Node/Bun/Deno commands pass. Full container/runtime-matrix coverage remains for CI. [Validation details and logs](VALIDATION.md), [independent review](REVIEW.md).

Earlier Windows full-suite Deno-path and CRLF formatting issues do not reproduce on the clean Linux checkout. No unrelated platform changes are included in the source PR.
