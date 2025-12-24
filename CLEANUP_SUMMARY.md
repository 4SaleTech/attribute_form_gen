# Cleanup Summary: Files Not Used by ECR Production Builds (V17+)

**Note**: All production versions (V9, V16, V17, etc.) use the same root `Dockerfile`, so the files used are identical regardless of version number.

## ✅ Safe to Remove (19 files found)

### Build Artifacts (2 files)
These are compiled binaries that shouldn't be in git:
- `apps/api/main`
- `apps/api/server`

**Status**: Already added to `.gitignore`

### Standalone Test Files (17 files)
These are manual test files not part of the Docker build or test suite:

**HTML Files (7):**
- `test-form-submission-id.html`
- `test-native-bridge.html`
- `test-redirect-browser.html`
- `test-redirect-integration.html`
- `test-redirect-production.html`
- `test-redirect-query-params.html`
- `test-redirect-template.html`

**JavaScript Files (5):**
- `test-redirect-debug.js`
- `test-redirect-fix.js`
- `test-redirect-standalone.js`
- `test-specific-form.js`
- `test-submission-id-template.js`

**Shell Scripts (5):**
- `test-amplitude-events.sh`
- `test-api-detailed.sh`
- `test-api.sh`
- `test-form-submission.sh`
- `create-all-fields-form.sh`

## ⚠️ Decision Needed: Alternative Build Files

These files are used by `scripts/build-ecr.sh` for separate service builds, but NOT by the production build (V17):

### Individual Dockerfiles (3 files)
- `apps/admin/Dockerfile` - Used by `build-ecr.sh`
- `apps/api/Dockerfile` - Used by `build-ecr.sh`
- `apps/form/Dockerfile` - Used by `build-ecr.sh`

### Alternative Build Scripts (3 files)
- `scripts/build-ecr.sh` - Builds separate images
- `scripts/build-and-push-ecr.sh` - Builds and pushes separate images
- `scripts/push-ecr.sh` - Pushes separate images

**Question**: Do you use these scripts for any deployments, or only the combined production build (V17)?

- **If only production build**: These can be removed
- **If you use both**: Keep them but document which is used for what

## 📋 How to Clean Up

### Step 1: Remove Safe Files (19 files)

Run the cleanup script:

```bash
# Preview what will be removed
./scripts/cleanup-unused-files.sh

# Actually remove the files
./scripts/cleanup-unused-files.sh --execute
```

This will:
- Remove build artifacts from git tracking
- Remove standalone test files
- Keep files that are tracked but not found locally

### Step 2: Review Alternative Build Files

Check if you use separate builds:

```bash
# Check if these scripts are referenced anywhere
grep -r "build-ecr.sh\|build-and-push-ecr.sh" . --exclude-dir=node_modules
```

If not used, you can remove:
- `apps/admin/Dockerfile`
- `apps/api/Dockerfile`
- `apps/form/Dockerfile`
- `scripts/build-ecr.sh`
- `scripts/build-and-push-ecr.sh`
- `scripts/push-ecr.sh`

### Step 3: Verify Production Build Still Works

After cleanup, test the build:

```bash
# Test Docker build (same Dockerfile used for all versions)
docker build -f Dockerfile -t test-production-cleanup .

# If successful, you're good to go!
```

## Files That Stay (Important!)

These are NOT removed because they're needed:

### For Development:
- All `.md` documentation files
- `docker-compose*.yml` files
- `scripts/test-*.sh` (if part of CI/CD)
- Configuration files

### For Production Build (V17):
- Root `Dockerfile` ✅
- `docker/nginx.conf` ✅
- `docker/start.sh` ✅
- All source code ✅
- All package.json, go.mod files ✅

## Next Steps

1. **Review the cleanup script output** (already run)
2. **Decide on alternative build files** (do you use separate builds?)
3. **Run cleanup**: `./scripts/cleanup-unused-files.sh --execute`
4. **Commit changes**: `git commit -m "Remove unused files not needed for ECR production builds"`
5. **Push**: `git push`
