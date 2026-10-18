import { defineConfig, mergeConfig } from 'vitest/config';
import { sharedConfig } from './vitest.shared';

/**
 * Unit suite: fast, no external dependencies. Pure logic and React components
 * under jsdom, so it runs anywhere without Docker services.
 *
 * Integration tests live in vitest.integration.config.ts.
 */
export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      name: 'unit',
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./tests/setup/unit.ts'],
      include: ['tests/unit/**/*.test.{ts,tsx}'],
    },
  }),
);
