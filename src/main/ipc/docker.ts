import promiseIpc from 'electron-promise-ipc';
import { IpcMainEvent, IpcRendererEvent } from 'electron';
import { writeFile } from 'fs';
import Dockerode from 'dockerode';
import * as shell from 'shelljs';

import * as newStream from 'stream';
import { execAsync } from '../const';

import { logger } from '../logger';
import { log, DOCKER_PATH } from '../validator';

declare type IpcEvent = IpcRendererEvent & IpcMainEvent;

const ammanrc = {
  validator: {
    // By default Amman will pull the account data from the accountsCluster (can be overridden on a per account basis)
    accountsCluster: 'https://api.metaplex.solana.com',
    accounts: [
      {
        label: 'Token Metadata Program',
        accountId: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
        // marking executable as true will cause Amman to pull the executable data account as well automatically
        executable: true,
      },
      {
        label: 'Svens debug account',
        accountId: 'SvencSSSMANWBYyqFhMur1r7a3N6WAA1TEQNSEcRBnz',
      },
      {
        label: 'Random other account',
        accountId: '4VLgNs1jXgdciSidxcaLKfrR9WjATkj6vmTm5yCwNwui',
        // By default executable is false and is not required to be in the config
        // executable: false,

        // Providing a cluster here will override the accountsCluster field
        cluster: 'https://metaplex.devnet.rpcpool.com',
      },
    ],
    killRunningValidators: true,
    jsonRpcUrl: 'http://0.0.0.0:8899',
    websocketUrl: '',
    commitment: 'confirmed',
    // ledgerDir: tmpLedgerDir(),
    resetLedger: true,
    verifyFees: false,
    detached: true,
  },
  relay: {
    enabled: true,
    killlRunningRelay: true,
  },
  storage: {
    enabled: false,
    storageId: 'mock-storage',
    clearOnStart: true,
  },
};

export type CopyFileRequest = {
  filename: string;
  destination: string;
  content: string;
};
const copyDockerFile = async (msg: CopyFileRequest) => {
  const { filename, destination, content } = msg;
  logger.info(`try writing to ${filename}`);

  if (!shell.which(DOCKER_PATH)) {
    logger.info(`Docker executable not found. ${DOCKER_PATH}`);

    return 'Docker executable not found.';
  }

  // TODO: and now test if there's a Docker daemon up

  try {
    logger.info(`writing to ${filename}`);
    writeFile(filename, content, (err) => {
      if (err) {
        logger.error(err);
        throw err;
      }
    });
    const { stderr } = await execAsync(
      `${DOCKER_PATH} cp ${filename} solana-test-validator:${destination}/${filename}`,
      {}
    );
    logger.info(`ok wrote to ${filename}: ${stderr}`);

    return stderr;
  } catch (error) {
    logger.error('catch', error as string);
    return error as string;
  }

  return '';
};

async function createContainer(image: string) {
  const dockerClient = new Dockerode();
  log(`Pull ${image}`);
  const pullStream = await dockerClient.pull(image);
  // logger.info(`----------- pullStream ${JSON.stringify(pullStream)}`);

  function onPullProgress(_event: any) {
    // ...
    // logger.info(`onPullProgress: ${JSON.stringify(_event)}`);
    log(`onPullProgress: ${JSON.stringify(_event)}`);
  }

  await new Promise((resolve) =>
    dockerClient.modem.followProgress(pullStream, resolve, onPullProgress)
  );

  log(`finished Pulling ${image}`);

  // function onPullFinished(ferr: any, _output: any) {
  //   if (ferr) {
  //     throw ferr;
  //   }
  //   logger.info(`onPullFinished: ${JSON.stringify(_output)}`);
  //   log(`FINISHED pulling container image ${image as string}`);
  // }

  // await dockerClient.modem.followProgress(
  //   pullStream,
  //   onPullFinished,
  //   onPullProgress
  // );

  return dockerClient
    .createContainer({
      name: 'solana-test-validator',
      Image: image as string,
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
    .then((container: Dockerode.Container) => {
      logger.info(`container created ${container.id}`);
      log('container created');
      return 'OK';
    })
    .catch(logger.error);
}

async function execAmman() {
  copyDockerFile({
    filename: '.ammanrc.js',
    content: `module.exports = ${JSON.stringify(ammanrc)}`,
    destination: '/test-ledger',
  });

  const dockerClient = new Dockerode();
  const container = dockerClient.getContainer('solana-test-validator');
  logger.error(`request start amman exec: solana-test-validator`);
  log(`request start amman exec: solana-test-validator`);

  const logStream = new newStream.PassThrough();
  logStream.on('data', (chunk) => {
    log(chunk.toString('utf8'));
  });

  const p = container
    .exec({
      Cmd: ['/bin/bash', '-c', 'source /root/.bashrc && amman start'],
      AttachStdin: true,
      AttachStdout: true,
    })
    .then((exec: Dockerode.Exec) => {
      console.log('exec created');
      log('start amman exec created');

      return exec.start({
        // hijack: true,
        // stdin: true,
        // Detach: false,
        // Tty: true,
      });
    });

  const stream = await p;
  container.modem.demuxStream(stream, logStream, logStream);
  log('Exiting execAmman');
  return p;
}

// Need to import the file and call a function (from the main process) to get the IPC promise to exist.
export function initDockerPromises() {
  promiseIpc.on(
    'DOCKER-GetImageTags',
    (name: unknown, event?: IpcEvent | undefined) => {
      logger.silly(`main: called DOCKER-GetImageTags, ${name}, ${event}`);
      log(`main: called DOCKER-GetImageTags, ${name}, ${event}`);

      // TODO: this would use something like https://github.com/jessestuart/docker-hub-utils
      // start with just ... curl https://hub.docker.com/v2/repositories/cryptoworkbench/solana-amman/tags/ | jq '.results[].name'

      return ['v1.9.29', 'v1.10.27', 'v1.11.1'];
    }
  );

  promiseIpc.on(
    'DOCKER-GetContainerStatus',
    (name: unknown, event?: IpcEvent | undefined) => {
      logger.silly(`main: called DOCKER-GetContainerStatus, ${name}, ${event}`);
      // log(`main: called DOCKER-GetContainerStatus, ${name}, ${event}`);

      const dockerClient = new Dockerode();
      return dockerClient.getContainer(name as string).inspect();
    }
  );

  promiseIpc.on(
    'DOCKER-CreateValidatorContainer',
    (image: unknown, event?: IpcEvent | undefined) => {
      logger.info(
        `main: called DOCKER-CreateValidatorContainer, ${image}, ${event}`
      );

      return createContainer(image as string);
    }
  );

  async function startContainer() {
    const dockerClient = new Dockerode();
    const container = dockerClient.getContainer('solana-test-validator');
    logger.error(`request start: solana-test-validator`);
    log(`request start: solana-test-validator`);

    return container.start();
  }

  promiseIpc.on(
    'DOCKER-StartValidatorContainer',
    (image: unknown, event?: IpcEvent | undefined) => {
      logger.info(
        `main: called DOCKER-StartValidatorContainer, ${image}, ${event}`
      );

      return startContainer();
    }
  );

  promiseIpc.on(
    'DOCKER-StopValidatorContainer',
    (image: unknown, event?: IpcEvent | undefined) => {
      logger.info(
        `main: called DOCKER-StopValidatorContainer, ${image}, ${event}`
      );

      const dockerClient = new Dockerode();
      const container = dockerClient.getContainer('solana-test-validator');
      logger.error(`request stop: solana-test-validator`);
      log(`request stop: solana-test-validator`);

      return container
        .stop()
        .then(() => {
          logger.info('request stop started ');
          log('request stop started ');
          return container.wait();
        })
        .then(() => {
          logger.info('container stopped ');
          log('container stopped ');
          return 'OK';
        });
    }
  );

  promiseIpc.on(
    'DOCKER-RemoveValidatorContainer',
    (image: unknown, event?: IpcEvent | undefined) => {
      logger.info(
        `main: called DOCKER-RemoveValidatorContainer, ${image}, ${event}`
      );

      const dockerClient = new Dockerode();
      const container = dockerClient.getContainer('solana-test-validator');
      logger.error(`remove requested: solana-test-validator`);
      log(`remove requested: solana-test-validator`);

      // TODO: should we be force removing?
      return container.remove({ force: true }).then(() => {
        logger.info('container removed ');
        log('container removed ');
        return 'OK';
      });
    }
  );

  promiseIpc.on(
    'DOCKER-StartAmmanValidator',
    (image: unknown, event?: IpcEvent | undefined) => {
      logger.info(
        `main: called DOCKER-StartAmmanValidator, ${image}, ${event}`
      );
      return execAmman();
    }
  );

  promiseIpc.on(
    'DOCKER-StopAmmanValidator',
    (image: unknown, event?: IpcEvent | undefined) => {
      logger.info(`main: called DOCKER-StopAmmanValidator, ${image}, ${event}`);

      const dockerClient = new Dockerode();
      const container = dockerClient.getContainer('solana-test-validator');
      logger.error(`request stop amman exec: solana-test-validator`);
      log(`request stop amman exec: solana-test-validator`);

      return container
        .exec({
          Cmd: ['/bin/bash', '-c', 'source /root/.bashrc && amman stop'],
          AttachStdin: false,
          AttachStdout: false,
        })
        .then((e: Dockerode.Exec) => {
          console.log('exec stop amman created');
          log('exec stop amman created');

          return e.start({
            hijack: true,
            stdin: false,
            Detach: true,
            Tty: true,
          });
        })
        .then(() => {
          logger.info('exec stop amman started ');
          log('exec stop amman started ');
          // TODO: wait tile the validator has stopped..
          return 'OK';
        });
    }
  );
}

export default {};
