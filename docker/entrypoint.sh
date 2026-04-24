#!/bin/sh
set -e

echo "▶ Applying Drizzle migrations..."
node ./node_modules/tsx/dist/cli.mjs /app/scripts/migrate.ts
echo "✓ Migrations applied"

exec "$@"
