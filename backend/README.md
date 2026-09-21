# School API (backend)

.NET 8 campus + academics API (`School.API`, `School.Application`, `School.Infrastructure`).

## Production deploy (required)

**GitHub Actions does not run from this monorepo.** CD lives on [SoftelligentSchoolSuitePro-API](https://github.com/jazib-geek/SoftelligentSchoolSuitePro-API).

After backend changes are committed locally:

```powershell
# From repo root (SchoolAPI workspace)
.\backend\scripts\Push-SuiteDeploy.ps1 -Api
```

Then open [API Actions](https://github.com/jazib-geek/SoftelligentSchoolSuitePro-API/actions) and confirm **build** + **deploy** succeed.

Full checklist, FTP secrets, and IIS/FTP behavior: **[DEPLOY.md](./DEPLOY.md)**.
