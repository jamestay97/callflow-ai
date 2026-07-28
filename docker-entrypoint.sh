#!/bin/sh
set -e

# Railway volumes mount as root; ensure the app user can write tenant/booking data.
if [ -d /app/data ]; then
  chown -R app:app /app/data 2>/dev/null || true
fi

exec su-exec app node dist/index.js
