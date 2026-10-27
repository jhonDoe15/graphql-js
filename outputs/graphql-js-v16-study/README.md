# GraphQL.js 16.x compact execution-result backport

Candidate: `29685132862c162b97f2838d1a6ebc8309c2c62c`.
Base: `6944e23cf7494ba26492c333dd989575b66914c1` on `16.x.x` (package version 16.14.2).
Companion to [v17 PR #4919](https://github.com/graphql/graphql-js/pull/4919), which is still awaiting maintainer review. This is a candidate for a future 16.x release; no release number or acceptance is promised.

The four-file patch ports the same shared constructor and two allocation replacements to `execution/execute.ts` and `jsutils/promiseForObject.ts`. Tests use 16.x's Mocha conventions and Prettier 2 formatting. There are 85 added lines and two deleted lines; no package version, engine requirement, public export, dependency, mutation-serial path or request-setup map changes. All four Linux candidate source files were SHA-256 matched to the committed Windows checkout after validation. Benchmarks use actual npm builds of base and candidate, without source rewriting or executor overlays.

## Node 20 memory and timing

Ubuntu 20.04 / WSL2 x64, Node **20.19.5**, V8 **11.3.244.8-node.30**. Positive percentages mean improvement; figures are medians of paired reductions, not ratios of independent medians.

| Workload | Fresh pairs | Request-added heap | Peak RSS | Response CPU | Response elapsed | Execution elapsed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 25 MB dense sync | 3 | 49.18% | 34.82% | 34.86% | 20.43% | 14.88% |
| 100 MB dense sync | 5 | 49.38% | 39.71% | 30.62% | 19.26% | 11.66% |
| 3 MB promise-heavy | 3 | 14.09% | 10.92% | 25.42% | 20.85% | 19.17% |

Every pair improves these metrics and has identical response bytes and SHA-256. At 100 MB, independent base/candidate medians are: idle heap **6.192 / 6.194 MB**, input-ready heap **211.909 / 211.912 MB**, execution growth above input-ready **809.048 / 220.855 MB**, maximum observed heap **1,216.974 / 619.073 MB**, request-added heap **1,210.782 / 612.839 MB**, and peak RSS **1,495.646 / 924.029 MB**. Post-release heap returns to approximately 6.43 MB on both sides. Response elapsed medians are 9.906 / 8.129 seconds; execution medians are 7.962 / 6.870 seconds. The 100 MB response contains 4,285,713 completed row objects.

Twenty small warmups precede forced-GC idle and input-ready baselines. The parsed input stays live through response encoding. Execution and execution-plus-JSON/Buffer/hash timing are separate. No forced GC or profiler runs during the measured interval. Heap checkpoints can miss transient peaks; process-lifetime RSS includes parsing, startup and the guard worker. Buffers are external memory. Trials alternate AB/BA in fresh processes and run serially, without concurrent tests/builds. Node flags: `--expose-gc --max-old-space-size=2813 --max-semi-space-size=16`. Guards: 2.5 GiB RSS, 3 GiB free RAM, 6.5 GB required at launch and 240-second child timeout. No guard fired. The pilot exceeded 30% added-heap savings with improved response CPU and elapsed time before the 100 MB confirmation.

## Width and engine tradeoffs

Five fresh pairs for each combination of widths 1/8/32/100 and Node 20.19.5 / Bun 1.2.18. Integer-field flat lists contain 100,000 rows at widths 1/8, 31,250 at width 32 and 10,000 at width 100. All response bytes/hashes match. Results are null-prototype maps with correct field counts and distinct sibling objects. Positive is improvement, negative is regression.

| Engine | Width | Request-added heap | Peak RSS | Execution elapsed | Response elapsed |
| --- | ---: | ---: | ---: | ---: | ---: |
| Node 20 | 1 | 46.19% | 12.10% | 6.45% | 13.78% |
| Node 20 | 8 | 56.60% | 23.88% | 19.24% | 24.81% |
| Node 20 | 32 | 2.03% | -0.63% | -2.82% | -0.84% |
| Node 20 | 100 | -2.45% | -0.21% | -11.55% | -9.03% |
| Bun 1.2.18 | 1 | 1.02% | -0.10% | -1.35% | -1.10% |
| Bun 1.2.18 | 8 | -0.03% | 0.38% | -3.10% | -2.05% |
| Bun 1.2.18 | 32 | 0.01% | -1.29% | -4.92% | -5.10% |
| Bun 1.2.18 | 100 | 0.01% | -0.56% | -9.35% | -6.44% |

Node retained-output heap after GC decreases **78.15% / 79.58%** for widths 1/8 and is effectively unchanged for widths 32/100. Bun has **no consistent substantial memory benefit**; post-GC readings vary and should not be interpreted as a retained-object saving. The Bun timing regressions and short-case Node regression are relevant to stable-release review.

The initial 100-field Node regression prompted a separate five-pair confirmation with **30,000 rows / 26.46 MB**. Execution is **1.05% slower**, total elapsed **0.13% slower**, response CPU **0.36% lower**, and retained output heap unchanged. The larger run does not reproduce the initial 9.03% total-elapsed regression; both results are retained. Short timings, JIT and machine variability limit the precision of these percentages. No engine detection or width threshold was introduced to chase this result.

Shape cases use 100 small warmups, forced-GC idle/input-ready/retained checkpoints, and no GC during execution/encoding/hash timing. RSS is process-lifetime high water, including post-timing checks. The primary matrix is capped at one million scalar fields; the targeted confirmation uses three million. Each child has a 120-second timeout and launch requires 6.5 GB free RAM. Bun uses its default heap policy and `Bun.gc(true)` for baseline/retention checkpoints. Do not compare absolute Node and Bun heap figures as equivalent accounting.

## Validation

- **2,014 tests pass on Node 20.19.5 and Node 12.22.12** (the oldest supported major).
- Repository lint, TypeScript, full Prettier and spelling pass. The initial formatting failure was confined to the new test and corrected using 16.x's formatter.
- npm and Deno package builds pass; both fuzz tests pass.
- The unchanged integration harness passes TypeScript 4.1–4.6 and Webpack projects. Its Node-container project cannot launch Docker in this WSL environment. The same built-package integration program passes directly on Node 12.22.12 and 20.19.5.
- Built CommonJS and ESM packages pass synchronous/asynchronous result-map checks on Node 12.22.12 and 20.19.5.
- The standard c8 command executes tests but produces an empty zero-file report on **both unchanged base and candidate**. An explicit TypeScript include did not resolve it. This is **not a claim of measured coverage**. Full upstream CI and its supported-version/container matrix remain necessary.

Relevant logs: `testonly-cover.log`, `node12-tests-final.log`, `base-coverage.log`, `prettier-check-final.log`, `check-integrations.log`, `compatibility.log` and `fuzzonly.log`. Source and baseline identity, runtime versions, raw metric events and paired summaries are stored alongside this document. No benchmark files are part of the source PR.

## Reproduce on Linux

Use Node 20.19.5 and run from the root of this evidence checkout. Build separate source trees:

```sh
git clone --branch 16.x.x https://github.com/graphql/graphql-js.git work/graphql-js-v16-base
git -C work/graphql-js-v16-base checkout 6944e23cf7494ba26492c333dd989575b66914c1
git clone --branch perf/compact-execution-results-v16 https://github.com/jhonDoe15/graphql-js.git work/graphql-js-v16
git -C work/graphql-js-v16 checkout 29685132862c162b97f2838d1a6ebc8309c2c62c
(cd work/graphql-js-v16-base && npm ci --ignore-scripts && npm run build:npm)
(cd work/graphql-js-v16 && npm ci --ignore-scripts && npm run build:npm)
node outputs/graphql-js-study/fixture.mjs 25000000 work/fixtures/dense-25000000.json 8 1
node outputs/graphql-js-study/fixture.mjs 100000000 work/fixtures/dense-100000000.json 8 1
node outputs/graphql-js-study/fixture.mjs 3000000 outputs/graphql-js-study/dense-3000000.json 8 1
node outputs/graphql-js-v16-study/source-run.mjs "$PWD/work/graphql-js-v16-base" "$PWD/work/graphql-js-v16" 25000000 3 repro-pilot
node outputs/graphql-js-v16-study/source-run.mjs "$PWD/work/graphql-js-v16-base" "$PWD/work/graphql-js-v16" 100000000 5 repro-confirm
node outputs/graphql-js-v16-study/source-run.mjs "$PWD/work/graphql-js-v16-base" "$PWD/work/graphql-js-v16" 3000000 3 repro-async true
node outputs/graphql-js-v16-study/analyze.mjs outputs/graphql-js-v16-study/repro-confirm.json
node outputs/graphql-js-v16-study/shape-run.mjs node "$(command -v node)" repro-shapes-node "$PWD/work/graphql-js-v16-base" "$PWD/work/graphql-js-v16"
node outputs/graphql-js-v16-study/shape-run.mjs bun "$(command -v bun)" repro-shapes-bun "$PWD/work/graphql-js-v16-base" "$PWD/work/graphql-js-v16"
node outputs/graphql-js-v16-study/shape-wide-run.mjs node "$(command -v node)" repro-wide "$PWD/work/graphql-js-v16-base" "$PWD/work/graphql-js-v16"
node outputs/graphql-js-v16-study/shape-analyze.mjs outputs/graphql-js-v16-study/repro-shapes-node.json outputs/graphql-js-v16-study/repro-shapes-bun.json outputs/graphql-js-v16-study/repro-wide.json
```

Run serially. Runners refuse existing output names, fingerprint the source/build or build artifacts before every child, and require matching response bytes/hash. To repeat validation, run the repository scripts and the package-smoke script with each runtime; the local setup/compatibility shell scripts record the original environment commands.

## Gateway adoption after release

A released 16.x backport would fit Gateway's existing GraphQL peer range and preserve Node 20 support. Gateway currently pins/resolves GraphQL 16.14.0, so it still needs an explicit version/lockfile update and compatibility checks. A backport does not replace Gateway's separate GraphQL Tools executor or local promise normalization. The two other upstream major-version adoption constraints remain separate. Maintainers choose whether to accept this optimization for 16.x and which release carries it.
