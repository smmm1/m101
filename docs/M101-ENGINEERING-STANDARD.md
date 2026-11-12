# M101 Engineering Standard

**Status:** Active project standard  
**Baseline:** `feature/m101-clean-rebuild` (the Preview deployment confirmed by the owner as retaining the usable legacy login)  
**Production:** Cloudflare Pages `m101-directory`, `main` only  
**Production URL:** https://m101-directory.pages.dev/

This document is the source of truth for future M101 development. If code, an old branch, or an informal instruction conflicts with this standard, stop and resolve the conflict before changing behavior.

## 1. One canonical application baseline

- Use the owner-confirmed working baseline above as the starting point for all future M101 work.
- Do not start new feature work from an experimental or stale branch just because it has a newer-looking name or a successful build.
- Do not replace the application wholesale to implement an individual feature.
- Bring changes from other branches over selectively: inspect the diff, dependencies, schema impact, and runtime behavior before integrating.
- Keep one active integration branch for the next coherent release. Record its base commit in the PR or change summary.
- Never merge unrelated branches wholesale or force-push over work without an explicit recovery plan.

## 2. Authentication is a protected shared foundation

- The owner-confirmed legacy login on the canonical baseline is the reference behavior and compatibility contract.
- All pages and features must use the same application authentication/session mechanism. No feature may introduce its own login, credential store, session cookie, or parallel auth flow.
- Do not rewrite, migrate, rename, or replace authentication as part of routine UI or feature work.
- Any proposed authentication change is a dedicated security-sensitive task. First document the current login flow, session lifecycle, authorization checks, and data dependencies; then propose a migration and rollback plan.
- Preserve Owner access and existing account/data relationships. Never ask for, log, commit, or expose passwords, password hashes, session tokens, or bootstrap secrets.
- A successful build is not proof of working authentication. Verify a real login, refresh, logout, and protected-route behavior in Preview before declaring it complete.

## 3. Environment and data safety

- Cloudflare Pages is the deployment platform. Do not introduce Vercel or Supabase into M101.
- Cloudflare D1 is the persistent application data store. Do not silently substitute browser local storage for persistent records.
- Preview must use its isolated Preview D1 database. Production must retain its existing Production D1 binding.
- Never run migrations, seed scripts, destructive SQL, or test writes against Production as part of Preview work.
- Before any schema change, inspect the current schema and migration history, write a forward migration, and document compatibility/rollback considerations.
- UI-only work must not change database bindings, credentials, migrations, or production environment settings.

## 4. Required change workflow

1. Identify the canonical baseline branch and commit.
2. Inspect the relevant source files and existing behavior before editing.
3. Make the smallest coherent change; avoid unrelated refactors.
4. Run the repository checks (at minimum `npm run build` and `npm run lint`, where applicable).
5. Deploy to a Preview environment backed by isolated Preview D1.
6. Test the actual changed flow in a browser, including authentication where the flow is protected.
7. Inspect deployment status and runtime errors. A green build alone is insufficient.
8. Report the exact branch, commit, Preview URL, checks run, and what was or was not runtime-tested.
9. Production release is a separate step: only `main` is the production source. Do not promote or alter Production without explicit authorization.

## 5. Preview and release discipline

- Every Preview URL must be labeled with its branch and commit; never present different branch previews as interchangeable.
- Do not send an untested Preview URL as a working replacement for the owner's known-good URL.
- Keep the known-good baseline available until its replacement passes the same acceptance checks.
- Before release, confirm the target commit, Cloudflare environment, D1 binding, deployment status, and smoke-test results.
- If a Preview fails, diagnose the specific branch's code, environment bindings, migrations, and runtime logs. Do not guess that the database or credentials are the cause.

## 6. UX and data integrity

- Preserve existing user workflows and data completeness unless the owner explicitly approves a behavior change.
- Redesign presentation without silently removing fields, actions, filters, or table information.
- Keep the established M101 visual direction: professional, clean, modern, readable, and business-focused. Avoid retro-terminal styling and oversized controls.
- Check responsive layouts at mobile and desktop sizes.
- Do not claim a feature is complete based only on a mockup, code generation, or build output.

## 7. Definition of done

A change is complete only when all applicable items are true:

- [ ] Built from the canonical baseline and scoped to the requested task.
- [ ] Existing login and protected routes remain functional.
- [ ] Existing records and workflows remain intact.
- [ ] Preview uses isolated Preview D1; Production configuration/data remain untouched.
- [ ] Build and lint checks pass, or failures are explicitly reported.
- [ ] The changed flow has been tested at runtime in Preview.
- [ ] Branch, commit, Preview URL, test evidence, and remaining limitations are reported.

If any item cannot be verified, mark it **not verified** rather than implying success.
