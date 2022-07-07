import { ValidatorLogsRequest } from '../types/types';

const logArray: string[] = [];
const MAX_DISPLAY_LINES = 30;

const log = (line: string) => {
  logArray.push(line);
  if (logArray.length > MAX_DISPLAY_LINES) {
    logArray.shift();
  }
};

// TODO: keeping this as not PromiseIPC for now - but it would be good to move it into ipc/docker.ts later
const validatorLogs = async (msg: ValidatorLogsRequest) => {
  const { filter } = msg;

  if (logArray.length === 0) {
    if (filter) {
      return [`filter: ${filter}`];
    }
    return ['no filter'];
  }

  return logArray;
};

export { log, validatorLogs };
