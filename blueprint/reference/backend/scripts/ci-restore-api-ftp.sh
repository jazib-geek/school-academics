#!/usr/bin/env bash
set -euo pipefail

FTP_SERVER="${FTP_SERVER:?}"
FTP_USERNAME="${FTP_USERNAME:?}"
FTP_PASSWORD="${FTP_PASSWORD:?}"
FTP_PROTOCOL="${FTP_PROTOCOL:-ftp}"

case "$FTP_PROTOCOL" in
  ftps|ftps-legacy) OPEN="ftps://$FTP_SERVER" ;;
  *) OPEN="$FTP_SERVER" ;;
esac

lftp -u "$FTP_USERNAME","$FTP_PASSWORD" "$OPEN" -e "
  set ftp:ssl-allow true
  set ssl:verify-certificate no
  set cmd:fail-exit no
  rm -f app_offline.htm
  mv web1.config web.config
  bye
"
