import * as shell from 'shelljs';
import Docker = require('dockerode');
import { ValidatorLogsRequest } from '../types/types';
import { execAsync } from './const';
import { logger } from './logger';

const DOCKER_IMAGE = 'cryptoworkbench/solana-amman:v1.11.1';
let DOCKER_PATH = 'docker';
if (process.platform === 'darwin') {
  DOCKER_PATH = '/usr/local/bin/docker';
}

const runValidator = async () => {
  if (!shell.which(DOCKER_PATH)) {
    logger.info('Docker executable not found.');
    return;
  }

  // TODO: and now test if there's a Docker daemon up
  try {
    const { stdout } = await execAsync(
      `${DOCKER_PATH} inspect solana-test-validator`
    );
    const inspectOutput = JSON.parse(stdout)[0];
    const running = inspectOutput.State.Running;
    const exitCode = inspectOutput.State.ExitCode;
    if (!running && exitCode !== 0) {
      // eslint-disable-next-line no-console
      console.log(
        await execAsync(`${DOCKER_PATH} logs --tail 100 solana-test-validator`)
      );
      logger.error('Removing solana-test-validator...');
      // eslint-disable-next-line no-console
      console.log(await execAsync(`${DOCKER_PATH} rm solana-test-validator`));
      throw new Error("Container exists, but isn't running.");
    }
  } catch (e) {
    logger.error(`NO-CONTAINER: ${e}`);
    // TODO: check for image, pull if not present
    // await execAsync(
    //   `${DOCKER_PATH} run \
    //     --name solana-test-validator \
    //     -d \
    //     -v /test-ledger \
    //     --init \
    //     -p 8899:8899/tcp \
    //     -p 8900:8900/tcp \
    //     -p 9900:9900/tcp \
    //     -p 10000:10000/tcp \
    //     -p 10000-10020:10000-10020/udp \
    //     --log-driver local \
    //     --ulimit nofile=1000000 \
    //     ${DOCKER_IMAGE} \
    //     solana-test-validator \
    //     --dynamic-port-range 10000-10020 \
    //     --ledger test-ledger \
    //     --no-bpf-jit \
    //     --log`
    // );
    const dockerClient = new Docker();
    logger.error(`PULL: ${DOCKER_IMAGE}`);

    await dockerClient
      .pull(DOCKER_IMAGE)
      .then((o) => {
        console.log('image pulled');
        return o;
      })
      .catch((e) => {
        console.log(`catch ${e}`);
        throw e;
      });

    logger.error(`create: solana-test-validator`);

    await dockerClient
      .createContainer({
        name: 'solana-test-validator',
        Image: DOCKER_IMAGE,
        AttachStdin: false,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
        Entrypoint: 'tail',
        Cmd: ['-f', '/etc/os-release'],
        OpenStdin: false,
        StdinOnce: false,
        Labels: {
          environment: 'blueWhale',
        },
        ExposedPorts: {
          '8899/tcp': {},
          '8900/tcp': {},
        },
        HostConfig: {
          PortBindings: {
            '8899/tcp': [
              {
                HostPort: '8899',
              },
            ],
            '8900/tcp': [
              {
                HostPort: '8900',
              },
            ],
          },
        },
      })
      .then((container: Docker.Container) => {
        console.log('container created');
        return container;
      })
      .catch(console.log);
  }
  //  await execAsync(`${DOCKER_PATH} start solana-test-validator`);
  const dockerClient = new Docker();

  const container = dockerClient.getContainer('solana-test-validator');
  logger.error(`start: solana-test-validator`);

  container
    .start({})
    .then((startedContainer: Docker.Container) => {
      console.log('container started');

      container
        .exec({
          Cmd: ['bash', '-c', 'amman start'],
          AttachStdin: false,
          AttachStdout: false,
        })
        .then((e: Docker.Exec) => {
          console.log('exec created');

          return e.start({});
        })
        .then(() => {
          console.log('execed');
          return true;
        })
        .catch(console.log);
      return startedContainer;
    })
    .catch(console.log);
};

const stopValidator = async () => {
  try {
    const { stdout } = await execAsync(
      `${DOCKER_PATH} inspect solana-test-validator`
    );
    const inspectOutput = JSON.parse(stdout)[0];
    const running = inspectOutput.State.Running;
    if (running) {
      // eslint-disable-next-line no-console
      console.log(
        await execAsync(`${DOCKER_PATH} logs --tail 100 solana-test-validator`)
      );
      logger.error('Stoping solana-test-validator...');
      // eslint-disable-next-line no-console
      console.log(await execAsync(`${DOCKER_PATH} stop solana-test-validator`));
      throw new Error('Container stopped.');
    }
  } catch (err) {
    logger.error(err);
  }
};

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

export { runValidator, stopValidator, validatorLogs };
