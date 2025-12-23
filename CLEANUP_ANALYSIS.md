# Cleanup Analysis: Files Not Used by ECR Production Builds

## Summary

**Note**: All production versions (V9, V16, V17, etc.) use the same **root `Dockerfile`** which builds a combined image. The version number doesn't change which files are used.

Some files exist that are:
1. **Not used by production builds** (but may be used by other deployment methods)
2. **Build artifacts** (should be gitignored)
3. **Test files** (not part of Docker build)
4. **Documentation** (not needed in Docker image but useful for repo)

## Files Analysis

### ✅ SAFE TO REMOVE (Not Used by Production Builds)

#### Build Artifacts (Should be gitignored, not deleted)
- `apps/api/main` - Go binary build artifact
- `apps/api/server` - Go binary build artifact

**Action**: Add to `.gitignore`, then remove from git tracking

#### Standalone Test Files (Not in Docker build, not referenced)
These are manual testing files that aren't part of the test suite:

**HTML Test Files:**
- `test-form-submission-id.html`
- `test-native-bridge.html`
- `test-redirect-browser.html`
- `test-redirect-integration.html`
- `test-redirect-production.html`
- `test-redirect-query-params.html`
- `test-redirect-template.html`
- `test-cookie-quick.html`
- `test-cookie-user-token.html`

**JavaScript Test Files:**
- `test-redirect-debug.js`
- `test-redirect-fix.js`
- `test-redirect-standalone.js`
- `test-specific-form.js`
- `test-submission-id-template.js`

**Shell Test Scripts:**
- `test-form-submission.sh`
- `test-api.sh`
- `test-api-detailed.sh`
- `test-amplitude-events.sh`
- `test-full-coverage.sh`

**Other:**
- `create-all-fields-form.sh` - Not referenced anywhere

### ⚠️ CONDITIONALLY USED (Used by Alternative Deployment Methods)

#### Individual Dockerfiles
These are used by `scripts/build-ecr.sh` and `scripts/build-and-push-ecr.sh` for separate service builds, but NOT by the production build:

- `apps/admin/Dockerfile` - Used by `build-ecr.sh` for separate admin builds
- `apps/api/Dockerfile` - Used by `build-ecr.sh` for separate API builds  
- `apps/form/Dockerfile` - Used by `build-ecr.sh` for separate form builds

**Decision Needed**: 
- If you only use the combined Dockerfile (production builds), these can be removed
- If you use separate builds for some deployments, keep them

#### Alternative Build Scripts
- `scripts/build-ecr.sh` - Builds separate images (uses individual Dockerfiles)
- `scripts/build-and-push-ecr.sh` - Builds and pushes separate images
- `scripts/push-ecr.sh` - Pushes separate images

**Decision Needed**: 
- If the combined build is the only production method, these can be removed
- If you use separate builds, keep them

### 📝 DOCUMENTATION (Keep in Repo, Not in Docker)

These are useful for developers but not needed in Docker image:
- All `.md` files (documentation)
- `scripts/test-v3-urls.md`
- `test-amplitude-logs.md`
- `test-redirect-production-verification.md`

**Action**: Keep these - they're documentation, not build files

### 🔧 CONFIGURATION FILES (Keep - Needed for Development)

- `docker-compose.yml` - Local development
- `docker-compose.local.yml` - Local Docker deployment
- `docker-compose.prod.yml` - Production Docker Compose
- `docker-local-start.sh` - Local Docker helper script

**Action**: Keep - needed for local development

## Recommended Actions

### Phase 1: Clean Up Build Artifacts (Safe)

1. Update `.gitignore` to exclude build artifacts:
   ```
   # Go build artifacts
   apps/api/main
   apps/api/server
   ```

2. Remove build artifacts from git tracking:
   ```bash
   git rm apps/api/main apps/api/server
   ```

### Phase 2: Remove Unused Test Files (Safe)

Remove standalone test files that aren't part of the test suite:

```bash
# Remove HTML test files
git rm test-*.html test-cookie-*.html

# Remove JS test files  
git rm test-*.js

# Remove shell test scripts
git rm test-*.sh create-all-fields-form.sh
```

### Phase 3: Decide on Alternative Build Methods

**Question**: Do you use separate Docker builds (`build-ecr.sh`) or only the combined build (`build-and-push-production.sh`)?

**If only combined build (production):**
- Remove individual Dockerfiles: `apps/admin/Dockerfile`, `apps/api/Dockerfile`, `apps/form/Dockerfile`
- Remove separate build scripts: `scripts/build-ecr.sh`, `scripts/build-and-push-ecr.sh`, `scripts/push-ecr.sh`
- Update `DEPLOYMENT.md` to remove references to separate builds

**If you use both:**
- Keep everything, but document which is used for what

## Files Used by ECR Production Builds (For Reference)

See `ECR_V16_FILES.md` for complete list (same files used for all versions). Key files:
- Root `Dockerfile` ✅
- `docker/nginx.conf` ✅
- `docker/start.sh` ✅
- All source code in `apps/` and `packages/` ✅
- Configuration files (package.json, go.mod, etc.) ✅

## Verification Script

After cleanup, verify production build still works:

```bash
# Test build (dry run) - same Dockerfile used for all versions
docker build -f Dockerfile -t test-production .
```
