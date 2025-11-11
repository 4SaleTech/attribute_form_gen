# API Test Results

## Test Summary

**Date:** November 11, 2025  
**Server:** http://localhost:8080  
**Database:** Staging (form_snapshots table)

## ✅ Working Endpoints

1. **GET /api/health** - ✓ Working
   - Returns: `{"ok":true}`
   - Status: 200

2. **GET /api/forms** (Admin) - ✓ Working
   - Authentication: Bearer token required
   - Returns: Array of forms
   - Found: 12 forms in database

3. **POST /api/forms/publish** (Admin) - ✓ Working
   - Authentication: Bearer token required
   - Creates new forms successfully
   - Status: 200

4. **POST /api/forms/create** (Public with API Key) - ✓ Working
   - Authentication: X-API-Key header or api_key query parameter
   - Both authentication methods work
   - Status: 200

5. **GET /api/attributes** (Admin) - ✓ Working
   - Returns: Array of attributes
   - Found: 23 attributes

6. **GET /api/questions** (Admin) - ✓ Working
   - Returns: Array of questions
   - Found: 23 questions

7. **GET /api/submissions** (Admin) - ✓ Working
   - Returns: Array of submissions

8. **POST /api/uploads/sign** - ✓ Working
   - Generates Cloudinary upload signatures
   - Status: 200

9. **POST /api/forms/generate** - ✓ Working
   - Generates form configuration
   - Status: 200

10. **POST /api/submissions** - ✓ Working (Error handling)
    - Correctly rejects invalid form IDs
    - Status: 400 for invalid forms

11. **Authentication** - ✓ Working
    - Unauthorized access correctly returns 401
    - Invalid tokens correctly rejected
    - API key authentication works (header and query)

## ❌ Issues Found

### 1. **GET /api/config** - Returns 404

**Status:** ❌ FAILING  
**Expected:** 200 OK  
**Actual:** 404 Not Found

**Details:**
- Endpoint is registered in `server.go` line 77
- Route: `api.GET("/config", ...)`
- Server may need restart to pick up code changes, OR
- There may be a routing conflict

**Code Location:**
```go
// apps/api/internal/server/server.go:77
api.GET("/config", func(c *gin.Context) {
    c.JSON(http.StatusOK, gin.H{
        "nextjsPost": gin.H{
            "url":     s.cfg.NextJSPostURL,
            "enabled": s.cfg.NextJSPostEnabled,
        },
    })
})
```

**Recommendation:**
- Restart the server to ensure latest code is running
- Check for route conflicts or middleware issues

### 2. **Form ID Empty in Duplicate Detection**

**Status:** ⚠️ PARTIAL ISSUE  
**Details:**
- When duplicate forms are detected, the response includes `"formId": ""`
- The duplicate detection query finds existing forms but form_id column appears empty
- This may be a database issue where form_id values are empty strings

**Example Response:**
```json
{
  "formId": "",
  "isDuplicate": true,
  "urls": {
    "ar": "http://localhost:8080//1?lang=ar",
    "en": "http://localhost:8080//1?lang=en"
  },
  "version": 1
}
```

**Code Location:**
```go
// apps/api/internal/serverhandlers/forms.go:191
row = db.QueryRow("SELECT form_id, version FROM form_snapshots WHERE config_hash = ? ORDER BY version DESC LIMIT 1", configHash)
```

**Recommendation:**
- Check database: `SELECT form_id, version FROM form_snapshots WHERE form_id IS NOT NULL AND form_id != '' LIMIT 10;`
- Verify form_id is being set correctly on INSERT
- Check if formId is optional in request and defaults to empty string

### 3. **Get Form Latest/Version Endpoints**

**Status:** ⚠️ NOT FULLY TESTED  
**Reason:** Could not test because formId was empty in test responses

**Endpoints:**
- `GET /api/forms/:formId/latest`
- `GET /api/forms/:formId/:version`

**Recommendation:**
- Test with a form that has a valid formId
- Verify these endpoints work correctly with real form IDs

## Test Statistics

- **Total Endpoints Tested:** 15
- **Working:** 13
- **Failing:** 1 (config endpoint)
- **Partial Issues:** 1 (empty formId)
- **Not Tested:** 2 (form retrieval endpoints)

## Recommendations

1. **Fix Config Endpoint:**
   - Restart the server to ensure latest code is running
   - Verify route registration order
   - Check for middleware conflicts

2. **Investigate Empty Form IDs:**
   - Check database for forms with empty form_id
   - Verify formId generation logic
   - Ensure formId is required or has proper default

3. **Complete Testing:**
   - Test form retrieval endpoints with valid form IDs
   - Test webhook endpoints (create, list, update, delete, test)
   - Test attribute/question CRUD operations
   - Test form deletion endpoint

4. **Server Restart:**
   - Consider restarting the server to ensure all code changes (including form_snapshots migration) are active

## Next Steps

1. Restart the API server
2. Re-test the config endpoint
3. Investigate empty form_id issue in database
4. Complete testing of remaining endpoints (webhooks, CRUD operations)

