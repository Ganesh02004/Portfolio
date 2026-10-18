import { defineConfig, mergeConfig } from 'vitest/config';
import { sharedConfig } from './vitest.shared';

/**
 * Integration suite: runs against the real Postgres, object storage and SMTP
 * services defined in docker-compose.test.yml.
 *
 * These verify what a mock cannot: that the database actually refuses the
 * queries the design says it should, that a private object really is private,
 * and that a failed email really does leave the submission intact.
 */
export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      name: 'integration',
      environment: 'node',
      globals: true,
      setupFiles: ['./tests/setup/integration.ts'],
      include: ['tests/integration/**/*.test.ts'],
      // One shared database: parallel files would make counts and rate-limit
      // windows interfere with each other.
      fileParallelism: false,
      testTimeout: 30_000,
      hookTimeout: 30_000,
    },
  }),
);
