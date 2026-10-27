#!/usr/bin/env bash
set -euo pipefail
task_root=/tmp/codex-graphql-v16
win_root=/mnt/c/Users/noamy/Documents/Codex/2026-10-23/graphql-memory-investigation
export PATH="$task_root/tools/node-v20.19.5-linux-x64/bin:$PATH"
cd "$task_root/pr"
"$task_root/tools/node-v12.22.12-linux-x64/bin/node" node_modules/mocha/bin/mocha --full-trace 'src/**/__tests__/**/*-test.ts' > "$win_root/outputs/graphql-js-v16-study/node12-tests-final.log" 2>&1
tail -n 4 "$win_root/outputs/graphql-js-v16-study/node12-tests-final.log"
for version in 12.22.12 20.19.5; do
  for extension in js mjs; do
    "$task_root/tools/node-v$version-linux-x64/bin/node" "$win_root/outputs/graphql-js-v16-study/package-smoke.mjs" "$task_root/pr/npmDist/index.$extension"
  done
  (cd /tmp/graphql-js-integrationTmp/node && "$task_root/tools/node-v$version-linux-x64/bin/node" index.js)
done
cd "$task_root/base"
npm run testonly:cover > "$win_root/outputs/graphql-js-v16-study/base-coverage.log" 2>&1
tail -n 8 "$win_root/outputs/graphql-js-v16-study/base-coverage.log"
