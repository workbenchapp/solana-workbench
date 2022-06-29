import promiseIpc from 'electron-promise-ipc';
import { IpcMainEvent, IpcRendererEvent } from 'electron';
import Docker = require('dockerode');

import { logger } from '../logger';

declare type IpcEvent = IpcRendererEvent & IpcMainEvent;

// Need to import the file and call a function (from the main process) to get the IPC promise to exist.
export function initDockerPromises() {
  promiseIpc.on(
    'DOCKER-GetImageTags',
    (name: unknown, event?: IpcEvent | undefined) => {
      logger.silly(`main: called DOCKER-GetImageTags, ${name}, ${event}`);

      // TODO: this would use something like https://github.com/jessestuart/docker-hub-utils
      // start with just ... curl https://hub.docker.com/v2/repositories/cryptoworkbench/solana-amman/tags/ | jq '.results[].name'

      return ['v1.9.29', 'v1.10.27', 'v1.11.1'];
    }
  );

  promiseIpc.on(
    'DOCKER-GetContainerStatus',
    (name: unknown, event?: IpcEvent | undefined) => {
      logger.silly(`main: called DOCKER-GetContainerStatus, ${name}, ${event}`);

      const dockerClient = new Docker();
      return dockerClient.getContainer(name as string).inspect();
    }
  );

  promiseIpc.on(
    'DOCKER-CreateValidatorContainer',
    (image: unknown, event?: IpcEvent | undefined) => {
      logger.info(
        `main: called DOCKER-CreateValidatorContainer, ${image}, ${event}`
      );

      const dockerClient = new Docker();
      return dockerClient.pull(image as string).then(() => {
        return dockerClient
          .createContainer({
            name: 'solana-test-validator',
            Image: image,
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
          });
      });
    }
  );

  promiseIpc.on(
    'DOCKER-StartValidatorContainer',
    (image: unknown, event?: IpcEvent | undefined) => {
      logger.info(
        `main: called DOCKER-StartValidatorContainer, ${image}, ${event}`
      );

      const dockerClient = new Docker();
      const container = dockerClient.getContainer('solana-test-validator');
      logger.error(`start: solana-test-validator`);

      return container.start({});
    }
  );

  promiseIpc.on(
    'DOCKER-StartAmmanValidator',
    (image: unknown, event?: IpcEvent | undefined) => {
      logger.info(
        `main: called DOCKER-StartAmmanValidator, ${image}, ${event}`
      );

      const dockerClient = new Docker();
      const container = dockerClient.getContainer('solana-test-validator');
      logger.error(`exec: solana-test-validator`);

      return container
        .exec({
          Cmd: ['/bin/bash', '-c', 'source /root/.bashrc && amman start'],
          AttachStdin: false,
          AttachStdout: false,
        })
        .then((e: Docker.Exec) => {
          console.log('exec created');

          return e.start({
            hijack: true,
            stdin: false,
            Detach: true,
            Tty: true,
          });
        })
        .then((output) => {
          console.log(`execed: ${JSON.stringify(output)}`);
          return output;
        });
    }
  );

  promiseIpc.on(
    'DOCKER-StopAmmanValidator',
    (image: unknown, event?: IpcEvent | undefined) => {
      logger.info(`main: called DOCKER-StopAmmanValidator, ${image}, ${event}`);

      const dockerClient = new Docker();
      const container = dockerClient.getContainer('solana-test-validator');
      logger.error(`exec: solana-test-validator`);

      return container
        .exec({
          Cmd: ['/bin/bash', '-c', 'source /root/.bashrc && amman stop'],
          AttachStdin: false,
          AttachStdout: false,
        })
        .then((e: Docker.Exec) => {
          console.log('exec created');

          return e.start({
            hijack: true,
            stdin: false,
            Detach: true,
            Tty: true,
          });
        })
        .then((output) => {
          console.log(`execed: ${JSON.stringify(output)}`);
          return output;
        });
    }
  );
}

export default {};
