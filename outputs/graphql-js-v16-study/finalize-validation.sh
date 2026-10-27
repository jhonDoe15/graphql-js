#!/usr/bin/env bash
set -euo pipefail
task_root=/tmp/codex-graphql-v16
win_root=/mnt/c/Users/noamy/Documents/Codex/2026-10-23/graphql-memory-investigation
export PATH="$task_root/tools/node-v20.19.5-linux-x64/bin:$PATH"
cd "$task_root/pr"
node node_modules/prettier/bin-prettier.js --write src/execution/__tests__/resultMap-test.ts
cp src/execution/__tests__/resultMap-test.ts "$win_root/work/graphql-js-v16/src/execution/__tests__/resultMap-test.ts"
npm run prettier:check > "$win_root/outputs/graphql-js-v16-study/prettier-check-final.log" 2>&1
echo 'Formatting PASS'
set +e
node node_modules/c8/bin/c8.js --include='src/**/*.ts' --extension=.ts npm run testonly > "$win_root/outputs/graphql-js-v16-study/coverage-explicit.log" 2>&1
echo "Explicit coverage exit: $?"
tail -n 8 "$win_root/outputs/graphql-js-v16-study/coverage-explicit.log"
"$task_root/tools/node-v12.22.12-linux-x64/bin/node" node_modules/mocha/bin/mocha.js --full-trace 'src/**/__tests__/**/*-test.ts' > "$win_root/outputs/graphql-js-v16-study/node12-tests.log" 2>&1
echo "Node 12 tests exit: $?"
tail -n 5 "$win_root/outputs/graphql-js-v16-study/node12-tests.log"
set -e
cd "$task_root/base"
npm ci --ignore-scripts --no-audit --no-fund > "$win_root/outputs/graphql-js-v16-study/base-install.log" 2>&1
npm run build:npm > "$win_root/outputs/graphql-js-v16-study/base-build.log" 2>&1
echo 'Base npm build PASS'
