import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const sandboxRoot = path.join(projectRoot, 'data', 'test_sandboxes');
const databasePath = path.join(
  sandboxRoot,
  `account-deletion-${process.pid}-${Date.now()}.sqlite`
);

fs.mkdirSync(sandboxRoot, { recursive: true });

process.env.DB_PROVIDER = 'sqlite';
process.env.NODE_ENV = 'test';
process.env.SQLITE_PATH = databasePath;
process.env.STAGING_DB_PATH = databasePath;

const originalLoad = Module._load;
Module._load = function loadForAccountDeletionTest(id, ...args) {
  const normalizedId = typeof id === 'string' ? id.replaceAll('\\', '/') : '';
  if (id === 'server-only' || normalizedId.endsWith('/node_modules/server-only/index.js')) {
    return {};
  }
  return originalLoad.apply(this, [id, ...args]);
};

function resolveTypeScriptModule(specifier, context, nextResolve) {
  let candidateUrl;

  if (specifier.startsWith('next/') && !path.extname(specifier)) {
    const nextSubpath = path.join(projectRoot, 'node_modules', `${specifier}.js`);
    if (fs.existsSync(nextSubpath)) {
      return { shortCircuit: true, url: pathToFileURL(nextSubpath).href };
    }
  } else if (specifier.startsWith('@/')) {
    candidateUrl = pathToFileURL(path.join(projectRoot, 'src', specifier.slice(2)));
  } else if (
    (specifier.startsWith('./') || specifier.startsWith('../')) &&
    context.parentURL?.startsWith(pathToFileURL(projectRoot).href)
  ) {
    candidateUrl = new URL(specifier, context.parentURL);
  }

  if (candidateUrl) {
    const candidatePath = fileURLToPath(candidateUrl);
    if (!path.extname(candidatePath)) {
      for (const extension of ['.ts', '.tsx', '.js', '.mjs']) {
        const resolvedPath = `${candidatePath}${extension}`;
        if (fs.existsSync(resolvedPath)) {
          return { shortCircuit: true, url: pathToFileURL(resolvedPath).href };
        }
        const indexPath = path.join(candidatePath, `index${extension}`);
        if (fs.existsSync(indexPath)) {
          return { shortCircuit: true, url: pathToFileURL(indexPath).href };
        }
      }
    }
  }

  return nextResolve(specifier, context);
}

Module.registerHooks({ resolve: resolveTypeScriptModule });

function quoteIdentifier(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function valueForColumn(tableName, column, rowLabel, userId) {
  const columnName = column.name.toLowerCase();
  const columnType = (column.type || '').toUpperCase();
  const uniqueLabel = `${tableName}-${columnName}-${rowLabel}`;

  if (columnName === 'user_id') return userId;
  if (columnName === 'email' || columnName.endsWith('_email')) {
    return `${rowLabel}.${tableName}@example.test`;
  }
  if (columnName.endsWith('_json') || columnName === 'resume_data') return '{}';
  if (columnName.includes('url')) return `https://example.test/${uniqueLabel}`;
  if (columnName === 'role') return 'USER';
  if (columnName === 'file_type') return 'text/plain';
  if (columnName === 'difficulty') return 'Intermediate';
  if (columnName === 'target_work_type') return 'both';
  if (columnName === 'status') return 'active';
  if (
    columnName.endsWith('_at') ||
    columnName.endsWith('_date') ||
    columnName === 'timestamp'
  ) {
    return rowLabel === 'target'
      ? '2026-01-01T00:00:00.000Z'
      : '2026-01-01T00:00:01.000Z';
  }
  if (columnType.includes('INT')) return rowLabel === 'target' ? 1 : 2;
  if (/REAL|FLOA|DOUB|NUM|DEC/.test(columnType)) return rowLabel === 'target' ? 1 : 2;
  if (columnType.includes('BLOB')) return Buffer.from(uniqueLabel);
  return uniqueLabel;
}

function insertUserLinkedRow(db, tableName, columns, rowLabel, userId) {
  return insertRequiredRow(db, tableName, columns, rowLabel, { user_id: userId });
}

function insertRequiredRow(db, tableName, columns, rowLabel, overrides = {}) {
  const includedColumns = columns.filter(
    (column) =>
      Object.hasOwn(overrides, column.name) ||
      Number(column.pk) > 0 ||
      (Number(column.notnull) === 1 && column.dflt_value === null)
  );
  const columnSql = includedColumns.map((column) => quoteIdentifier(column.name)).join(', ');
  const placeholders = includedColumns.map(() => '?').join(', ');
  const values = includedColumns.map((column) => {
    if (Object.hasOwn(overrides, column.name)) return overrides[column.name];
    return valueForColumn(tableName, column, rowLabel, overrides.user_id);
  });

  db.prepare(
    `INSERT INTO ${quoteIdentifier(tableName)} (${columnSql}) VALUES (${placeholders})`
  ).run(...values);
}

const requestedTables = [
  'career_readiness_history',
  'guided_projects',
  'student_profiles',
  'user_career_goals',
  'user_interview_sessions',
  'user_learning_roadmaps',
  'user_roadmap_progress',
];

let closeDb;
let assertions = 0;

function check(condition, message) {
  assert.ok(condition, message);
  assertions += 1;
  console.log(`[PASS] ${message}`);
}

try {
  const dbModule = await import('../src/server/db/index.ts');
  const { createSessionToken, deleteUserAndData, getDb } = dbModule;
  closeDb = dbModule.closeDb;
  const db = getDb();

  await db.exec('PRAGMA foreign_keys = OFF;');

  const targetUserId = `account-delete-target-${Date.now()}`;
  const controlUserId = `account-delete-control-${Date.now()}`;
  const targetName = `Deleted Person ${process.pid}`;
  const targetEmail = `deleted-person-${process.pid}@example.test`;
  const targetSessionToken = createSessionToken({
    id: targetUserId,
    email: targetEmail,
    role: 'USER',
  });
  const now = '2026-01-01T00:00:00.000Z';

  await db.prepare(`
    INSERT INTO users (id, name, email, session_token, created_at, updated_at, last_active_at, role, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'USER', 1)
  `).run(targetUserId, targetName, targetEmail, targetSessionToken, now, now, now);

  await db.prepare(`
    INSERT INTO users (id, name, email, session_token, created_at, updated_at, last_active_at, role, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'USER', 1)
  `).run(
    controlUserId,
    'Control Person',
    `control-${process.pid}@example.test`,
    `token-${controlUserId}`,
    now,
    now,
    now
  );

  const tables = await db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all();
  const tableColumns = new Map();
  const userLinkedTables = [];

  for (const { name: tableName } of tables) {
    const columns = await db
      .prepare(`PRAGMA table_info(${quoteIdentifier(tableName)})`)
      .all();
    tableColumns.set(tableName, columns);
    if (!columns.some((column) => column.name === 'user_id')) continue;

    userLinkedTables.push({ name: tableName, columns });
    insertUserLinkedRow(db, tableName, columns, 'target', targetUserId);
    insertUserLinkedRow(db, tableName, columns, 'control', controlUserId);
  }

  check(userLinkedTables.length > 0, 'discovered tables containing a user_id column');
  for (const tableName of requestedTables) {
    check(
      userLinkedTables.some((table) => table.name === tableName),
      `discovered required table ${tableName}`
    );
  }

  const targetAssessment = await db
    .prepare('SELECT id FROM assessments WHERE user_id = ?')
    .get(targetUserId);
  const controlAssessment = await db
    .prepare('SELECT id FROM assessments WHERE user_id = ?')
    .get(controlUserId);
  const targetSearch = await db
    .prepare('SELECT id FROM job_searches WHERE user_id = ?')
    .get(targetUserId);
  const controlSearch = await db
    .prepare('SELECT id FROM job_searches WHERE user_id = ?')
    .get(controlUserId);

  const indirectlyLinkedTables = [
    {
      name: 'assessment_question_snapshots',
      linkColumn: 'assessment_id',
      targetParentId: targetAssessment.id,
      controlParentId: controlAssessment.id,
    },
    {
      name: 'proctoring_events',
      linkColumn: 'assessment_id',
      targetParentId: targetAssessment.id,
      controlParentId: controlAssessment.id,
    },
    {
      name: 'job_search_results',
      linkColumn: 'search_id',
      targetParentId: targetSearch.id,
      controlParentId: controlSearch.id,
    },
  ];

  for (const table of indirectlyLinkedTables) {
    const columns = tableColumns.get(table.name);
    check(Boolean(columns), `discovered indirectly linked table ${table.name}`);
    insertRequiredRow(db, table.name, columns, 'target', {
      [table.linkColumn]: table.targetParentId,
    });
    insertRequiredRow(db, table.name, columns, 'control', {
      [table.linkColumn]: table.controlParentId,
    });
  }

  const protectedApiRoute = await import('../src/app/api/user/my-data/route.ts');
  const authenticatedApiResponse = await protectedApiRoute.GET(
    new Request('http://localhost/api/user/my-data', {
      headers: { cookie: `sra_user_session=${encodeURIComponent(targetSessionToken)}` },
    })
  );
  check(authenticatedApiResponse.status === 200, 'old session cookie is valid before deletion');

  await deleteUserAndData(targetUserId, {
    id: 'account-deletion-test-admin',
    email: 'account-deletion-admin@example.test',
  });

  for (const { name: tableName } of userLinkedTables) {
    const targetCount = await db
      .prepare(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(tableName)} WHERE user_id = ?`)
      .get(targetUserId);
    const controlCount = await db
      .prepare(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(tableName)} WHERE user_id = ?`)
      .get(controlUserId);

    check(Number(targetCount.count) === 0, `${tableName} has no rows linked to the deleted user`);
    check(Number(controlCount.count) === 1, `${tableName} preserves the control user's row`);
  }

  for (const table of indirectlyLinkedTables) {
    const targetCount = await db
      .prepare(
        `SELECT COUNT(*) AS count FROM ${quoteIdentifier(table.name)} WHERE ${quoteIdentifier(table.linkColumn)} = ?`
      )
      .get(table.targetParentId);
    const controlCount = await db
      .prepare(
        `SELECT COUNT(*) AS count FROM ${quoteIdentifier(table.name)} WHERE ${quoteIdentifier(table.linkColumn)} = ?`
      )
      .get(table.controlParentId);

    check(Number(targetCount.count) === 0, `${table.name} removes the deleted user's child row`);
    check(Number(controlCount.count) === 1, `${table.name} preserves the control user's child row`);
  }

  const rejectedApiResponse = await protectedApiRoute.GET(
    new Request('http://localhost/api/user/my-data', {
      headers: { cookie: `sra_user_session=${encodeURIComponent(targetSessionToken)}` },
    })
  );
  check(rejectedApiResponse.status === 401, 'old session cookie receives 401 from a protected API after deletion');

  const deletedUser = await db.prepare('SELECT id FROM users WHERE id = ?').get(targetUserId);
  const controlUser = await db.prepare('SELECT id FROM users WHERE id = ?').get(controlUserId);
  check(!deletedUser, 'deleted the primary users row');
  check(controlUser?.id === controlUserId, 'preserved the control users row');

  const auditEvent = await db.prepare(`
    SELECT event_type, actor_type, actor_id, description, metadata_json
    FROM audit_events
    WHERE event_type = 'ADMIN_USER_DELETED' AND actor_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get('account-deletion-test-admin');
  const auditText = `${auditEvent?.description || ''} ${auditEvent?.metadata_json || ''}`;
  const auditMetadata = JSON.parse(auditEvent?.metadata_json || '{}');

  check(Boolean(auditEvent), 'recorded the administrative deletion audit event');
  check(!auditText.includes(targetName), 'audit event does not store the deleted user name');
  check(!auditText.includes(targetEmail), 'audit event does not store the deleted user email');
  check(!('deletedUserName' in auditMetadata), 'audit metadata omits deletedUserName');
  check(!('deletedUserEmail' in auditMetadata), 'audit metadata omits deletedUserEmail');
  check(auditEvent.actor_type === 'ADMIN', 'audit actor_type identifies an administrator');
  check(auditEvent.actor_id === 'account-deletion-test-admin', 'audit actor_id identifies the deleting administrator');

  const survivingVisitor = await db
    .prepare('SELECT * FROM visitors WHERE id = ?')
    .get('visitors-id-target');
  const survivingFeedback = await db
    .prepare('SELECT * FROM feedback WHERE id = ?')
    .get('feedback-id-target');
  check(survivingVisitor?.user_id === null, 'visitor aggregate row survives with user_id anonymized');
  check(survivingFeedback?.user_id === null, 'feedback aggregate row survives with user_id anonymized');

  console.log('\nSurviving target-linked rows after deletion:');
  console.log(`visitors=${JSON.stringify(survivingVisitor)}`);
  console.log(`feedback=${JSON.stringify(survivingFeedback)}`);
  console.log(`audit_events=${JSON.stringify(auditEvent)}`);

  console.log(
    `\nAccount deletion completeness: ${assertions}/${assertions} checks passed across ${userLinkedTables.length} direct and ${indirectlyLinkedTables.length} indirect user-linked tables.`
  );
} finally {
  if (closeDb) {
    await closeDb();
  }

  for (const filePath of [
    databasePath,
    `${databasePath}-wal`,
    `${databasePath}-shm`,
    `${databasePath}-journal`,
  ]) {
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(`${path.resolve(sandboxRoot)}${path.sep}`)) {
      throw new Error(`Unsafe account deletion test cleanup path: ${resolvedPath}`);
    }
    if (fs.existsSync(resolvedPath)) {
      fs.rmSync(resolvedPath, { force: true });
    }
  }
}
