/* eslint-disable no-nested-ternary */
import { toast } from 'react-toastify';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from 'react-query';

import {
  Button,
  Alert,
  DropdownButton,
  Dropdown,
  ButtonToolbar,
} from 'react-bootstrap';
import AnsiUp from 'ansi_up';
import DOMPurify from 'dompurify';

import {
  Net,
  selectValidatorNetworkState,
} from '../data/ValidatorNetwork/validatorNetworkState';
import { useAppSelector, useInterval } from '../hooks';
import { logger } from '../common/globals';

const ipcDockerToast = (dockerIPCMethod: string) => {
  return toast.promise(window.promiseIpc.send(`DOCKER-${dockerIPCMethod}`), {
    pending: `${dockerIPCMethod} submitted`,
    success: `${dockerIPCMethod} succeeded 👌`,
    error: `${dockerIPCMethod} failed 🤯`,
  });
};

const ansiUp = new AnsiUp();

const Validator = () => {
  const [validatorLogs, setValidatorLogs] = useState('');
  const filterRef = useRef<HTMLInputElement>({} as HTMLInputElement);
  const validator = useAppSelector(selectValidatorNetworkState);
  const validatorImageName = 'cryptoworkbench/solana-amman';
  const [validatorImageTag, setValidatorImageTag] = useState<string | null>(
    `${validatorImageName}:v1.10.31`
  );
  // const [validatorImageTags, setValidatorImageTags] = useState<string[]>([]);
  const [containerInspect, setContainerInspect] = useState<any>({});
  const [dockerErr, setDockerErr] = useState<string | undefined>('Loading...');

  const {
    /* isLoading: validatorImageTagsIsLoading, */
    /* error: validatorImageTagsError, */
    data: validatorImageTagsData,
  } = useQuery('validatorImageTags', () =>
    window.promiseIpc.send('DOCKER-GetImageTags', validatorImageName)
  );

  const validatorImageTags = validatorImageTagsData || [
    'Image list loading....',
  ];

  // TODO: not sure how to tell the user if we fail to get the list of image tags...
  //  if (isLoading) return 'Loading...'
  //  if (error) return 'An error has occurred: ' + error.message

  useInterval(() => {
    if (validator.net === Net.Localhost) {
      window.promiseIpc
        .send('DOCKER-GetContainerStatus', 'solana-test-validator')
        .then((inspect: any) => {
          if (!inspect) {
            setContainerInspect({});
            return {};
          }
          setContainerInspect(inspect);

          if (inspect?.Config?.Image) {
            setValidatorImageTag(inspect.Config.Image);
          }

          return inspect;
        })
        .catch((inspectError: any) => {
          setContainerInspect({});
          logger.silly(inspectError);
        });
    }
  }, 5000);

  useInterval(() => {
    window.electron.ipcRenderer.validatorLogs({
      filter: filterRef.current.value || '',
      net: validator.net,
    });
  }, 222);

  const checkForDocker = () => {
    if (validator.net === Net.Localhost) {
      window?.promiseIpc
        .send('DOCKER-CheckDocker')
        .then(() => {
          setDockerErr(undefined);
          return true;
        })
        .catch((err) => {
          logger.warn(err);
          setDockerErr(err.message);
        });
    }
  };
  useInterval(checkForDocker, 1000);
  checkForDocker();

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listener = (resp: any) => {
      const { method, res } = resp;
      switch (method) {
        case 'validator-logs':
          // eslint-disable-next-line prettier/prettier
          setValidatorLogs(
            DOMPurify.sanitize(ansiUp.ansi_to_html(res.join('\n')))
          );
          break;
        default:
      }
    };
    window.electron.ipcRenderer.on('main', listener);
    window.electron.ipcRenderer.validatorLogs({
      filter: '',
      net: validator.net,
    });
    return () => {
      window.electron.ipcRenderer.removeListener('main', listener);
    };
  }, [validator.net, validator.status]);

  if (validator.net !== Net.Localhost) {
    return (
      <div className="p-3">
        <Alert variant="warning">
          Cannot show validator container output from {validator.net}
        </Alert>
      </div>
    );
  }

  if (dockerErr) {
    return (
      <div className="p-3">
        {dockerErr}
        {dockerErr.includes('executable not found') && (
          <div>
            Please{' '}
            <a
              href="https://docs.docker.com/engine/install/"
              target="_blank"
              className="underline"
              rel="noreferrer"
            >
              install Docker
            </a>{' '}
            to run validators.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-3">
      <ButtonToolbar aria-label="Toolbar with button groups">
        <div className="flex gap-2 mb-2">
          <Button
            size="sm"
            disabled={validatorImageTag === ''}
            onClick={() => {
              logger.info(`GOGOGO ${JSON.stringify(validatorImageTag)}`);

              if (!containerInspect || !containerInspect.State) {
                toast.promise(
                  window.promiseIpc
                    .send('DOCKER-CreateValidatorContainer', validatorImageTag)
                    .then((info: any) => {
                      logger.info(`create ${JSON.stringify(info)}`);
                      return info;
                    })
                    .then(() => {
                      // eslint-disable-next-line promise/catch-or-return, promise/no-nesting
                      ipcDockerToast('StartValidatorContainer').then(() => {
                        logger.info('STARTED CONTAINER');
                        logger.info('START AMMAN');
                        // TODO: StartAmmanValidator blocks, no toast for now
                        window.promiseIpc.send(`DOCKER-StartAmmanValidator`);
                        logger.info('STARTED AMMAN');
                        return 'ok';
                      });
                      return 'ok';
                    }),
                  {
                    pending: `CreateValidatorContainer submitted`,
                    success: `CreateValidatorContainer succeeded 👌`,
                    error: `CreateValidatorContainer failed 🤯`,
                  }
                );
              } else if (
                containerInspect &&
                containerInspect.State &&
                !containerInspect.State.Running
              ) {
                ipcDockerToast('StartValidatorContainer')
                  .then(() => {
                    logger.info('STARTED CONTAINER');
                    logger.info('START AMMAN');
                    // TODO: StartAmmanValidator blocks, no toast for now
                    window.promiseIpc.send(`DOCKER-StartAmmanValidator`);
                    logger.info('STARTED AMMAN');
                    return 'ok';
                  })
                  .catch(logger.error);
              } else {
                logger.info('START AMMAN');
                // TODO: StartAmmanValidator blocks, no toast for now
                window.promiseIpc.send(`DOCKER-StartAmmanValidator`);
              }
            }}
            className="mt-2 mb-4"
            variant="dark"
          >
            Start validator
          </Button>
          <Button
            size="sm"
            disabled={!containerInspect?.State?.Running}
            onClick={() => {
              ipcDockerToast('StopAmmanValidator');
            }}
            className="mt-2 mb-4"
            variant="dark"
          >
            Stop Validator
          </Button>
          <Button
            size="sm"
            disabled={!containerInspect?.State?.Running}
            onClick={() => {
              ipcDockerToast('StopValidatorContainer');
            }}
            className="mt-2 mb-4"
            variant="dark"
          >
            Stop Container
          </Button>
          <Button
            size="sm"
            disabled={!containerInspect?.State}
            onClick={() => {
              ipcDockerToast('RemoveValidatorContainer');
            }}
            className="mt-2 mb-4"
            variant="dark"
          >
            Remove Container
          </Button>
          <DropdownButton
            size="sm"
            className="mt-2 mb-4"
            variant="dark"
            title={
              validatorImageTag !== '' ? validatorImageTag : 'Docker Image'
            }
            disabled={containerInspect?.State}
            onSelect={(image: string | null) => {
              logger.info(`selected image: ${image}`);
              setValidatorImageTag(image);
            }}
            align="end"
          >
            {validatorImageTags.map((tag: string) => {
              const image = `${validatorImageName}:${tag}`;
              return (
                <Dropdown.Item eventKey={image} href="#">
                  {image}
                </Dropdown.Item>
              );
            })}
          </DropdownButton>
        </div>
      </ButtonToolbar>
      <div className="overflow-auto">
        <pre
          style={{ opacity: containerInspect?.State?.Running ? '100%' : '40%' }}
          className="text-xs bg-surface-600 h-full p-2 whitespace-pre-wrap break-all overflow-auto"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: validatorLogs }}
        />
      </div>
    </div>
  );
};

export default Validator;
