# Amplitude Logging Production Troubleshooting Guide

## Common Reasons Why Amplitude Logging Fails in Production

### 1. **Module Loading Timeout** ⏱️
**Issue**: Amplitude module has a 5-second timeout for loading
- **Location**: `packages/renderer/src/analytics/amplitude.ts:49-51`
- **Symptom**: Module fails to load, `amplitudeLoadFailed` is set to `true`
- **Check**: Browser console for `[Amplitude] Failed to load module, analytics disabled: Amplitude import timeout`

**Solutions**:
- Check network connectivity to `api2.amplitude.com`
- Verify CDN/network isn't blocking Amplitude SDK
- Increase timeout if needed (currently 5000ms)

---

### 2. **Content Security Policy (CSP) Blocking** 🚫
**Issue**: CSP headers blocking Amplitude scripts or API calls
- **Symptom**: Network requests to `api2.amplitude.com` fail with CSP errors
- **Check**: Browser console for CSP violation errors

**Solutions**:
- Add `api2.amplitude.com` to CSP `connect-src` directive
- Add `*.amplitude.com` to CSP `script-src` if loading scripts
- Check nginx/server headers: `docker/nginx.conf` and `apps/admin/nginx.conf`

**Example CSP fix**:
```nginx
add_header Content-Security-Policy "connect-src 'self' api2.amplitude.com *.amplitude.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' *.amplitude.com;";
```

---

### 3. **Ad Blockers / Privacy Extensions** 🛡️
**Issue**: Browser extensions blocking Amplitude tracking
- **Symptom**: No network requests to Amplitude, no console errors
- **Common blockers**: uBlock Origin, Privacy Badger, Ghostery

**Solutions**:
- Test in incognito mode with extensions disabled
- Check if requests appear in Network tab (filter by "amplitude")
- Consider server-side tracking as alternative

---

### 4. **Build/Bundling Issues** 📦
**Issue**: Vite plugin `fixAmplitudePlugin` might not work correctly in production builds
- **Location**: `apps/form/vite.config.ts:6-42`
- **Symptom**: `frustrationPlugin` errors in production but not development

**Solutions**:
- Verify production build includes Amplitude dependencies
- Check if `optimizeDeps.exclude` is working correctly
- Test production build locally before deployment
- Check browser console for module import errors

**Debug steps**:
```bash
# Build production bundle
cd apps/form
pnpm build

# Check if Amplitude is included
grep -r "amplitude" dist/
```

---

### 5. **JavaScript Errors Preventing Initialization** ❌
**Issue**: Any uncaught error before Amplitude init prevents loading
- **Symptom**: Form loads but Amplitude never initializes
- **Check**: Browser console for any red errors

**Solutions**:
- Check browser console for errors
- Verify `FormView.tsx` loads without errors
- Ensure `initAmplitude()` is called (line 358)
- Check if `sessionId` is being extracted correctly

---

### 6. **API Key Issues** 🔑
**Issue**: Invalid, expired, or wrong Amplitude API key
- **Location**: `packages/renderer/src/analytics/amplitude.ts:8`
- **Current Key**: `ea353a2eec64ceddbb5cde4f6d9ee886`
- **Symptom**: Events sent but not appearing in Amplitude dashboard

**Solutions**:
- Verify API key in Amplitude dashboard → Settings → Projects
- Check if API key is correct for production environment
- Ensure API key has correct permissions
- Test with a known working key

---

### 7. **Feature Flag Disabled** 🚩
**Issue**: `AMPLITUDE_ENABLED` flag set to `false`
- **Location**: `packages/renderer/src/analytics/amplitude.ts:12`
- **Symptom**: No Amplitude initialization, no errors

**Solutions**:
- Verify `AMPLITUDE_ENABLED = true` in production build
- Check if environment variable overrides this
- Ensure build process doesn't change this value

---

### 8. **Network/CORS Issues** 🌐
**Issue**: CORS or network blocking Amplitude API calls
- **Symptom**: Network requests fail with CORS errors
- **Check**: Network tab → Filter by "amplitude" → Check request status

**Solutions**:
- Verify `api2.amplitude.com` is accessible from production
- Check firewall/security groups allow outbound HTTPS
- Verify DNS resolution for Amplitude domains
- Test with curl: `curl -I https://api2.amplitude.com/2/httpapi`

---

### 9. **Session ID Not Being Extracted** 🆔
**Issue**: `sessionId` query parameter not being read correctly
- **Location**: `packages/renderer/src/ui/FormView.tsx:311`
- **Symptom**: Events tracked but with wrong/missing session IDs

**Solutions**:
- Verify URL contains `?sessionId=...` parameter
- Check browser console: `window.__sessionId` should be set
- Ensure URL parsing works in production (no encoding issues)

---

### 10. **Production Build Differences** 🏗️
**Issue**: Production build behaves differently than development
- **Symptom**: Works locally but not in production

**Solutions**:
- Compare development vs production bundle sizes
- Check if source maps are available for debugging
- Verify all dependencies are included in production build
- Test production build locally: `pnpm build && pnpm preview`

---

## Debugging Steps

### Step 1: Check Browser Console
```javascript
// Open browser console and check:
window.__sessionId          // Should show session ID
window.__formConfig         // Should show form config
window.__locale             // Should show locale

// Check if Amplitude initialized:
window.amplitude            // Should exist if initialized
```

### Step 2: Check Network Tab
1. Open DevTools → Network tab
2. Filter by "amplitude"
3. Look for requests to `api2.amplitude.com/2/httpapi`
4. Check request status (should be 200)
5. Check request payload (should contain events)

### Step 3: Check for Errors
```javascript
// In browser console, check for Amplitude errors:
// Look for:
[Amplitude] Failed to load module
[Amplitude] Initialization error
[Amplitude] Plugin error detected
```

### Step 4: Test Amplitude Manually
```javascript
// In browser console:
await window.testAmplitudeEvents()
// This should trigger test events and show results
```

### Step 5: Verify API Key
1. Go to Amplitude Dashboard → Settings → Projects
2. Verify API key matches: `ea353a2eec64ceddbb5cde4f6d9ee886`
3. Check if project is active and receiving events

---

## Quick Diagnostic Checklist

- [ ] Browser console shows no JavaScript errors
- [ ] `window.__sessionId` is set correctly
- [ ] Network tab shows requests to `api2.amplitude.com`
- [ ] Requests return 200 status code
- [ ] No CSP violations in console
- [ ] Ad blockers disabled for testing
- [ ] API key is correct in Amplitude dashboard
- [ ] `AMPLITUDE_ENABLED = true` in code
- [ ] Production build includes Amplitude dependencies
- [ ] Form loads without errors

---

## Production-Specific Checks

### Nginx Configuration
Check `docker/nginx.conf` for CSP headers:
```nginx
# Should allow Amplitude
add_header Content-Security-Policy "connect-src 'self' api2.amplitude.com;";
```

### Docker/Container Environment
- Verify outbound HTTPS is allowed
- Check if firewall blocks `api2.amplitude.com`
- Verify DNS resolution works inside container

### CDN/Proxy Issues
- If using CloudFront/CDN, verify it doesn't block Amplitude
- Check if proxy strips/modifies headers
- Verify SSL/TLS certificates are valid

---

## Common Error Messages and Fixes

| Error Message | Likely Cause | Fix |
|--------------|---------------|-----|
| `Amplitude import timeout` | Network slow/blocked | Check network, increase timeout |
| `CSP violation` | Content Security Policy | Add Amplitude domains to CSP |
| `Failed to load module` | Build/bundling issue | Check Vite config, rebuild |
| `frustrationPlugin` error | Plugin import issue | Verify `fixAmplitudePlugin` works |
| No network requests | Ad blocker or disabled | Disable extensions, check flag |
| Events not in dashboard | API key issue | Verify API key in Amplitude |

---

## Testing in Production

### Test URL Format
```
https://attribute-form-generator.q84sale.com/{formId}/{version}?lang=en&sessionId=test-123
```

### Expected Behavior
1. Form loads successfully
2. Browser console shows: `[Amplitude]` initialization logs
3. Network tab shows POST to `api2.amplitude.com/2/httpapi`
4. Events appear in Amplitude dashboard within 1-2 minutes

### Debug Mode
Add `?testAmplitude=true` to URL to auto-run tests:
```
https://attribute-form-generator.q84sale.com/{formId}/{version}?lang=en&sessionId=test-123&testAmplitude=true
```

---

## Contact Points

If issues persist:
1. Check Amplitude dashboard for API key status
2. Verify Amplitude project is active
3. Review Amplitude documentation for API changes
4. Check Amplitude status page for outages

---

## Related Files

- `packages/renderer/src/analytics/amplitude.ts` - Main Amplitude integration
- `packages/renderer/src/ui/FormView.tsx` - Initialization logic
- `apps/form/vite.config.ts` - Build configuration
- `docker/nginx.conf` - Server headers/CSP


