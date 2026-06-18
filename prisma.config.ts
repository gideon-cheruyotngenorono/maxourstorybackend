import { defineConfig } from '@prisma/config';
import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

// Cast to `any` to allow non-standard keys (studio) without type errors in tsc
export default defineConfig(({
  studio: {
    port: 5555,
  },
  datasource: {
    url: process.env.DATABASE_URL, // port 6543 (transaction pooler) — port 5432 is network-blocked
  },
} as any));
