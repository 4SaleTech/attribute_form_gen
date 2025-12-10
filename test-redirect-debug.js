#!/usr/bin/env node

// Debug script to test redirect URL encoding with detailed logging

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
    console.log('\n=== Processing URL ===');
    console.log('Input URL:', url);
    
    if (!url.includes('{{')) {
        console.log('No templates found, returning as-is');
        return url;
    }

    try {
        // Try to parse as absolute URL first
        let isAbsolute = false;
        let urlObj = null;
        try {
            urlObj = new URL(url);
            isAbsolute = true;
            console.log('Parsed as absolute URL');
            console.log('  Origin:', urlObj.origin);
            console.log('  Pathname:', urlObj.pathname);
            console.log('  Search:', urlObj.search);
        } catch {
            console.log('Not an absolute URL, treating as relative');
            isAbsolute = false;
        }

        if (isAbsolute && urlObj) {
            const evaluatedPathname = evaluateTemplate(urlObj.pathname, context);
            const evaluatedSearch = urlObj.search;
            
            console.log('\n--- Processing absolute URL ---');
            console.log('Evaluated pathname:', evaluatedPathname);
            console.log('Original search:', evaluatedSearch);
            
            const existingParams = new URLSearchParams(evaluatedSearch);
            console.log('Parsed params:', Object.fromEntries(existingParams));
            
            const newParams = new URLSearchParams();
            existingParams.forEach((value, key) => {
                console.log(`  Processing param: ${key} = ${value}`);
                const evaluatedValue = value.includes('{{') 
                    ? evaluateTemplate(value, context) 
                    : value;
                console.log(`    Evaluated to: ${evaluatedValue}`);
                newParams.append(key, evaluatedValue);
            });
            
            const resultUrl = new URL(evaluatedPathname, urlObj.origin);
            newParams.forEach((value, key) => {
                resultUrl.searchParams.append(key, value);
            });
            
            const result = resultUrl.toString();
            console.log('Final URL:', result);
            console.log('Final search params:', Object.fromEntries(resultUrl.searchParams));
            return result;
        } else {
            const [base, queryString] = url.split('?');
            console.log('\n--- Processing relative URL ---');
            console.log('Base:', base);
            console.log('Query string:', queryString);
            
            if (!queryString) {
                return evaluateTemplate(base, context);
            }
            
            const evaluatedBase = evaluateTemplate(base, context);
            console.log('Evaluated base:', evaluatedBase);
            
            const queryParams = new URLSearchParams(queryString);
            console.log('Parsed query params:', Object.fromEntries(queryParams));
            
            const newParams = new URLSearchParams();
            queryParams.forEach((value, key) => {
                console.log(`  Processing param: ${key} = ${value}`);
                const evaluatedValue = value.includes('{{') 
                    ? evaluateTemplate(value, context) 
                    : value;
                console.log(`    Evaluated to: ${evaluatedValue}`);
                newParams.append(key, evaluatedValue);
            });
            
            const queryStr = newParams.toString();
            console.log('Final query string:', queryStr);
            console.log('Final params:', Object.fromEntries(newParams));
            
            const result = queryStr ? `${evaluatedBase}?${queryStr}` : evaluatedBase;
            console.log('Final URL:', result);
            return result;
        }
    } catch (e) {
        console.error('Error:', e);
        return evaluateTemplate(url, context);
    }
}

// Test the exact case from the team
const context = {
    formSubmissionId: 29,
    submissionId: 29,
    formId: 'test-form'
};

const testUrl = 'http://localhost:3000/ar/listing/booking?categoryId=1100&formSubmissionId={{.formSubmissionId}}';
const expected = 'http://localhost:3000/ar/listing/booking?categoryId=1100&formSubmissionId=29';

console.log('Testing exact team issue:');
console.log('Input:', testUrl);
console.log('Expected:', expected);

const result = encodeTemplateInURL(testUrl, context);

console.log('\n=== RESULT ===');
console.log('Expected:', expected);
console.log('Actual:  ', result);
console.log('Match:   ', result === expected ? '✅ YES' : '❌ NO');

if (result !== expected) {
    console.log('\n=== DIFF ANALYSIS ===');
    const expectedUrl = new URL(expected);
    const actualUrl = new URL(result);
    
    console.log('Expected params:', Object.fromEntries(expectedUrl.searchParams));
    console.log('Actual params:  ', Object.fromEntries(actualUrl.searchParams));
    
    // Check for encoding issues
    if (result.includes('%3F') || result.includes('%3D')) {
        console.log('\n⚠️  WARNING: Found encoded ? or = characters!');
        console.log('  %3F = ?');
        console.log('  %3D = =');
    }
}

process.exit(result === expected ? 0 : 1);





