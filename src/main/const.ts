import path from 'path';
import os from 'os';
import fs from 'fs';
import util from 'util';
import { exec } from 'child_process';
import { app } from 'electron';

const WORKBENCH_VERSION = '0.4.0';
const RESOURCES_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'assets')
  : path.join(__dirname, '..', '..', 'assets');
const WORKBENCH_DIR_NAME = '.solana-workbench';
const WORKBENCH_DIR_PATH = path.join(os.homedir(), WORKBENCH_DIR_NAME);
const KEY_FILE_NAME = 'wbkey.json';
const KEYPAIR_DIR_PATH = path.join(WORKBENCH_DIR_PATH, 'keys');
const KEY_PATH = path.join(KEYPAIR_DIR_PATH, KEY_FILE_NAME);
const DB_PATH = path.join(WORKBENCH_DIR_PATH, 'db');
const ACCOUNTS_DIR_PATH = path.join(DB_PATH, 'accounts');
const CONFIG_FILE_PATH = path.join(DB_PATH, 'config.json');
const execAsync = util.promisify(exec);

if (!fs.existsSync(WORKBENCH_DIR_PATH)) {
  fs.mkdirSync(WORKBENCH_DIR_PATH);
  fs.mkdirSync(DB_PATH);
  fs.mkdirSync(ACCOUNTS_DIR_PATH);
  fs.mkdirSync(KEYPAIR_DIR_PATH);
  fs.writeFileSync(CONFIG_FILE_PATH, '{}');
}

export {
  WORKBENCH_VERSION,
  RESOURCES_PATH,
  KEY_PATH,
  WORKBENCH_DIR_PATH,
  WORKBENCH_DIR_NAME,
  KEYPAIR_DIR_PATH,
  KEY_FILE_NAME,
  DB_PATH,
  ACCOUNTS_DIR_PATH,
  CONFIG_FILE_PATH,
  execAsync,
};
