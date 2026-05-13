# TODO
- [ ] Diagnose Vercel CLI local deploy failure.
  - [x] Identify and remove local Docker OTLP socket causing first EACCES error.
  - [x] Re-run `vercel --prod --debug` to confirm error moved forward.
  - [ ] Fix new EPERM error: Vercel CLI scanning restricted Windows INetCache directory.
    - [ ] Run Vercel CLI as Administrator, then re-run deploy.
    - [ ] If still failing, clear/rename INetCache\Low\Content.IE5 and retry.
    - [ ] If needed, ensure CLI is executed from the correct frontend project directory (avoid scanning wider repo/home directories).

