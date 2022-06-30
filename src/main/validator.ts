import * as shell from 'shelljs';
import Docker = require('dockerode');
import { ValidatorLogsRequest } from '../types/types';
import { execAsync } from './const';
import { logger } from './logger';

// const DOCKER_IMAGE = 'cryptoworkbench/solana-amman:v1.11.1';
let DOCKER_PATH = 'docker';
if (process.platform === 'darwin') {
  DOCKER_PATH = '/usr/local/bin/docker';
}

const validatorLogs = async (msg: ValidatorLogsRequest) => {
  const { filter } = msg;
  const MAX_TAIL_LINES = 10000;
  const MAX_DISPLAY_LINES = 30;

  // TODO: doing this out of process might be a better fit
  const maxBuffer = 104857600; // 100MB

  if (!shell.which(DOCKER_PATH)) {
    return 'Docker executable not found.';
  }

  // TODO: and now test if there's a Docker daemon up

  try {
    if (filter !== '') {
      const { stderr } = await execAsync(
        `${DOCKER_PATH} logs --tail ${MAX_TAIL_LINES} solana-test-validator`,
        { maxBuffer }
      );
      const lines = stderr.split('\n').filter((s) => s.match(filter));
      const matchingLines = lines
        .slice(Math.max(lines.length - MAX_DISPLAY_LINES, 0))
        .join('\n');
      logger.debug('Filtered log lookup', {
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
  } catch (error) {
    logger.error('catch', error as string);
    return error as string;
  }

  return '';
};

export { runValidator, validatorLogs };
