#!/usr/bin/env node

// Test script for specific form redirect URL
const FORM_ID = process.argv[2] || 'b97dd1d3-01d2-4c1f-81d8-64b4a20948d7';
const API_BASE = process.argv[3] || 'http://localhost:8080';

async function testFormRedirect() {
    console.log(`Testing form: ${FORM_ID}`);
    console.log(`API Base: ${API_BASE}\n`);

    try {
        // Fetch form configuration
        console.log('=== Step 1: Fetching form configuration ===');
        const formResponse = await fetch(`${API_BASE}/api/forms/${FORM_ID}/latest`);
        
        if (!formResponse.ok) {
            throw new Error(`HTTP ${formResponse.status}: ${formResponse.statusText}`);
        }
        
        const formConfig = await formResponse.json();
        console.log('✅ Form loaded');
        console.log(`   Form ID: ${formConfig.formId}`);
        console.log(`   Version: ${formConfig.version}\n`);

        // Check submit configuration
        const submitConfig = formConfig.submit || {};
        const redirectAction = submitConfig.actions?.find(a => a.type === 'redirect' && a.enabled);
        
        if (!redirectAction || !redirectAction.url) {
            console.log('❌ No redirect action configured or enabled');
            return;
        }

        const redirectUrlTemplate = redirectAction.url;
        const ordering = submitConfig.ordering || [];
        
        console.log('=== Redirect Configuration ===');
        console.log(`Redirect URL Template: ${redirectUrlTemplate}`);
        console.log(`Action Ordering: ${ordering.join(' → ')}\n`);

        // Check if submissionId will be available
        const serverPersistIndex = ordering.indexOf('server_persist');
        const redirectIndex = ordering.indexOf('redirect');
        
        if (serverPersistIndex === -1 || redirectIndex === -1) {
            console.log('⚠️  Warning: Cannot determine if server_persist runs before redirect');
        } else if (serverPersistIndex < redirectIndex) {
            console.log('✅ server_persist runs before redirect - submissionId will be available\n');
        } else {
            console.log('⚠️  WARNING: redirect runs before server_persist - submissionId will be undefined!\n');
        }

        // Check template variables
        const hasSubmissionId = redirectUrlTemplate.includes('{{.submissionId}}');
        const hasFormSubmissionId = redirectUrlTemplate.includes('{{.formSubmissionId}}');
        
        console.log('=== Template Variables ===');
        console.log(`Contains {{.submissionId}}: ${hasSubmissionId ? '✅ Yes' : '❌ No'}`);
        console.log(`Contains {{.formSubmissionId}}: ${hasFormSubmissionId ? '✅ Yes' : '❌ No'}\n`);

        // Test template evaluation
        console.log('=== Step 2: Testing Template Evaluation ===');
        
        const testSubmissionId = 123; // Test value
        const context = {
            formId: formConfig.formId,
            version: formConfig.version,
            submittedAt: Date.now(),
            submissionId: testSubmissionId,
            formSubmissionId: testSubmissionId, // Alias
            answers: {},
            meta: {}
        };

        // Simulate encodeTemplateInURL
        function evaluateTemplate(template, ctx) {
            if (!template.includes('{{')) return template;
            const regex = /\{\{\.([\w.]+)\}\}/g;
            return template.replace(regex, (match, varName) => {
                let value = ctx[varName];
                if (value === undefined && varName.includes('.')) {
                    const parts = varName.split('.');
                    value = ctx;
                    for (const part of parts) {
                        if (value && typeof value === 'object') {
                            value = value[part];
                        } else {
                            value = undefined;
                            break;
                        }
                    }
                }
                return value != null ? String(value) : '';
            });
        }

        function encodeTemplateInURL(url, ctx) {
            if (!url.includes('{{')) return url;

            try {
                let isAbsolute = false;
                let urlObj = null;
                try {
                    urlObj = new URL(url);
                    isAbsolute = true;
                } catch {
                    isAbsolute = false;
                }

                if (isAbsolute && urlObj) {
                    const evaluatedPathname = evaluateTemplate(urlObj.pathname, ctx);
                    const evaluatedSearch = urlObj.search;
                    
                    const existingParams = new URLSearchParams(evaluatedSearch);
                    const newParams = new URLSearchParams();
                    
                    existingParams.forEach((value, key) => {
                        const evaluatedValue = value.includes('{{') 
                            ? evaluateTemplate(value, ctx) 
                            : value;
                        newParams.append(key, evaluatedValue);
                    });
                    
                    const resultUrl = new URL(evaluatedPathname, urlObj.origin);
                    newParams.forEach((value, key) => {
                        resultUrl.searchParams.append(key, value);
                    });
                    
                    return resultUrl.toString();
                } else {
                    const [base, queryString] = url.split('?');
                    
                    if (!queryString) {
                        return evaluateTemplate(base, ctx);
                    }
                    
                    const evaluatedBase = evaluateTemplate(base, ctx);
                    const queryParams = new URLSearchParams(queryString);
                    const newParams = new URLSearchParams();
                    
                    queryParams.forEach((value, key) => {
                        const evaluatedValue = value.includes('{{') 
                            ? evaluateTemplate(value, ctx) 
                            : value;
                        newParams.append(key, evaluatedValue);
                    });
                    
                    const queryStr = newParams.toString();
                    return queryStr ? `${evaluatedBase}?${queryStr}` : evaluatedBase;
                }
            } catch (e) {
                return evaluateTemplate(url, ctx);
            }
        }

        const evaluatedUrl = encodeTemplateInURL(redirectUrlTemplate, context);
        
        console.log(`Template URL: ${redirectUrlTemplate}`);
        console.log(`Evaluated URL: ${evaluatedUrl}\n`);

        // Parse and check
        let urlObj;
        try {
            urlObj = new URL(evaluatedUrl);
        } catch {
            if (evaluatedUrl.includes('?')) {
                const [path, query] = evaluatedUrl.split('?');
                const params = new URLSearchParams(query);
                urlObj = { searchParams: params };
            } else {
                urlObj = { searchParams: new URLSearchParams() };
            }
        }

        const params = Object.fromEntries(urlObj.searchParams);
        
        console.log('=== Evaluation Results ===');
        console.log('Query Parameters:');
        Object.entries(params).forEach(([key, value]) => {
            console.log(`  ${key} = ${value}`);
        });
        console.log('');

        // Check for issues
        let hasIssues = false;
        
        if (hasSubmissionId || hasFormSubmissionId) {
            const foundId = params.submissionId || params.formSubmissionId;
            if (foundId === String(testSubmissionId)) {
                console.log('✅ Submission ID correctly evaluated!');
            } else if (foundId === '' || foundId === undefined) {
                console.log('❌ Submission ID is empty or missing!');
                hasIssues = true;
            } else {
                console.log(`⚠️  Submission ID mismatch: expected ${testSubmissionId}, found ${foundId}`);
                hasIssues = true;
            }
        }

        // Check for encoding issues
        if (evaluatedUrl.includes('%3F') || evaluatedUrl.includes('%3D')) {
            console.log('❌ ENCODING ISSUE DETECTED!');
            if (evaluatedUrl.includes('%3F')) console.log('   Found %3F (encoded ?)');
            if (evaluatedUrl.includes('%3D')) console.log('   Found %3D (encoded =)');
            hasIssues = true;
        } else {
            console.log('✅ No encoding issues detected');
        }

        // Check if & and = are present (should be)
        if (evaluatedUrl.includes('&') && evaluatedUrl.includes('=')) {
            console.log('✅ URL separators (& and =) are correct');
        }

        console.log('\n=== Summary ===');
        if (hasIssues) {
            console.log('❌ Issues found - redirect URL may not work correctly');
            process.exit(1);
        } else {
            console.log('✅ All checks passed - redirect URL should work correctly!');
            process.exit(0);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.message.includes('fetch')) {
            console.error('\nMake sure the API is running at', API_BASE);
        }
        process.exit(1);
    }
}

testFormRedirect();





