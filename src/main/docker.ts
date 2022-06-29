import * as shell from 'shelljs';
import { logger } from './logger';

// eslint-disable-next-line import/no-mutable-exports
let DOCKER_PATH = 'docker';
if (process.platform === 'darwin') {
  DOCKER_PATH = '/usr/local/bin/docker';
}

enum DockerStatus {
  Unknown = 'unknown',
  Unavailable = 'unavailable', // unavailbale in the system (not installed or configured properly)
  Unauthorized = 'Unauthorized', // deamon connection permission denied
  Ok = 'ok',
}

const checkDockerState = (): DockerStatus => {
  if (!shell.which(DOCKER_PATH)) {
    logger.info('Docker executable not found.');
    return DockerStatus.Unavailable;
  }
  return DockerStatus.Ok;
};

export { checkDockerState, DockerStatus, DOCKER_PATH };
