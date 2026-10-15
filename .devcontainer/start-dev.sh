#!/usr/bin/env bash
# Starts the dev servers in the background unless they are already running.
# Runs when the container starts and again when an editor attaches: Codespaces
# can kill what the start-time run launched, and the attach-time run brings the
# servers back. Run it by hand to restart them after stopping them.
#
# Output, including the auto-login link, goes to /tmp/dev.log. setsid puts the
# servers in a process group of their own, whose id goes to /tmp/dev.pid, so
# `kill -- -$(cat /tmp/dev.pid)` stops them all.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f /tmp/dev.pid ] && kill -0 -- "-$(cat /tmp/dev.pid)" 2>/dev/null; then
  echo "Dev servers already running; tail -f /tmp/dev.log shows their output."
  exit 0
fi

# The group leader writes its own id: from an interactive shell setsid forks,
# so the $! seen here would be a process that has already exited.
setsid bash -c 'echo $$ > /tmp/dev.pid; exec npm run dev' \
  > /tmp/dev.log 2>&1 < /dev/null &
echo "Dev servers starting; tail -f /tmp/dev.log shows their output and the auto-login link."
