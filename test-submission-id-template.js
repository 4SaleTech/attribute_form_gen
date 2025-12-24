#!/usr/bin/env node

// Test script to verify {{.submissionId}} template works correctly

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
        console.error('Error:', e);
        return evaluateTemplate(url, context);
    }
}

// Test cases
const testCases = [
    {
        name: 'submissionId in query param',
        url: 'http://example.com/page?submissionId={{.submissionId}}',
        context: { submissionId: 123 },
        expected: 'http://example.com/page?submissionId=123'
    },
    {
        name: 'submissionId with existing params',
        url: 'http://example.com/page?categoryId=1100&submissionId={{.submissionId}}',
        context: { submissionId: 29 },
        expected: 'http://example.com/page?categoryId=1100&submissionId=29'
    },
    {
        name: 'submissionId undefined (should be empty)',
        url: 'http://example.com/page?submissionId={{.submissionId}}',
        context: { submissionId: undefined },
        expected: 'http://example.com/page?submissionId='
    },
    {
        name: 'submissionId null (should be empty)',
        url: 'http://example.com/page?submissionId={{.submissionId}}',
        context: { submissionId: null },
        expected: 'http://example.com/page?submissionId='
    },
    {
        name: 'submissionId not in context (should be empty)',
        url: 'http://example.com/page?submissionId={{.submissionId}}',
        context: {},
        expected: 'http://example.com/page?submissionId='
    },
    {
        name: 'formSubmissionId alias',
        url: 'http://example.com/page?formSubmissionId={{.submissionId}}',
        context: { submissionId: 29 },
        expected: 'http://example.com/page?formSubmissionId=29'
    },
    {
        name: 'Multiple template vars including submissionId',
        url: 'http://example.com/page?formId={{.formId}}&submissionId={{.submissionId}}',
        context: { formId: 'test-form', submissionId: 29 },
        expected: 'http://example.com/page?formId=test-form&submissionId=29'
    }
];

console.log('Testing {{.submissionId}} template...\n');

let allPassed = true;
testCases.forEach((test, i) => {
    const result = encodeTemplateInURL(test.url, test.context);
    const passed = result === test.expected;
    allPassed = allPassed && passed;
    
    console.log(`Test ${i + 1}: ${test.name}`);
    console.log(`  URL:     ${test.url}`);
    console.log(`  Context: submissionId=${test.context.submissionId}`);
    console.log(`  Expected: ${test.expected}`);
    console.log(`  Actual:   ${result}`);
    console.log(`  Result:   ${passed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (!passed) {
        console.log(`  ⚠️  MISMATCH!`);
    }
    console.log('');
});

console.log(`\n${allPassed ? '✅ All tests passed!' : '❌ Some tests failed'}`);

// Test the actual context structure from the code
console.log('\n=== Testing with actual context structure ===');
const actualContext = {
    formId: 'test-form',
    version: 1,
    submittedAt: Date.now(),
    submissionId: 29,  // This is what gets passed from the pipeline
    answers: {},
    meta: {}
};

const actualUrl = 'http://localhost:3000/page?categoryId=1100&submissionId={{.submissionId}}';
const actualResult = encodeTemplateInURL(actualUrl, actualContext);
console.log('Context:', actualContext);
console.log('URL:', actualUrl);
console.log('Result:', actualResult);
console.log('Expected: http://localhost:3000/page?categoryId=1100&submissionId=29');
console.log('Match:', actualResult === 'http://localhost:3000/page?categoryId=1100&submissionId=29' ? '✅ YES' : '❌ NO');

process.exit(allPassed ? 0 : 1);







