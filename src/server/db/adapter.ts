import 'server-only';
import path from 'node:path';
import fs from 'node:fs';
import dns from 'node:dns';
import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';

try {
  dns.setDefaultResultOrder?.('ipv4first');
} catch {}

const { Pool, types } = pg;

// Parse int8 (bigint, e.g. COUNT(*)) as standard JS number to match SQLite behavior
types.setTypeParser(20, (val: string) => parseInt(val, 10));

export interface StatementClient {
  all(...params: any[]): any;
  get(...params: any[]): any;
  run(...params: any[]): any;
}

export interface DatabaseClient {
  isPostgres: boolean;
  exec(sql: string): Promise<void> | void;
  prepare(sql: string): StatementClient;
  transaction<T>(fn: (tx: DatabaseClient) => Promise<T>): Promise<T>;
  close?(): Promise<void> | void;
}

export const activeTxStorage = new AsyncLocalStorage<DatabaseClient>();

export function getActiveTx(): DatabaseClient | undefined {
  return activeTxStorage.getStore();
}

let dbClientInstance: DatabaseClient | null = null;
let postgresPoolInstance: pg.Pool | null = null;

export function resolveSqliteDbPath(): string {
  const isPlaywrightTest = process.env.PLAYWRIGHT_TEST === '1';
  const testDatabasePath = isPlaywrightTest
    ? process.env.PLAYWRIGHT_TEST_DB_PATH
    : undefined;
  if (isPlaywrightTest && !testDatabasePath) {
    throw new Error('[Smart Resume AI] PLAYWRIGHT_TEST requires PLAYWRIGHT_TEST_DB_PATH to protect application data.');
  }
  return testDatabasePath
    ? path.resolve(testDatabasePath)
    : (process.env.STAGING_DB_PATH || process.env.SQLITE_PATH
        ? path.resolve(process.env.STAGING_DB_PATH || process.env.SQLITE_PATH!)
        : path.join(process.cwd(), 'data', 'smart_resume.db'));
}

/**
 * Converts SQLite SQL string to PostgreSQL syntax:
 * 1. Replaces unquoted '?' parameter placeholders with '$1', '$2', '$3'...
 * 2. Translates 'INSERT OR IGNORE INTO table' to 'INSERT INTO table ... ON CONFLICT DO NOTHING'
 */
export function toPostgresSql(sql: string): string {
  let i = 1;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let output = '';

  for (let idx = 0; idx < sql.length; idx++) {
    const char = sql[idx];

    if (char === "'" && !inDoubleQuote) {
      if (inSingleQuote && sql[idx + 1] === "'") {
        output += "''";
        idx++;
        continue;
      }
      inSingleQuote = !inSingleQuote;
      output += char;
    } else if (char === '"' && !inSingleQuote) {
      if (inDoubleQuote && sql[idx + 1] === '"') {
        output += '""';
        idx++;
        continue;
      }
      inDoubleQuote = !inDoubleQuote;
      output += char;
    } else if (char === '?' && !inSingleQuote && !inDoubleQuote) {
      output += `$${i++}`;
    } else {
      output += char;
    }
  }

  // Handle SQLite specific 'INSERT OR IGNORE INTO'
  if (/INSERT\s+OR\s+IGNORE\s+INTO/i.test(output)) {
    output = output.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT INTO');
    if (!/ON\s+CONFLICT/i.test(output)) {
      output += ' ON CONFLICT DO NOTHING';
    }
  }

  // In PostgreSQL, ROUND(double precision, n) does not exist; AVG() returns double precision.
  // Cast AVG(...) to numeric so ROUND(numeric, n) executes cleanly.
  output = output.replace(/ROUND\(\s*AVG\(([^)]+)\)\s*,\s*(\d+)\s*\)/gi, 'ROUND(CAST(AVG($1) AS numeric), $2)');

  return output;
}

/**
 * Creates a scoped PostgreSQL transaction client wrapping a dedicated pool client.
 * Supports arbitrary savepoint nesting for nested transactions.
 */
export function createPgTxClient(
  client: pg.PoolClient | { query: (sql: string, params?: any[]) => Promise<any> },
  depth: number = 0
): DatabaseClient {
  const txClient: DatabaseClient = {
    isPostgres: true,
    async exec(sql: string) {
      if (/^\s*PRAGMA/i.test(sql)) {
        return; // Skip SQLite PRAGMAs in PostgreSQL
      }
      await client.query(toPostgresSql(sql));
    },
    prepare(sql: string): StatementClient {
      if (/^\s*PRAGMA/i.test(sql)) {
        return {
          get: async () => undefined,
          all: async () => [],
          run: async () => ({ changes: 0 }),
        };
      }

      const pgSql = toPostgresSql(sql);

      return {
        async get(...params: any[]) {
          const res = await client.query(pgSql, params);
          return res.rows[0] ?? undefined;
        },
        async all(...params: any[]) {
          const res = await client.query(pgSql, params);
          return res.rows;
        },
        async run(...params: any[]) {
          const res = await client.query(pgSql, params);
          return {
            changes: res.rowCount ?? 0,
            lastInsertRowid: 0,
          };
        },
      };
    },
    async transaction<T>(fn: (nestedTx: DatabaseClient) => Promise<T>): Promise<T> {
      const nextDepth = depth + 1;
      const savepointName = `sra_pg_sp_${nextDepth}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await client.query(`SAVEPOINT ${savepointName}`);
      try {
        const nestedTx = createPgTxClient(client, nextDepth);
        const result = await activeTxStorage.run(nestedTx, () => fn(nestedTx));
        await client.query(`RELEASE SAVEPOINT ${savepointName}`);
        return result;
      } catch (err) {
        try {
          await client.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
        } catch (rbErr) {
          console.error('[Smart Resume AI] PostgreSQL savepoint rollback error:', rbErr);
        }
        throw err;
      }
    },
  };

  return txClient;
}

let sqliteLock: Promise<void> = Promise.resolve();

/**
 * Creates a scoped SQLite transaction client wrapping the synchronous DatabaseSync.
 * Supports arbitrary savepoint nesting for nested transactions.
 */
export function createSqliteTxClient(sqliteDb: DatabaseSync, depth: number = 0): DatabaseClient {
  const txClient: DatabaseClient = {
    isPostgres: false,
    exec(sql: string) {
      sqliteDb.exec(sql);
    },
    prepare(sql: string): StatementClient {
      const stmt = sqliteDb.prepare(sql);
      return {
        get(...params: any[]) {
          return stmt.get(...params);
        },
        all(...params: any[]) {
          return stmt.all(...params);
        },
        run(...params: any[]) {
          return stmt.run(...params);
        },
      };
    },
    async transaction<T>(fn: (nestedTx: DatabaseClient) => Promise<T>): Promise<T> {
      const nextDepth = depth + 1;
      const savepointName = `sra_sqlite_sp_${nextDepth}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      sqliteDb.exec(`SAVEPOINT ${savepointName};`);
      try {
        const nestedTx = createSqliteTxClient(sqliteDb, nextDepth);
        const result = await activeTxStorage.run(nestedTx, () => fn(nestedTx));
        sqliteDb.exec(`RELEASE SAVEPOINT ${savepointName};`);
        return result;
      } catch (err) {
        try {
          sqliteDb.exec(`ROLLBACK TO SAVEPOINT ${savepointName};`);
          sqliteDb.exec(`RELEASE SAVEPOINT ${savepointName};`);
        } catch (rbErr) {
          console.error('[Smart Resume AI] SQLite savepoint rollback error:', rbErr);
        }
        throw err;
      }
    },
  };

  return txClient;
}

/**
 * Initializes and returns the active database client singleton.
 * - In Vercel / serverless / production: Uses PostgreSQL via POSTGRES_URL or DATABASE_URL.
 * - In local development: Uses node:sqlite with data/smart_resume.db by default to prevent
 *   remote network latency, DNS timeouts, and offline stalls.
 * - Explicit override: Set DB_PROVIDER=postgres or FORCE_POSTGRES=true to connect to PostgreSQL locally.
 */
export function getDb(): DatabaseClient {
  const ambientTx = activeTxStorage.getStore();
  if (ambientTx) {
    return ambientTx;
  }

  if (dbClientInstance) {
    return dbClientInstance;
  }

  const postgresUrl = (process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || '').trim();
  const isVercel = Boolean(process.env.VERCEL) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
  const isProduction = process.env.NODE_ENV === 'production' || isVercel;
  const dbProvider = (process.env.DB_PROVIDER || '').trim().toLowerCase();
  const forcePostgres = dbProvider === 'postgres' || process.env.FORCE_POSTGRES === 'true';
  const isPlaywrightTest = process.env.PLAYWRIGHT_TEST === '1';

  // Determine whether PostgreSQL should be used:
  // 1. Mandatory in production / Vercel serverless (unless explicitly overridden with DB_PROVIDER=sqlite).
  // 2. Used in local development ONLY if explicitly configured via DB_PROVIDER=postgres or FORCE_POSTGRES=true.
  const shouldUsePostgres = !isPlaywrightTest && dbProvider !== 'sqlite' && (isProduction || forcePostgres);

  if (shouldUsePostgres) {
    if (!postgresUrl) {
      const errorMsg =
        '[Smart Resume AI] Database Error: Running in production or explicit PostgreSQL mode without a valid POSTGRES_URL or DATABASE_URL. Please configure environment variables.';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    const globalForPg = globalThis as unknown as {
      __sra_pg_pool?: pg.Pool;
    };

    if (!globalForPg.__sra_pg_pool) {
      const configuredMax = Number(process.env.PG_MAX_CONNECTIONS);
      const poolMax = Number.isFinite(configuredMax) && configuredMax > 0
        ? Math.min(configuredMax, 20)
        : (isVercel ? 5 : 10);

      globalForPg.__sra_pg_pool = new Pool({
        connectionString: postgresUrl,
        max: poolMax,
        idleTimeoutMillis: isVercel ? 10000 : 30000,
        connectionTimeoutMillis: 10000,
        ssl: postgresUrl.includes('localhost') || postgresUrl.includes('127.0.0.1')
          ? false
          : true,
      });

      globalForPg.__sra_pg_pool.on('error', (err) => {
        console.error('[Smart Resume AI] PostgreSQL Pool error:', err.message);
      });
    }

    postgresPoolInstance = globalForPg.__sra_pg_pool;
    const pool = postgresPoolInstance;

    dbClientInstance = {
      isPostgres: true,
      async exec(sql: string) {
        if (/^\s*PRAGMA/i.test(sql)) {
          return; // Skip SQLite PRAGMAs in PostgreSQL
        }
        await pool.query(toPostgresSql(sql));
      },
      prepare(sql: string): StatementClient {
        if (/^\s*PRAGMA/i.test(sql)) {
          return {
            get: async () => undefined,
            all: async () => [],
            run: async () => ({ changes: 0 }),
          };
        }

        const pgSql = toPostgresSql(sql);

        return {
          async get(...params: any[]) {
            const res = await pool.query(pgSql, params);
            return res.rows[0] ?? undefined;
          },
          async all(...params: any[]) {
            const res = await pool.query(pgSql, params);
            return res.rows;
          },
          async run(...params: any[]) {
            const res = await pool.query(pgSql, params);
            return {
              changes: res.rowCount ?? 0,
              lastInsertRowid: 0,
            };
          },
        };
      },
      async transaction<T>(fn: (tx: DatabaseClient) => Promise<T>): Promise<T> {
        const ambientTx = activeTxStorage.getStore();
        if (ambientTx) {
          return await ambientTx.transaction(fn);
        }

        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const txClient = createPgTxClient(client, 0);
          const result = await activeTxStorage.run(txClient, () => fn(txClient));
          await client.query('COMMIT');
          return result;
        } catch (err) {
          try {
            await client.query('ROLLBACK');
          } catch (rbErr) {
            console.error('[Smart Resume AI] PostgreSQL rollback error:', rbErr);
          }
          throw err;
        } finally {
          client.release();
        }
      },
      async close() {
        const globalForPg = globalThis as unknown as {
          __sra_pg_pool?: pg.Pool;
        };
        if (globalForPg.__sra_pg_pool) {
          await globalForPg.__sra_pg_pool.end();
          delete globalForPg.__sra_pg_pool;
          postgresPoolInstance = null;
        } else if (postgresPoolInstance) {
          await postgresPoolInstance.end();
          postgresPoolInstance = null;
        }
      },
    };

    return dbClientInstance;
  }

  // Local development fallback: SQLite
  const dbPath = resolveSqliteDbPath();
  const dbDir = path.dirname(dbPath);
  try {
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  } catch (err: any) {
    console.warn('[Smart Resume AI] Could not create local data directory:', err?.message);
  }

  const sqliteDb = new DatabaseSync(dbPath);

  try {
    sqliteDb.exec('PRAGMA journal_mode = WAL;');
    sqliteDb.exec('PRAGMA foreign_keys = ON;');
  } catch (err: any) {
    console.warn('[Smart Resume AI] PRAGMA initialization notice:', err?.message);
  }

  dbClientInstance = {
    isPostgres: false,
    exec(sql: string) {
      sqliteDb.exec(sql);
    },
    prepare(sql: string): StatementClient {
      const stmt = sqliteDb.prepare(sql);
      return {
        get(...params: any[]) {
          return stmt.get(...params);
        },
        all(...params: any[]) {
          return stmt.all(...params);
        },
        run(...params: any[]) {
          return stmt.run(...params);
        },
      };
    },
    async transaction<T>(fn: (tx: DatabaseClient) => Promise<T>): Promise<T> {
      const ambientTx = activeTxStorage.getStore();
      if (ambientTx) {
        return await ambientTx.transaction(fn);
      }

      let releaseLock: () => void;
      const nextLock = new Promise<void>((resolve) => {
        releaseLock = resolve;
      });
      const currentLock = sqliteLock;
      sqliteLock = sqliteLock.then(() => nextLock, () => nextLock);
      await currentLock;

      try {
        sqliteDb.exec('BEGIN IMMEDIATE;');
        try {
          const txClient = createSqliteTxClient(sqliteDb, 0);
          const result = await activeTxStorage.run(txClient, () => fn(txClient));
          sqliteDb.exec('COMMIT;');
          return result;
        } catch (err) {
          try {
            sqliteDb.exec('ROLLBACK;');
          } catch (rbErr) {
            console.error('[Smart Resume AI] SQLite rollback error:', rbErr);
          }
          throw err;
        }
      } finally {
        releaseLock!();
      }
    },
    close() {
      try {
        sqliteDb.close();
      } catch {}
    },
  };

  return dbClientInstance;
}
