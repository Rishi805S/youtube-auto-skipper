import type { TestType } from '@playwright/test';

declare global {
  const test: TestType;
}
