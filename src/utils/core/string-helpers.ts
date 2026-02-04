// Utility function to capitalize the first letter of each word in a string
export function capitalizeWords(input: string): string {
  return input.replace(/\b\w/g, (char) => char.toUpperCase()).replace(/_\w/g, (char) => char.toUpperCase());
}