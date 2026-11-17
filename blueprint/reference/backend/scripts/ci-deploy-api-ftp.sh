#!/usr/bin/env bash
# API Plesk deploy: stop IIS (app_offline + web.config rename), mirror publish/, restore site.
set -euo pipefail

PUBLISH_DIR="${1:-./publish}"
FTP_SERVER="${FTP_SERVER:?}"
FTP_USERNAME="${FTP_USERNAME:?}"
FTP_PASSWORD="${FTP_PASSWORD:?}"
FTP_PROTOCOL="${FTP_PROTOCOL:-ftp}"

case "$FTP_PROTOCOL" in
  ftps|ftps-legacy) OPEN="ftps://$FTP_SERVER" ;;
  *) OPEN="$FTP_SERVER" ;;
esac

echo "Deploying to FTP login root (no remote cd)."

APP_OFFLINE="$(mktemp)"
printf '%s' '<!DOCTYPE html><html><body><h1>Updating</h1></body></html>' > "$APP_OFFLINE"

lftp_quiet() {
  lftp -u "$FTP_USERNAME","$FTP_PASSWORD" "$OPEN" -e "
    set ftp:ssl-allow true
    set ssl:verify-certificate no
    set cmd:fail-exit no
    $*
    bye
  "
}

echo "=== FTP listing (before stop) ==="
lftp_quiet "cls -1" || true

echo "=== Stop IIS: app_offline.htm, then web.config -> web1.config ==="
lftp_quiet "rm -f app_offline.htm; put ${APP_OFFLINE} -o app_offline.htm"
sleep 25

stopped=0
for attempt in $(seq 1 12); do
  lftp_quiet "mv web1.config web.config; mv web.config web1.config"
  listing="$(lftp -u "$FTP_USERNAME","$FTP_PASSWORD" "$OPEN" -e "
    set ftp:ssl-allow true
    set ssl:verify-certificate no
    set cmd:fail-exit no
    cls -1
    bye
  " 2>/dev/null || true)"
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
  lftp_quiet "cls -1" || true
  exit 1
fi

sleep 20

echo "=== Upload publish output (lftp mirror) ==="
uploaded=0
for attempt in $(seq 1 6); do
  if lftp -u "$FTP_USERNAME","$FTP_PASSWORD" "$OPEN" -e "
      set ftp:ssl-allow true
      set ssl:verify-certificate no
      set cmd:fail-exit yes
      set ftp:use-feat no
      mirror -R --parallel=1 --no-perms --verbose \
        -X appsettings.json \
        -X 'appsettings.*.json' \
        -X web.config \
        ${PUBLISH_DIR}/ .
      bye
    "; then
    uploaded=1
    break
  fi
  echo "Mirror upload failed (attempt ${attempt}/6), retrying after wait..."
  sleep 25
done

if [ "$uploaded" -ne 1 ]; then
  echo "::error::FTP mirror upload failed after retries (DLL still locked or path wrong)."
  exit 1
fi

echo "=== Upload complete ==="
