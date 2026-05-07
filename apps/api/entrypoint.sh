#!/bin/bash
set -euo pipefail
npm run prisma:deploy
exec npm run start
