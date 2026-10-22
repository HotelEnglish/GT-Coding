import { execSync, execFileSync } from 'node:child_process';
import path from 'node:path';
import { describe, it, expect, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

/**
 * Migration validation: applies committed migrations to an empty disposable
 * database and runs the deployment twice to prove idempotency.
 *
 * Enable by setting DATABASE_URL_TEST to an EMPTY scratch database, e.g.:
 *   postgresql://postgres:<pwd>@localhost:5432/gt_coding_migration_test
 * Without DATABASE_URL_TEST the suite skips (offline / no-credentials mode).
 */

const TEST_DB_URL = process.env.DATABASE_URL_TEST;
const serverRoot = path.resolve(__dirname, '..');

function runMigrateEnv(url: string): NodeJS.ProcessEnv {
  // Keep .env's keys so non-database settings still resolve; force DATABASE_URL.
  const env: NodeJS.ProcessEnv = { ...process.env, DATABASE_URL: url };
  return env;
}

describe.skipIf(!TEST_DB_URL)('prisma migrations baseline', () => {
  let testClient: PrismaClient;

  it('applies all migrations to an empty database', () => {
    execSync('npx prisma migrate deploy', {
      env: runMigrateEnv(TEST_DB_URL as string),
      cwd: serverRoot,
      stdio: 'pipe',
    });
    testClient = new PrismaClient({ datasources: { db: { url: TEST_DB_URL as string } } });
  });

  it('is idempotent on a second deploy', () => {
    const out = execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
      env: runMigrateEnv(TEST_DB_URL as string),
      cwd: serverRoot,
      encoding: 'utf8',
      shell: true,
    });
    expect(out).toContain('already in sync');
  });

  it('records the baseline migration', async () => {
    expect(testClient).toBeDefined();
    const applied = await testClient.$queryRawUnsafe<Array<{ migration_name: string }>>(
      'SELECT migration_name FROM "_prisma_migrations"',
    );
    const names = applied.map((r) => r.migration_name);
    expect(names).toContain('00000000000000_baseline');
  });

  afterAll(async () => {
    if (testClient) await testClient.$disconnect();
  });
});
