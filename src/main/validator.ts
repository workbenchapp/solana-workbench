import { ValidatorLogsRequest } from '../types/types';
import { execAsync } from './const';
import { logger } from './logger';

const DOCKER_IMAGE =
  process.arch === 'arm64'
    ? 'cryptoworkbench/solana'
    : 'solanalabs/solana:v1.9.11';
let DOCKER_PATH = 'docker';
if (process.platform === 'darwin') {
  DOCKER_PATH = '/usr/local/bin/docker';
}

const runValidator = async () => {
  try {
    await execAsync(`${DOCKER_PATH} inspect solana-test-validator`);
  } catch (e) {
    // TODO: check for image, pull if not present
    await execAsync(
      `${DOCKER_PATH} run \
        --name solana-test-validator \
        -d \
        -v /test-ledger \
        --init \
        -p 8899:8899/tcp \
        -p 8900:8900/tcp \
        -p 9900:9900/tcp \
        -p 10000:10000/tcp \
        -p 10000-10011:10000-10011/udp \
        --log-driver local \
        --ulimit nofile=1000000 \
        ${DOCKER_IMAGE} \
        solana-test-validator \
        --dynamic-port-range 10000-10011 \
        --ledger test-ledger \
        --no-bpf-jit \
        --log`
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

export { runValidator, validatorLogs };
