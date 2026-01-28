/**
 * Fuzzy matching utilities for file picker
 */

const containsMatch = (query: string, text: string): boolean =>
  text.includes(query);

const fuzzyCharMatch = (query: string, text: string): boolean => {
  let queryIndex = 0;
  for (
    let textIndex = 0;
    textIndex < text.length && queryIndex < query.length;
    textIndex++
  ) {
    if (text[textIndex] === query[queryIndex]) {
      queryIndex++;
    }
  }
  return queryIndex === query.length;
};

export const fuzzyMatch = (query: string, text: string): boolean => {
  if (!query) return true;

  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();

  return (
    containsMatch(lowerQuery, lowerText) ||
    fuzzyCharMatch(lowerQuery, lowerText)
  );
};
