# Review readiness: GraphQL.js #4919

Validated source: `11f2b7ad49bf42d31021609dd9b36518ac14bda8`. The source PR remains four files, 87 additions and two deletions. Investigation scripts, logs and reports are confined to this separate evidence branch.

## Completed checks

A clean LF checkout on Ubuntu 20.04 / WSL2, using Node **24.19.0** and Deno **2.4.1**, resolved the Windows checkout limitations:

| Check | Result |
| --- | --- |
| ESLint, TypeScript | Pass |
| Deno build and `deno publish --dry-run` package/type check | Pass; nothing published |
| Source tests with coverage | 3,112 pass; 100% lines, branches and functions |
| Entire repository Prettier check | Pass |
| Executable examples | 360 pass |
| Example formatting and spelling | Pass |
| npm package build | Pass |
| Fuzz suite | 11 pass |
| Integration suite through its unchanged harness | 17 pass; 12 fail at Docker launch because Docker is unavailable |

The 12 integration failures are environment failures, not reported as passes. Nine test projects invoke Docker in their package scripts; `ts`, `node` and `conditions` invoke it inside JavaScript. The TypeScript compilers 4.9 through 6.0 pass before the `ts` project reaches its Docker-based Deno check. See [full suite log](pr-linux-full-test.log), [fuzz log](pr-linux-fuzz.log), and [exit status record](pr-linux-validation.json).

To check the built package on the runtimes anyway, the same test programs were run directly on Linux using **Bun 1.2.18** and **Deno 2.4.1** (the versions pinned by the repository) and Node **24.19.0**. All **15 direct commands pass**: tracing diagnostics, development/production exports, Deno type checking, Node CommonJS/ESM imports, and conditional export identity on Node/Bun/Deno. [Commands and exit codes](pr-linux-direct-runtimes.tsv), [output](pr-linux-direct-runtimes.log). These do not substitute for the Docker images or the complete Node-version matrix; those remain for CI.

Earlier Windows validation also passed the source/coverage/examples/lint/types/spelling checks and both new regression cases under Bun 1.3.14. The Windows full-suite Deno path error was reproduced on the unchanged base, and its full-repository formatting failures were CRLF checkout differences. The clean Linux checkout passes both checks without changing source.

## Review and performance

[Independent Standards and Spec review](REVIEW.md) found no blocking correctness, standards or maintainability issues. One optional suggestion to wrap the two allocation sites in a factory was left out to preserve the measured, small implementation.

Actual-source dense-response measurements remain unchanged: five 100 MB pairs reduce request-added heap by 53.35% and peak RSS by 43.91%. The benchmark runtime is Node **24.22.1**, not the 24.19.0 used for Linux validation. An earlier documentation label was corrected from the raw benchmark metadata; no timing or memory values were changed.

[Width and engine measurements](SHAPE-EVIDENCE.md) add 40 pairs and disclose material limits: essentially unchanged retained output memory for wide Node objects, no consistent Bun memory gain, and several timing/RSS regressions. This is ready for review as a small-object allocation tradeoff, not a claim that every runtime or workload improves.

## External checks

On October 27, 2026, EasyCLA passes. GitHub Actions runs require maintainer approval for the fork; the Vercel preview requires GraphQL Foundation authorization. Full upstream CI and maintainer assessment of performance tradeoffs are still required before merge. No merge was performed.
