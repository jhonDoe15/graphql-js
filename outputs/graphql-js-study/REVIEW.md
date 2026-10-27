# Review of GraphQL.js PR #4919

Pinned comparison: `git diff c93662d3c1e6ad71b31e5926319998abf1378db7...11f2b7ad49bf42d31021609dd9b36518ac14bda8`. Four source/test files, 87 additions and two deletions. Independent read-only Standards and Spec reviews used `.github/CONTRIBUTING.md`, the code-review skill smell baseline, and the user's requirements to preserve semantics, reduce memory, and keep investigation artifacts outside the PR.

## Standards

No blocking standards or maintainability findings. Tests protect null prototypes, special aliases, property descriptors, key order, source immutability and independent results. The shared constructor is explicitly internal; no public API documentation change is needed. The double type assertion is unusual but localized. No speculative generality or unrelated scope was found.

One optional judgment call: both allocation sites construct the shared object and immediately clear its prototype. A factory could centralize that invariant, but with only two call sites and an allocation-sensitive change, introducing another abstraction without performance evidence is not warranted. Disposition: keep the measured implementation.

## Spec

No correctness blocker or scope creep. The empty constructor adds no own properties and its prototype is removed before fields are assigned or exposed. Promise aggregation, key ordering, rejection handling and synchronous return behavior are unchanged. Tests cover freshness across sibling selections and repeated executions; frozen source inputs establish that resolver input is not reused or mutated. Exact response hashes add evidence of unchanged serialization.

One readiness gap was identified: wide-selection and cross-engine performance were not yet assessed. Disposition: completed 40 additional fresh paired trials on Node and Bun; see SHAPE-EVIDENCE.md. The PR now explicitly discloses no retained-memory benefit for wide Node objects, no consistent Bun memory benefit, and observed timing/RSS regressions. The original 25 MB execution regression and modest promise-heavy savings remain disclosed.

Standards: 0 hard findings, 1 optional duplication observation retained with rationale. Spec: 0 correctness findings, 1 validation gap addressed by the width/engine matrix.
