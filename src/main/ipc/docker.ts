import promiseIpc from 'electron-promise-ipc';
import { IpcMainEvent, IpcRendererEvent } from 'electron';
import { writeFile } from 'fs';
import Dockerode from 'dockerode';
import * as shell from 'shelljs';

import * as newStream from 'stream';
import { get } from 'https';
import { execAsync } from '../const';

import { logger } from '../logger';
import { log } from '../validator';
import { netToURL } from '../../common/strings';
import { Net } from '../../types/types';

declare type IpcEvent = IpcRendererEvent & IpcMainEvent;

const DOCKER_PATH =
  process.platform === 'darwin' ? '/usr/local/bin/docker' : 'docker';

const ammanrc = {
  validator: {
    // By default Amman will pull the account data from the accountsCluster (can be overridden on a per account basis)
    accountsCluster: netToURL(Net.MainnetBeta),
    accounts: [
      {
        label: 'Token Metadata Program',
        accountId: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
        // marking executable as true will cause Amman to pull the executable data account as well automatically
        executable: true,
      },
      {
        // This is an onchain account Sven uses for testing that the import worked (and other tests)
        label: 'Svens debug account',
        accountId: 'SvencSSSMANWBYyqFhMur1r7a3N6WAA1TEQNSEcRBnz',
      },
      {
        // Random devnet account ()
        label: 'Random other account',
        accountId: '4VLgNs1jXgdciSidxcaLKfrR9WjATkj6vmTm5yCwNwui',

        // Providing a cluster here will override the accountsCluster field
        cluster: netToURL(Net.Dev),
      },
    ],
    killRunningValidators: true,
    jsonRpcUrl: 'http://0.0.0.0:8899',
    websocketUrl: 'ws://0.0.0.0:8900',
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

  function onPullProgress(_event: any) {
    log(`onPullProgress: ${JSON.stringify(_event)}`);
  }

  await new Promise((resolve) =>
    dockerClient.modem.followProgress(pullStream, resolve, onPullProgress)
  );

  log(`finished Pulling ${image}`);

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
  // TODO: this presupposes that this workbench session starts the validator
  //       should change this so the `amman start` tee's to a file, and then use `docker exec tail -n 20` or something
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
      log('start amman exec created');

      return exec.start({});
    });

  const stream = await p;
  container.modem.demuxStream(stream, logStream, logStream);
  log('Exiting execAmman');
  return p;
}
type ImageTagsResult = {
  count: number;
  results: HubImageTag[];
};
type HubImageTag = {
  name: string;
};

async function getImageTags(imageName: string): Promise<string[]> {
  const url = `https://hub.docker.com/v2/repositories/${imageName}/tags/`;

  const promise = new Promise<string>((resolve, reject) => {
    let data = '';
    get(url, (res) => {
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(data);
      });
      res.on('error', reject);
    });
  });
  const result = await promise; // wait until the promise resolves

  const images: ImageTagsResult = JSON.parse(result);

  const tags = images.results.map((res: HubImageTag) => {
    return `${res.name}`;
  });

  log(`Found ${imageName}: image tags: ${JSON.stringify(tags)}`);
  return tags;
}

// Need to import the file and call a function (from the main process) to get the IPC promise to exist.
export function initDockerPromises() {
  promiseIpc.on('DOCKER-CheckDocker', async () => {
    logger.silly(`main: called DOCKER-CheckDocker`);

    if (!shell.which(DOCKER_PATH)) {
      logger.info(`Docker executable not found. ${DOCKER_PATH}`);
      throw Error(`Docker executable not found.`);
    }

    const dockerClient = new Dockerode();

    try {
      await dockerClient.listContainers();
    } catch (err: any) {
      throw Error(
        'Could not connect to Docker. Please start Docker to run validators.'
      );
    }

    return true;
  });

  promiseIpc.on(
    'DOCKER-GetImageTags',
    (name: unknown, event?: IpcEvent | undefined) => {
      logger.silly(`main: called DOCKER-GetImageTags, ${name}, ${event}`);
      log(`main: called DOCKER-GetImageTags, ${name}, ${event}`);

      return getImageTags('cryptoworkbench/solana-amman');
    }
  );

  promiseIpc.on(
    'DOCKER-GetContainerStatus',
    (name: unknown, event?: IpcEvent | undefined) => {
      logger.silly(`main: called DOCKER-GetContainerStatus, ${name}, ${event}`);

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
          // TODO: wait til the validator has stopped..
          return 'OK';
        });
    }
  );
}

export default {};
