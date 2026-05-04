# CI esbuild ETXTBSY Fix Note

- Date: 2026-05-04
- Issue: GitHub Actions server install step failed on `npm ci` during `esbuild/install.js` with `ETXTBSY`.
- Root cause: runner-side lifecycle scripts from transitive `tsx` -> `esbuild` were unnecessary for the deploy type-check/build path.
- Fix:
  - `.github/workflows/deploy.yml`: switch server install to `npm ci --ignore-scripts`
  - `server/Dockerfile`: switch builder install to `npm ci --ignore-scripts`
  - keep explicit `npx prisma generate` after install
- Validation:
  - `server npm ci --ignore-scripts` ✅
  - `server npx prisma generate` ✅
  - `server npx tsc --noEmit` ✅
  - `server npm run build` ✅
- Remaining note: workflow/Linux runtime was not executed from this session, but code review found no remaining defects in the fix slice.
