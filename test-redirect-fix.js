#!/usr/bin/env node

// Test script for redirect URL query parameter fix

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
        let strValue = '';
        if (value === null || value === undefined) {
            strValue = '';
        } else if (typeof value === 'string') {
            strValue = value;
        } else if (typeof value === 'number') {
            strValue = String(value);
        } else if (typeof value === 'boolean') {
            strValue = value ? 'true' : 'false';
        } else {
            strValue = String(value);
        }
        return strValue;
    });
}

function encodeTemplateInURL(url, context) {
    if (!url.includes('{{')) {
        return url;
    }

    try {
        // Try to parse as absolute URL first
        let isAbsolute = false;
        let urlObj = null;
        try {
            urlObj = new URL(url);
            isAbsolute = true;
        } catch {
            // Not an absolute URL, will handle as relative
            isAbsolute = false;
        }

        if (isAbsolute && urlObj) {
            // Handle absolute URLs using URL object to preserve existing query params
            const evaluatedPathname = evaluateTemplate(urlObj.pathname, context);
            const evaluatedSearch = urlObj.search; // Keep original search string
            
            // Parse existing query parameters
            const existingParams = new URLSearchParams(evaluatedSearch);
            
            // Evaluate templates in query parameter values
            const newParams = new URLSearchParams();
            existingParams.forEach((value, key) => {
                // Evaluate template in the value
                const evaluatedValue = value.includes('{{') 
                    ? evaluateTemplate(value, context) 
                    : value;
                newParams.append(key, evaluatedValue);
            });
            
            // Build the final URL
            const resultUrl = new URL(evaluatedPathname, urlObj.origin);
            newParams.forEach((value, key) => {
                resultUrl.searchParams.append(key, value);
            });
            
            return resultUrl.toString();
        } else {
            // Handle relative URLs (starting with /) or other formats
            // Split URL into base and query string
            const [base, queryString] = url.split('?');
            
            if (!queryString) {
                // No query string, just evaluate template in path
                return evaluateTemplate(base, context);
            }
            
            // Evaluate template in base URL
            const evaluatedBase = evaluateTemplate(base, context);
            
            // Parse query string - URLSearchParams handles encoding automatically
            const queryParams = new URLSearchParams(queryString);
            const newParams = new URLSearchParams();
            
            // Process all existing query parameters
            queryParams.forEach((value, key) => {
                // Evaluate template in the value if it contains placeholders
                const evaluatedValue = value.includes('{{') 
                    ? evaluateTemplate(value, context) 
                    : value;
                // URLSearchParams will handle proper encoding automatically
                newParams.append(key, evaluatedValue);
            });
            
            // Build query string - URLSearchParams.toString() properly formats it
            const queryStr = newParams.toString();
            return queryStr ? `${evaluatedBase}?${queryStr}` : evaluatedBase;
        }
    } catch (e) {
        console.error('Error encoding URL:', e);
        // Fallback: just evaluate template without special encoding
        return evaluateTemplate(url, context);
    }
}

// Test cases
const testContext = {
    formId: 'test-form',
    submissionId: 29,
    formSubmissionId: 29
};

const tests = [
    {
        name: 'Relative URL with existing query param (THE BUG)',
        input: 'http://localhost:3000/ar/listing/booking?categoryId=1100&formSubmissionId={{.formSubmissionId}}',
        expected: 'http://localhost:3000/ar/listing/booking?categoryId=1100&formSubmissionId=29'
    },
    {
        name: 'Absolute URL with existing query param',
        input: 'http://localhost:3000/ar/listing/booking?categoryId=1100&formSubmissionId={{.formSubmissionId}}',
        expected: 'http://localhost:3000/ar/listing/booking?categoryId=1100&formSubmissionId=29'
    },
    {
        name: 'Multiple existing params',
        input: 'http://localhost:3000/page?a=1&b=2&formId={{.formId}}',
        expected: 'http://localhost:3000/page?a=1&b=2&formId=test-form'
    },
    {
        name: 'Only template params',
        input: 'http://localhost:3000/page?formId={{.formId}}&submissionId={{.submissionId}}',
        expected: 'http://localhost:3000/page?formId=test-form&submissionId=29'
    },
    {
        name: 'Relative path',
        input: '/ar/listing/booking?categoryId=1100&formSubmissionId={{.formSubmissionId}}',
        expected: '/ar/listing/booking?categoryId=1100&formSubmissionId=29'
    }
];

console.log('Testing redirect URL query parameter fix...\n');

let allPassed = true;
tests.forEach((test, index) => {
    const result = encodeTemplateInURL(test.input, testContext);
    const passed = result === test.expected;
    allPassed = allPassed && passed;
    
    console.log(`Test ${index + 1}: ${test.name}`);
    console.log(`  Input:    ${test.input}`);
    console.log(`  Expected: ${test.expected}`);
    console.log(`  Actual:   ${result}`);
    console.log(`  Result:   ${passed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (!passed) {
        console.log(`  ERROR: URLs don't match!`);
        // Decode to show what's different
        try {
            const expectedUrl = new URL(test.expected);
            const actualUrl = new URL(result);
            console.log(`  Expected params:`, Object.fromEntries(expectedUrl.searchParams));
            console.log(`  Actual params:`, Object.fromEntries(actualUrl.searchParams));
        } catch (e) {
            // Relative URL, can't parse with URL
        }
    }
    console.log('');
});

console.log(`\n${allPassed ? '✅ All tests passed!' : '❌ Some tests failed'}`);
process.exit(allPassed ? 0 : 1);





