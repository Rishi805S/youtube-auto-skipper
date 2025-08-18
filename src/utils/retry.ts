/**
 * Retries a function with exponential backoff
 * @param fn Function to retry
 * @param maxAttempts Maximum number of retry attempts
 * @param delay Base delay in milliseconds
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error | unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.error(`[Retry] Attempt ${attempt}/${maxAttempts} failed:`, error);

      if (attempt === maxAttempts) break;

      const backoffDelay = delay * Math.pow(2, attempt - 1);
      console.log(`[Retry] Waiting ${backoffDelay}ms before next attempt...`);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  throw lastError;
}
