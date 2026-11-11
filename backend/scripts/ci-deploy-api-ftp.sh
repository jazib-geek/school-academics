#!/usr/bin/env bash
# API Plesk deploy: stop IIS (app_offline + web.config rename), upload publish/, leave restore to ci-restore-api-ftp.sh.
set -euo pipefail

PUBLISH_DIR="${1:-./publish}"
FTP_SERVER="${FTP_SERVER:?}"
FTP_USERNAME="${FTP_USERNAME:?}"
FTP_PASSWORD="${FTP_PASSWORD:?}"
FTP_PROTOCOL="${FTP_PROTOCOL:-ftp}"
export FTP_SERVER FTP_USERNAME FTP_PASSWORD FTP_PROTOCOL

HERE="$(cd "$(dirname "$0")" && pwd)"
ftp_py() { python3 "$HERE/ftp_site.py" "$@"; }

echo "Deploying to FTP login root (no remote cd)."

APP_OFFLINE="$(mktemp)"
printf '%s' '<!DOCTYPE html><html><body><h1>Updating</h1></body></html>' > "$APP_OFFLINE"

echo "=== FTP listing (before stop) ==="
ftp_py listing || true

echo "=== Stop IIS: app_offline.htm, then web.config -> web1.config ==="
ftp_py put-offline "$APP_OFFLINE"
sleep 25

stopped=0
for attempt in $(seq 1 12); do
  ftp_py swap-offline || true
  listing="$(ftp_py listing || true)"
  if echo "$listing" | grep -qi 'web1\.config'; then
    stopped=1
    echo "Site offline: web1.config present (attempt ${attempt})"
    break
  fi
  echo "Waiting for web.config rename (attempt ${attempt}/12)..."
  sleep 10
done

if [ "$stopped" -ne 1 ]; then
  echo "::error::Could not rename web.config to web1.config on FTP. Confirm web.config exists in the API site FTP home."
  ftp_py listing || true
  exit 1
fi

sleep 20

echo "=== Upload publish output ==="
uploaded=0
for attempt in $(seq 1 6); do
  if ftp_py upload "$PUBLISH_DIR"; then
    uploaded=1
    break
  fi
  echo "Upload failed (attempt ${attempt}/6), retrying after wait..."
  sleep 25
done

if [ "$uploaded" -ne 1 ]; then
  echo "::error::FTP upload failed after retries (DLL still locked or path wrong)."
  exit 1
fi

echo "=== Upload complete ==="
