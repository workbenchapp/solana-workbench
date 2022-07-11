/* eslint-disable no-nested-ternary */
import { toast } from 'react-toastify';

import { useEffect, useRef, useState } from 'react';
import {
  Button,
  FormControl,
  InputGroup,
  Alert,
  DropdownButton,
  Dropdown,
  ButtonToolbar,
} from 'react-bootstrap';
import { debounce } from 'underscore';
import AnsiUp from 'ansi_up';
import DOMPurify from 'dompurify';
import {
  Net,
  selectValidatorNetworkState,
} from '../data/ValidatorNetwork/validatorNetworkState';
import { useAppSelector, useInterval } from '../hooks';
import { logger } from '@/common/globals';

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
  const [validatorImageTag, setValidatorImageTag] = useState<string>('');
  const [validatorImageTags, setValidatorImageTags] = useState<string[]>([]);
  const [containerInspect, setContainerInspect] = useState<any>({});

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

  useEffect(() => {
    window.promiseIpc
      .send('DOCKER-GetImageTags', validatorImageName)
      .then((tags: string[]) => {
        setValidatorImageTags(tags);
        return tags;
      })
      .catch(logger.error);
  }, [validatorImageName]);

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

  return (
    <div className="p-3">
      <ButtonToolbar aria-label="Toolbar with button groups">
        <div className="flex gap-2 mb-2">
          <DropdownButton
            size="sm"
            className="mt-2 mb-4"
            variant="dark"
            title={
              validatorImageTag !== '' ? validatorImageTag : 'Docker image'
            }
            disabled={containerInspect?.State}
            onSelect={(image: string) => {
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
                      // setValidatorImageTags(tags);
                      logger.info(`hooray ${JSON.stringify(info)}`);
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
            Stop Amman validator
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
        </div>
      </ButtonToolbar>
      <InputGroup size="sm">
        <FormControl
          ref={filterRef}
          placeholder="Filter logs"
          aria-label="Amount"
          onKeyDown={debounce(() => {
            window.electron.ipcRenderer.validatorLogs({
              filter: filterRef.current.value || '',
              net: validator.net,
            });
          }, 300)}
        />
      </InputGroup>
      <div className="overflow-auto">
        <pre
          className="text-xs bg-surface-600 h-full p-2 whitespace-pre-wrap break-all overflow-auto"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: validatorLogs }}
        />
      </div>
    </div>
  );
};

export default Validator;
