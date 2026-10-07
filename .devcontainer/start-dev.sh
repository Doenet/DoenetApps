#!/usr/bin/env bash
# Start the dev servers unless they are already running.
#
# VS Code runs this every time it attaches to the container (postAttachCommand),
# so the app is up without anyone typing a command; the guard keeps a window
# reload from starting a second copy on the same ports. It is also the default
# build task (Ctrl/Cmd+Shift+B) in .vscode/tasks.json.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

read -r api_port app_port <<<"$(node -e '
import("./scripts/worktree-env.js").then((m) => console.log(m.apiPort, m.appPort))')"

if (exec 3<>"/dev/tcp/127.0.0.1/$api_port") 2>/dev/null; then
  echo "Dev servers are already running (API on :$api_port)."
  echo "Open http://localhost:$app_port — or stop them and run this again."
  exit 0
fi

exec npm run dev
