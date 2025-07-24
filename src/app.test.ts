// Basic test to verify project setup
import { describe, it, expect } from '@jest/globals';

describe('Project Setup', () => {
  it('should have proper TypeScript configuration', () => {
    // This test verifies that TypeScript compilation works
    const testObject: { name: string; value: number } = {
      name: 'test',
      value: 42,
    };
    
    expect(testObject.name).toBe('test');
    expect(testObject.value).toBe(42);
  });

  it('should support ES2022 features', () => {
    // Test optional chaining and nullish coalescing
    const obj: { nested?: { value?: string } } = {};
    const result = obj.nested?.value ?? 'default';
    
    expect(result).toBe('default');
  });

  it('should have proper Jest configuration', () => {
    // Verify Jest is working with TypeScript
    expect(typeof jest).toBe('object');
    expect(process.env.NODE_ENV).toBe('test');
  });
});