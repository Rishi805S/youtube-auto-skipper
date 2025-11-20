/**
 * Shared DOM utility functions
 */

/**
 * Attempts to click an element with retry logic
 * @param selector CSS selector for the element
 * @param attempts Number of retry attempts
 * @param delay Delay between attempts in ms
 */
export async function clickWithRetry(
  selector: string,
  attempts = 5,
  delay = 300
): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    const element = document.querySelector<HTMLElement>(selector);
    if (element) {
      element.click();
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  throw new Error(`Element not found after ${attempts} attempts: ${selector}`);
}

/**
 * Waits for an element to appear in the DOM
 * @param selector CSS selector for the element
 * @param timeout Maximum wait time in ms
 */
export async function waitForElement<T extends HTMLElement>(
  selector: string,
  timeout = 3000
): Promise<T> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const element = document.querySelector<T>(selector);
    if (element) return element;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Element not found within ${timeout}ms: ${selector}`);
}

/**
 * Finds the first visible element from a list of selectors
 * @param selectors Array of CSS selectors to try
 */
export function findFirstVisible<T extends HTMLElement>(
  selectors: string[]
): T | null {
  for (const selector of selectors) {
    const element = document.querySelector<T>(selector);
    if (element && element.offsetParent !== null) {
      return element;
    }
  }
  return null;
}

/**
 * Converts timestamp string (MM:SS or HH:MM:SS) to seconds
 * @param timestamp Timestamp string
 */
export function timestampToSeconds(timestamp: string): number {
  const parts = timestamp.split(':').map(Number);
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return h * 3600 + m * 60 + s;
  }
  const [m, s] = parts;
  return m * 60 + s;
}

/**
 * Debounces a function call
 * @param func Function to debounce
 * @param wait Wait time in ms
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
