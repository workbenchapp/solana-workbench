// import * as shell from 'shelljs';
import { ValidatorLogsRequest } from '../types/types';
// import { execAsync } from './const';
// import { logger } from './logger';

// const DOCKER_IMAGE = 'cryptoworkbench/solana-amman:v1.11.1';
const DOCKER_PATH =
  process.platform === 'darwin' ? '/usr/local/bin/docker' : 'docker';

const logArray: string[] = [];
const MAX_DISPLAY_LINES = 30;

const log = (line: string) => {
  logArray.push(line);
  if (logArray.length > MAX_DISPLAY_LINES) {
    logArray.shift();
  }
};

const validatorLogs = async (msg: ValidatorLogsRequest) => {
  const { filter } = msg;
  // const MAX_TAIL_LINES = 10000;

  if (logArray.length === 0) {
    if (filter) {
      return [`filter: ${filter}`];
    }
    return ['no filter'];
  }

  return logArray;
};

export { log, DOCKER_PATH, validatorLogs };
