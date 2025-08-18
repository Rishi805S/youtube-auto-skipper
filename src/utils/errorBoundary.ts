export async function withErrorBoundary<T>(
  fn: () => Promise<T>,
  fallback: T,
  context: string
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error(`[Error][${context}]:`, error);
    return fallback;
  }
}
