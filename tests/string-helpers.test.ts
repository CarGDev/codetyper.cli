import { capitalizeWords } from '../src/utils/string-helpers';

describe('capitalizeWords', () => {
  it('should capitalize the first letter of each word in a string', () => {
    expect(capitalizeWords('hello world')).toBe('Hello World');
    expect(capitalizeWords('capitalize each word')).toBe('Capitalize Each Word');
  });

  it('should handle empty strings', () => {
    expect(capitalizeWords('')).toBe('');
  });

  it('should handle strings with multiple spaces', () => {
    expect(capitalizeWords('  hello   world  ')).toBe('  Hello   World  ');
  });

  it('should handle strings with special characters', () => {
    expect(capitalizeWords('hello-world')).toBe('Hello-World');
    expect(capitalizeWords('hello_world')).toBe('Hello_World');
  });

  it('should handle strings with numbers', () => {
    expect(capitalizeWords('hello 123 world')).toBe('Hello 123 World');
  });
});