#!/usr/bin/env bash
set -euo pipefail
task_root=/tmp/codex-graphql-v16
win_root=/mnt/c/Users/noamy/Documents/Codex/2026-10-23/graphql-memory-investigation
mkdir -p "$task_root/tools"
cd "$task_root/tools"
for version in 20.19.5 12.22.12; do
  if [ ! -x "node-v$version-linux-x64/bin/node" ]; then
    curl --fail --location --retry 2 -o "node-v$version.tar.xz" "https://nodejs.org/dist/v$version/node-v$version-linux-x64.tar.xz"
    curl --fail --location --retry 2 -o "SHASUMS-$version.txt" "https://nodejs.org/dist/v$version/SHASUMS256.txt"
    expected=$(awk -v file="node-v$version-linux-x64.tar.xz" '$2==file {print $1}' "SHASUMS-$version.txt")
    echo "$expected  node-v$version.tar.xz" | sha256sum --check
    tar -xf "node-v$version.tar.xz"
  fi
done
export PATH="$task_root/tools/node-v20.19.5-linux-x64/bin:$PATH"
if [ ! -d "$task_root/base/.git" ]; then
  git -c core.autocrlf=false clone --depth 1 --branch 16.x.x https://github.com/graphql/graphql-js.git "$task_root/base"
fi
test "$(git -C "$task_root/base" rev-parse HEAD)" = 6944e23cf7494ba26492c333dd989575b66914c1
if [ ! -f "$task_root/pr/.git" ]; then git -C "$task_root/base" worktree add --detach "$task_root/pr" HEAD; fi
for file in src/jsutils/CompactExecutionResultMap.ts src/jsutils/promiseForObject.ts src/execution/execute.ts src/execution/__tests__/resultMap-test.ts; do
  cp "$win_root/work/graphql-js-v16/$file" "$task_root/pr/$file"
done
cd "$task_root/pr"
npm ci --ignore-scripts --no-audit --no-fund > "$win_root/outputs/graphql-js-v16-study/install.log" 2>&1
result_path="$win_root/outputs/graphql-js-v16-study/validation.tsv"
printf 'check\texit\n' > "$result_path"
for check in lint check testonly:cover prettier:check check:spelling check:integrations fuzzonly; do
  echo "RUN $check"
  set +e
  npm run "$check" > "$win_root/outputs/graphql-js-v16-study/${check//:/-}.log" 2>&1
  status=$?
  set -e
  printf '%s\t%s\n' "$check" "$status" >> "$result_path"
  echo "EXIT $check: $status"
  tail -n 5 "$win_root/outputs/graphql-js-v16-study/${check//:/-}.log"
done
