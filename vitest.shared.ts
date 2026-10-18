import path from 'node:path';
import react from '@vitejs/plugin-react';
import type { UserConfig } from 'vitest/config';

/**
 * Shared Vitest configuration.
 *
 * Unit and integration suites run from separate config files rather than one
 * workspace, because they need different environments and the integration
 * suite must not run in parallel against a shared database. Everything they
 * have in common lives here.
 */
export const sharedConfig: UserConfig = {
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      '~tests': path.resolve(import.meta.dirname, './tests'),
      // Next.js's server-only guard throws when imported outside a React
      // Server Component graph. Tests exercise these modules directly, so the
      // marker is stubbed out here.
      'server-only': path.resolve(import.meta.dirname, './tests/stubs/server-only.ts'),
    },
  },
};
