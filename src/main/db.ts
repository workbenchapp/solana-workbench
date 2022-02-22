import path from 'path';
import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';
import { RESOURCES_PATH, WORKBENCH_DIR_PATH } from './const';

const DB_PATH = path.join(WORKBENCH_DIR_PATH, 'wb.db');
const MIGRATION_DIR = path.join(RESOURCES_PATH, 'migrations');

let innerDB: Database<sqlite3.Database, sqlite3.Statement> = {} as Database<
  sqlite3.Database,
  sqlite3.Statement
>;

const initDB = async () => {
  innerDB = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });
  await innerDB.migrate({
    table: 'migration',
    migrationsPath: MIGRATION_DIR,
  });
  return innerDB;
};
initDB();
const db = innerDB;

export default db;
