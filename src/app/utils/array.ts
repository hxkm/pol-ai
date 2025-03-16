/**
 * Returns a random sample of elements from an array
 * @param array The array to sample from
 * @param sampleSize The number of elements to sample
 * @returns A new array containing the random sample
 */
export function randomSample<T>(array: T[], sampleSize: number): T[] {
  if (sampleSize >= array.length) {
    return [...array];
  }

  const result = new Array<T>(sampleSize);
  const taken = new Set<number>();

  while (taken.size < sampleSize) {
    const index = Math.floor(Math.random() * array.length);
    if (!taken.has(index)) {
      taken.add(index);
      result[taken.size - 1] = array[index];
    }
  }

  return result;
} 