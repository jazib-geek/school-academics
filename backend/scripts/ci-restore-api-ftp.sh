#!/usr/bin/env bash
set -euo pipefail

FTP_SERVER="${FTP_SERVER:?}"
FTP_USERNAME="${FTP_USERNAME:?}"
FTP_PASSWORD="${FTP_PASSWORD:?}"
FTP_PROTOCOL="${FTP_PROTOCOL:-ftp}"
export FTP_SERVER FTP_USERNAME FTP_PASSWORD FTP_PROTOCOL

HERE="$(cd "$(dirname "$0")" && pwd)"
python3 "$HERE/ftp_site.py" restore
