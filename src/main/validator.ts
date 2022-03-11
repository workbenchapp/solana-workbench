import * as sol from '@solana/web3.js';
import {
  Net,
  ValidatorLogsRequest,
  ValidatorState,
  ValidatorStateRequest,
} from '../types/types';
import { netToURL } from '../common/strings';
import { execAsync } from './const';
import { logger } from './logger';

const DOCKER_IMAGE =
  process.arch === 'arm64'
    ? 'nathanleclaire/solana:v1.9.2'
    : 'solanalabs/solana:v1.9.2';
let DOCKER_PATH = 'docker';
if (process.platform === 'darwin') {
  DOCKER_PATH = '/usr/local/bin/docker';
}

const validatorState = async (
  msg: ValidatorStateRequest
): Promise<ValidatorState> => {
  const { net } = msg;
  let solConn: sol.Connection;

  // Connect to cluster
  const ret = {
    running: false,
  } as ValidatorState;
  if (net !== Net.Localhost) {
    ret.running = true;
    return ret;
  }
  try {
    solConn = new sol.Connection(netToURL(net));
    await solConn.getEpochInfo();
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ECONNREFUSED') {
      return ret;
    }
  }
  ret.running = true;
  return ret;
};

const runValidator = async () => {
  try {
    await execAsync(`${DOCKER_PATH} inspect solana-test-validator`);
  } catch (e) {
    // TODO: check for image, pull if not present
    await execAsync(
      `${DOCKER_PATH} run \
        --name solana-test-validator \
        -d \
        --init \
        -p 8899:8899 \
        -p 8900:8900 \
        --log-driver local \
        --ulimit nofile=1000000 \
        ${DOCKER_IMAGE} \
        solana-test-validator \
        --limit-ledger-size 50000000`
    );

    return;
  }
  await execAsync(`${DOCKER_PATH} start solana-test-validator`);
};

const validatorLogs = async (msg: ValidatorLogsRequest) => {
  const { filter } = msg;
  const MAX_TAIL_LINES = 10000;
  const MAX_DISPLAY_LINES = 30;

  // TODO: doing this out of process might be a better fit
  const maxBuffer = 104857600; // 100MB

  if (filter !== '') {
    const { stderr } = await execAsync(
      `${DOCKER_PATH} logs --tail ${MAX_TAIL_LINES} solana-test-validator`,
      { maxBuffer }
    );
    const lines = stderr.split('\n').filter((s) => s.match(filter));
    const matchingLines = lines
      .slice(Math.max(lines.length - MAX_DISPLAY_LINES, 0))
      .join('\n');
    logger.info('Filtered log lookup', {
      matchLinesLen: matchingLines.length,
      filterLinesLen: lines.length,
    });
    return matchingLines;
  }
  const { stderr } = await execAsync(
    `${DOCKER_PATH} logs --tail ${MAX_DISPLAY_LINES} solana-test-validator`,
    { maxBuffer }
  );
  return stderr;
};

export { validatorState, runValidator, validatorLogs };
