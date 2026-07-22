import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Covers pure logic only (formatting, grouping, schemas); component and
// RLS suites arrive with their own runners per docs/ARCHITECTURE.md §12.
export default defineConfig({
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
