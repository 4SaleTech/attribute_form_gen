#!/usr/bin/env node

// Standalone test for redirect URL functionality
// This tests the exact logic from submit.ts

function evaluateTemplate(template, context) {
    if (!template.includes('{{')) {
        return template;
    }
    const templateRegex = /\{\{\.([\w.]+)\}\}/g;
    return template.replace(templateRegex, (match, varName) => {
        let value = context[varName];
        if (value === undefined && varName.includes('.')) {
            const parts = varName.split('.');
            value = context;
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

function encodeTemplateInURL(url, context) {
    if (!url.includes('{{')) {
        return url;
    }

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
            const evaluatedPathname = evaluateTemplate(urlObj.pathname, context);
            const evaluatedSearch = urlObj.search;
            
            const existingParams = new URLSearchParams(evaluatedSearch);
            const newParams = new URLSearchParams();
            
            existingParams.forEach((value, key) => {
                const evaluatedValue = value.includes('{{') 
                    ? evaluateTemplate(value, context) 
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
                return evaluateTemplate(base, context);
            }
            
            const evaluatedBase = evaluateTemplate(base, context);
            const queryParams = new URLSearchParams(queryString);
            const newParams = new URLSearchParams();
            
            queryParams.forEach((value, key) => {
                const evaluatedValue = value.includes('{{') 
                    ? evaluateTemplate(value, context) 
                    : value;
                newParams.append(key, evaluatedValue);
            });
            
            const queryStr = newParams.toString();
            return queryStr ? `${evaluatedBase}?${queryStr}` : evaluatedBase;
        }
    } catch (e) {
        return evaluateTemplate(url, context);
    }
}

// Test cases
const tests = [
    {
        name: 'submissionId template replacement',
        url: 'http://example.com/page?submissionId={{.submissionId}}',
        context: { submissionId: 29 },
        expected: 'http://example.com/page?submissionId=29'
    },
    {
        name: 'Team reported issue - existing params + submissionId',
        url: 'http://localhost:3000/ar/listing/booking?categoryId=1100&formSubmissionId={{.submissionId}}',
        context: { submissionId: 29 },
        expected: 'http://localhost:3000/ar/listing/booking?categoryId=1100&formSubmissionId=29'
    },
    {
        name: 'Multiple existing params',
        url: 'http://example.com/page?a=1&b=2&submissionId={{.submissionId}}',
        context: { submissionId: 29 },
        expected: 'http://example.com/page?a=1&b=2&submissionId=29'
    },
    {
        name: 'formSubmissionId alias',
        url: 'http://example.com/page?formSubmissionId={{.submissionId}}',
        context: { submissionId: 29 },
        expected: 'http://example.com/page?formSubmissionId=29'
    },
    {
        name: 'formSubmissionId template variable (the actual issue)',
        url: 'http://localhost:3000/ar/listing/booking?categoryId=1100&formSubmissionId={{.formSubmissionId}}',
        context: { submissionId: 29, formSubmissionId: 29 },
        expected: 'http://localhost:3000/ar/listing/booking?categoryId=1100&formSubmissionId=29'
    },
    {
        name: 'Undefined submissionId',
        url: 'http://example.com/page?submissionId={{.submissionId}}',
        context: { submissionId: undefined },
        expected: 'http://example.com/page?submissionId='
    },
    {
        name: 'Relative URL',
        url: '/ar/listing/booking?categoryId=1100&formSubmissionId={{.submissionId}}',
        context: { submissionId: 29 },
        expected: '/ar/listing/booking?categoryId=1100&formSubmissionId=29'
    },
    {
        name: 'Multiple template vars',
        url: 'http://example.com/page?formId={{.formId}}&submissionId={{.submissionId}}',
        context: { formId: 'test-form', submissionId: 29 },
        expected: 'http://example.com/page?formId=test-form&submissionId=29'
    }
];

console.log('🧪 Testing Redirect URL Template Evaluation\n');
console.log('='.repeat(60));

let passed = 0;
let failed = 0;

tests.forEach((test, i) => {
    const result = encodeTemplateInURL(test.url, test.context);
    const success = result === test.expected;
    
    if (success) {
        passed++;
        console.log(`✅ Test ${i + 1}: ${test.name}`);
    } else {
        failed++;
        console.log(`❌ Test ${i + 1}: ${test.name}`);
        console.log(`   Input:    ${test.url}`);
        console.log(`   Expected: ${test.expected}`);
        console.log(`   Actual:   ${result}`);
    }
    
    // Additional checks for encoding issues
    if (result.includes('%3F') || result.includes('%3D')) {
        console.log(`   ⚠️  WARNING: Found encoded characters in result!`);
        if (result.includes('%3F')) console.log(`      Found %3F (encoded ?)`);
        if (result.includes('%3D')) console.log(`      Found %3D (encoded =)`);
    }
    
    // Verify URL can be parsed
    try {
        if (result.startsWith('http')) {
            const urlObj = new URL(result);
            const params = Object.fromEntries(urlObj.searchParams);
            if (test.context.submissionId) {
                const foundId = params.submissionId || params.formSubmissionId;
                if (foundId !== String(test.context.submissionId)) {
                    console.log(`   ⚠️  Submission ID mismatch: expected ${test.context.submissionId}, found ${foundId}`);
                }
            }
        }
    } catch (e) {
        // Relative URL, skip parsing
    }
});

console.log('\n' + '='.repeat(60));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
    console.log('✅ All tests passed!');
    process.exit(0);
} else {
    console.log('❌ Some tests failed');
    process.exit(1);
}

