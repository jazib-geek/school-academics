# Deploy (API + UI) — not a monorepo on GitHub

Production continuous deployment is **two separate GitHub repos**. Pushing only a local workspace remote (e.g. `school-academics`) does **not** deploy.

| App | GitHub repo (CD runs here) | Git remote (typical) | Actions |
|-----|----------------------------|----------------------|---------|
| **API** | [SoftelligentSchoolSuitePro-API](https://github.com/jazib-geek/SoftelligentSchoolSuitePro-API/actions) | `suite-api` | `/.github/workflows/deploy.yml` |
| **UI** | [SoftelligentSchoolSuitePro-UI](https://github.com/jazib-geek/SoftelligentSchoolSuitePro-UI/actions) | `suite-ui` | `/.github/workflows/deploy.yml` |

Local folder layout may group `backend/` and `frontend/` together; **treat them as two products** for git push.

## Always verify on every release push

Before you consider a release done, complete this checklist:

1. **Commit** on `master` in your dev repo (if you use one).
2. **Push the repo that actually hosts CD** (subtree from this workspace):
   - API changes → push **`suite-api`** `master`
   - UI changes → push **`suite-ui`** `master`
3. **Open Actions** and confirm a new workflow run started:
   - API: https://github.com/jazib-geek/SoftelligentSchoolSuitePro-API/actions
   - UI: https://github.com/jazib-geek/SoftelligentSchoolSuitePro-UI/actions
4. **Build** job green, then **deploy** job green (API deploy needs IIS stop — `web.config` → `web1.config`, `app_offline.htm`, wait, FTP upload, restore).
5. **Smoke-test** production API and UI in the browser.

If API deploy fails with FTP **550 / file in use**, check the deploy job log for **Stop IIS app** and **Start IIS app**. On the server, ensure `web.config` exists (not stuck as only `web1.config`) and remove stray `app_offline.htm`.

## Push commands (from dev workspace root)

Helper script:

```powershell
.\backend\scripts\Push-SuiteDeploy.ps1 -Api          # backend only
.\backend\scripts\Push-SuiteDeploy.ps1 -Ui           # frontend only
.\backend\scripts\Push-SuiteDeploy.ps1 -Api -Ui      # both
```

Manual subtree (same as script):

```powershell
git subtree split --prefix=backend -b api-release-push
git push suite-api api-release-push:master

git subtree split --prefix=frontend -b frontend-ui-release
git push suite-ui frontend-ui-release:master
```

## Secrets (API repo — SoftelligentSchoolSuitePro-API)

| Secret | Required | Notes |
|--------|----------|--------|
| `FTP_SERVER` | Yes | Same host as UI if shared hosting |
| `FTP_USERNAME` | Yes | **Site-scoped** account (e.g. `ftp_sbs_root`) whose Plesk home **is** the API folder (`sciencebaseschool.com`) |
| `FTP_PASSWORD` | Yes | |
| `FTP_PROTOCOL` | No | `ftp` (default) or `ftps` |
| `FTP_REMOTE_DIR` | **No — leave unset** for site-scoped FTP | Only for legacy subscription-root FTP that must `cd` into `sciencebaseschool.com`. If set with `ftp_sbs_root`, deploy fails (550 / cd / mirror abort). |

Deploy flow (see `scripts/ci-deploy-api-ftp.sh`): `app_offline.htm` → rename `web.config` → `web1.config` → `lftp mirror` (excludes `appsettings*.json`, `web.config`) → restore step removes offline file and `web1.config` → `web.config`.
