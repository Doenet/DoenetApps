#!/usr/bin/env bash
# Runs once when the dev container is created. The database address comes
# from docker-compose.yml, so `npm run setup` (which starts compose on the
# host) is not needed here.
set -euo pipefail

[ -f apps/api/.env ] || cp apps/api/.env.example apps/api/.env
npm ci
npx cypress install
npm run db:setup

echo
echo "✅ Dev container ready. The dev servers start on their own; if not, run: npm run dev"
