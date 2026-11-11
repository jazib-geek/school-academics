#!/usr/bin/env python3
"""FTP helpers for the Plesk API deploy. Uses the Python stdlib so the runner does not install lftp."""

import fnmatch
import os
import ssl
import sys
from ftplib import FTP, FTP_TLS, all_errors, error_perm
from pathlib import Path


class SessionFTP_TLS(FTP_TLS):
    """Reuse the TLS session on data connections. IIS FTP drops uploads without this."""

    def ntransfercmd(self, cmd, rest=None):
        conn, size = FTP.ntransfercmd(self, cmd, rest)
        if self._prot_p:
            conn = self.context.wrap_socket(
                conn, server_hostname=self.host, session=self.sock.session
            )
        return conn, size


def connect():
    host = os.environ["FTP_SERVER"]
    user = os.environ["FTP_USERNAME"]
    password = os.environ["FTP_PASSWORD"]
    protocol = os.environ.get("FTP_PROTOCOL", "ftp").strip().lower()
    if protocol in ("ftps", "ftps-legacy"):
        context = ssl._create_unverified_context()
        ftp = SessionFTP_TLS(context=context)
    else:
        ftp = FTP()
    ftp.connect(host, 21, timeout=90)
    ftp.login(user, password)
    if isinstance(ftp, FTP_TLS):
        ftp.prot_p()
    ftp.set_pasv(True)
    return ftp


def names(ftp):
    try:
        raw = ftp.nlst()
    except error_perm as exc:
        if str(exc).startswith("550"):
            return []
        raise
    found = []
    for item in raw:
        base = item.replace("\\", "/").rstrip("/").split("/")[-1]
        if base and base not in (".", ".."):
            found.append(base)
    return found


def delete_if_exists(ftp, remote_name):
    try:
        ftp.delete(remote_name)
    except error_perm:
        return


def skip_upload(filename):
    lower = filename.lower()
    if lower == "web.config":
        return True
    if lower == "appsettings.json":
        return True
    return fnmatch.fnmatch(lower, "appsettings.*.json")


def ensure_dir(ftp, rel):
    path = ""
    for part in rel.split("/"):
        path = part if not path else f"{path}/{part}"
        try:
            ftp.mkd(path)
        except error_perm:
            pass


def cmd_listing(ftp):
    for name in names(ftp):
        print(name)
    return 0


def cmd_put_offline(ftp, local_path):
    delete_if_exists(ftp, "app_offline.htm")
    with open(local_path, "rb") as handle:
        ftp.storbinary("STOR app_offline.htm", handle, blocksize=65536)
    return 0


def cmd_swap_offline(ftp):
    try:
        ftp.rename("web1.config", "web.config")
    except all_errors:
        pass
    ftp.rename("web.config", "web1.config")
    return 0


def cmd_upload(ftp, local_root):
    root = Path(local_root)
    if not root.is_dir():
        print(f"::error::Publish directory not found: {root}", file=sys.stderr)
        return 1
    for dirpath, _, filenames in os.walk(root):
        rel_dir = Path(dirpath).relative_to(root).as_posix()
        if rel_dir != ".":
            ensure_dir(ftp, rel_dir)
        for filename in filenames:
            if skip_upload(filename):
                print(f"skip {filename}", file=sys.stderr)
                continue
            remote = filename if rel_dir == "." else f"{rel_dir}/{filename}"
            local = Path(dirpath) / filename
            print(f"put {remote}", file=sys.stderr)
            with local.open("rb") as handle:
                ftp.storbinary(f"STOR {remote}", handle, blocksize=65536)
    return 0


def cmd_restore(ftp):
    delete_if_exists(ftp, "app_offline.htm")
    try:
        ftp.rename("web1.config", "web.config")
    except all_errors as exc:
        print(f"rename web1.config: {exc}", file=sys.stderr)
    listed = {name.lower() for name in names(ftp)}
    if "web1.config" in listed and "web.config" not in listed:
        print("::error::Site is still offline (web1.config was not restored).", file=sys.stderr)
        return 1
    return 0


def main(argv):
    if len(argv) < 2:
        print("usage: ftp_site.py listing|put-offline|swap-offline|upload|restore", file=sys.stderr)
        return 2
    command = argv[1]
    ftp = connect()
    try:
        if command == "listing":
            return cmd_listing(ftp)
        if command == "put-offline":
            return cmd_put_offline(ftp, argv[2])
        if command == "swap-offline":
            return cmd_swap_offline(ftp)
        if command == "upload":
            return cmd_upload(ftp, argv[2])
        if command == "restore":
            return cmd_restore(ftp)
        print(f"unknown command: {command}", file=sys.stderr)
        return 2
    finally:
        try:
            ftp.quit()
        except all_errors:
            ftp.close()


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv))
    except all_errors as exc:
        print(f"::error::FTP failed: {exc}", file=sys.stderr)
        sys.exit(1)
