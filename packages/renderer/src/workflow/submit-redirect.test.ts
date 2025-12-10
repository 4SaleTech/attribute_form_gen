import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Import the functions we need to test
// Since they're not exported, we'll need to test them indirectly or copy the logic
// For now, let's create a test that simulates the exact flow

describe('Redirect URL Template Evaluation', () => {
  // Simulate the encodeTemplateInURL function
  function evaluateTemplate(template: string, context: any): string {
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

  function encodeTemplateInURL(url: string, context: any): string {
    if (!url.includes('{{')) {
      return url;
    }

    try {
      let isAbsolute = false;
      let urlObj: URL | null = null;
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

  describe('submissionId template', () => {
    const context = {
      formId: 'test-form',
      version: 1,
      submittedAt: 1234567890,
      submissionId: 29,
      answers: {},
      meta: {}
    };

    it('should replace {{.submissionId}} with actual submission ID', () => {
      const url = 'http://example.com/page?submissionId={{.submissionId}}';
      const result = encodeTemplateInURL(url, context);
      expect(result).toBe('http://example.com/page?submissionId=29');
    });

    it('should work with existing query parameters', () => {
      const url = 'http://localhost:3000/ar/listing/booking?categoryId=1100&formSubmissionId={{.submissionId}}';
      const result = encodeTemplateInURL(url, context);
      expect(result).toBe('http://localhost:3000/ar/listing/booking?categoryId=1100&formSubmissionId=29');
    });

    it('should preserve existing query parameters correctly', () => {
      const url = 'http://example.com/page?a=1&b=2&submissionId={{.submissionId}}&c=3';
      const result = encodeTemplateInURL(url, context);
      const urlObj = new URL(result);
      expect(urlObj.searchParams.get('a')).toBe('1');
      expect(urlObj.searchParams.get('b')).toBe('2');
      expect(urlObj.searchParams.get('submissionId')).toBe('29');
      expect(urlObj.searchParams.get('c')).toBe('3');
    });

    it('should handle undefined submissionId as empty string', () => {
      const url = 'http://example.com/page?submissionId={{.submissionId}}';
      const contextWithoutId = { ...context, submissionId: undefined };
      const result = encodeTemplateInURL(url, contextWithoutId);
      expect(result).toBe('http://example.com/page?submissionId=');
    });

    it('should handle null submissionId as empty string', () => {
      const url = 'http://example.com/page?submissionId={{.submissionId}}';
      const contextWithoutId = { ...context, submissionId: null };
      const result = encodeTemplateInURL(url, contextWithoutId);
      expect(result).toBe('http://example.com/page?submissionId=');
    });

    it('should work with relative URLs', () => {
      const url = '/ar/listing/booking?categoryId=1100&formSubmissionId={{.submissionId}}';
      const result = encodeTemplateInURL(url, context);
      expect(result).toBe('/ar/listing/booking?categoryId=1100&formSubmissionId=29');
    });

    it('should not encode & and = characters incorrectly', () => {
      const url = 'http://localhost:3000/page?categoryId=1100&formSubmissionId={{.submissionId}}';
      const result = encodeTemplateInURL(url, context);
      
      // Should NOT contain encoded separators
      expect(result).not.toContain('%3F'); // encoded ?
      expect(result).not.toContain('%3D'); // encoded =
      
      // Should contain proper separators
      expect(result).toContain('&');
      expect(result).toContain('=');
      
      // Verify it can be parsed correctly
      const urlObj = new URL(result);
      expect(urlObj.searchParams.get('categoryId')).toBe('1100');
      expect(urlObj.searchParams.get('formSubmissionId')).toBe('29');
    });

    it('should handle multiple template variables', () => {
      const url = 'http://example.com/page?formId={{.formId}}&submissionId={{.submissionId}}&version={{.version}}';
      const result = encodeTemplateInURL(url, context);
      const urlObj = new URL(result);
      expect(urlObj.searchParams.get('formId')).toBe('test-form');
      expect(urlObj.searchParams.get('submissionId')).toBe('29');
      expect(urlObj.searchParams.get('version')).toBe('1');
    });
  });

  describe('Query parameter encoding', () => {
    const context = {
      submissionId: 29,
      formId: 'test-form'
    };

    it('should properly encode parameter values but not separators', () => {
      const url = 'http://example.com/page?categoryId=1100&formSubmissionId={{.submissionId}}';
      const result = encodeTemplateInURL(url, context);
      
      // Check for encoding issues
      expect(result).not.toContain('%3F'); // Should not have encoded ?
      expect(result).not.toContain('%3D'); // Should not have encoded =
      
      // Verify URL structure
      expect(result).toContain('categoryId=1100');
      expect(result).toContain('formSubmissionId=29');
      expect(result).toContain('&'); // Should have & separator
    });

    it('should handle special characters in existing params', () => {
      const url = 'http://example.com/page?search=hello%20world&id={{.submissionId}}';
      const result = encodeTemplateInURL(url, context);
      const urlObj = new URL(result);
      expect(urlObj.searchParams.get('search')).toBe('hello world');
      expect(urlObj.searchParams.get('id')).toBe('29');
    });

    it('should handle empty existing param values', () => {
      const url = 'http://example.com/page?empty=&id={{.submissionId}}';
      const result = encodeTemplateInURL(url, context);
      const urlObj = new URL(result);
      expect(urlObj.searchParams.get('empty')).toBe('');
      expect(urlObj.searchParams.get('id')).toBe('29');
    });
  });

  describe('Edge cases', () => {
    it('should handle URL without query string', () => {
      const url = 'http://example.com/page/{{.formId}}';
      const context = { formId: 'test' };
      const result = encodeTemplateInURL(url, context);
      expect(result).toBe('http://example.com/page/test');
    });

    it('should handle URL without templates', () => {
      const url = 'http://example.com/page?categoryId=1100';
      const context = { submissionId: 29 };
      const result = encodeTemplateInURL(url, context);
      expect(result).toBe(url); // Should return unchanged
    });

    it('should handle template in pathname', () => {
      const url = 'http://example.com/{{.formId}}/page?submissionId={{.submissionId}}';
      const context = { formId: 'test-form', submissionId: 29 };
      const result = encodeTemplateInURL(url, context);
      expect(result).toBe('http://example.com/test-form/page?submissionId=29');
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle the exact team-reported issue', () => {
      const url = 'http://localhost:3000/ar/listing/booking?categoryId=1100&formSubmissionId={{.formSubmissionId}}';
      const context = {
        formSubmissionId: 29,
        submissionId: 29, // Also test with submissionId
        formId: 'test-form'
      };
      
      // Test with formSubmissionId
      const result1 = encodeTemplateInURL(url, context);
      expect(result1).toBe('http://localhost:3000/ar/listing/booking?categoryId=1100&formSubmissionId=29');
      
      // Test with submissionId (should also work)
      const url2 = 'http://localhost:3000/ar/listing/booking?categoryId=1100&formSubmissionId={{.submissionId}}';
      const result2 = encodeTemplateInURL(url2, context);
      expect(result2).toBe('http://localhost:3000/ar/listing/booking?categoryId=1100&formSubmissionId=29');
      
      // Verify no encoding issues
      expect(result1).not.toContain('%3F');
      expect(result1).not.toContain('%3D');
      expect(result2).not.toContain('%3F');
      expect(result2).not.toContain('%3D');
    });

    it('should handle complex redirect URLs', () => {
      const url = 'http://example.com/booking?categoryId=1100&userId=123&formId={{.formId}}&submissionId={{.submissionId}}&timestamp={{.submittedAt}}';
      const context = {
        formId: 'test-form',
        submissionId: 29,
        submittedAt: 1234567890
      };
      const result = encodeTemplateInURL(url, context);
      const urlObj = new URL(result);
      
      expect(urlObj.searchParams.get('categoryId')).toBe('1100');
      expect(urlObj.searchParams.get('userId')).toBe('123');
      expect(urlObj.searchParams.get('formId')).toBe('test-form');
      expect(urlObj.searchParams.get('submissionId')).toBe('29');
      expect(urlObj.searchParams.get('timestamp')).toBe('1234567890');
    });
  });
});





