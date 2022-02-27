import path from 'path';
import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';
import { RESOURCES_PATH, WORKBENCH_DIR_PATH } from './const';

const DB_PATH = path.join(WORKBENCH_DIR_PATH, 'wb.db');
const MIGRATION_DIR = path.join(RESOURCES_PATH, 'migrations');

// eslint-disable-next-line import/no-mutable-exports
let db: Database<sqlite3.Database, sqlite3.Statement> = {} as Database<
  sqlite3.Database,
  sqlite3.Statement
>;

const initDB = async () => {
  db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });
  await db.migrate({
    table: 'migration',
    migrationsPath: MIGRATION_DIR,
  });
  return db;
};
initDB();

export { db, initDB };
