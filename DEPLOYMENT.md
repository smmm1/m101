# M101 deployment

- Production host: Cloudflare Pages `m101-directory`
- Production source branch: `main` only
- Build command: `npm run build`
- Output directory: `dist`
- Runtime API: Cloudflare Pages Functions in `functions/api/[[path]].ts`
- Primary data store: Cloudflare D1 bound as `DB`
- Authentication: local M101 username/password credentials; no external identity bridge is required.

## Preview setup

- Preview deployments must bind `DB` to the isolated `m101-preview-isolated` database.
- Before the first Owner can be created, configure `M101_BOOTSTRAP_KEY` as a **secret** in the Cloudflare Pages Preview environment. Do not commit the value to this repository or expose it in browser code.
- The first-setup screen accepts the Owner's chosen ID, a password of at least 14 characters, and the bootstrap key. The API only permits this operation while the M101 users table is empty.
- Apply D1 migrations to the isolated Preview database before testing the new authentication flow.

Do not switch the production branch to a preview branch. Changes are released by committing to `main`, then verifying that the latest Cloudflare deployment is marked `production`, references the same commit, and succeeds.

D1 data is persistent and separate from the static site deployment. Do not replace the database binding or run destructive migrations as part of a routine UI deployment. Never run Preview migrations against the Production database.
