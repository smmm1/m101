# M101 production deployment

- Production host: Cloudflare Pages `m101-directory`
- Production source branch: `main` only
- Build command: `npm run build`
- Output directory: `dist`
- Runtime API: Cloudflare Pages Functions in `functions/api/[[path]].ts`
- Primary data store: the M101 D1 database bound as `DB`
- Authentication: the configured `MONEY102_AUTH` service binding; M101 keeps its own sessions and directory data in its own D1 database.

Do not switch the production branch to a preview branch. Changes are released by committing to `main`, then verifying that the latest Cloudflare deployment is marked `production`, references the same commit, and succeeds.

D1 data is persistent and separate from the static site deployment. Do not replace the database binding or run destructive migrations as part of a routine UI deployment.
