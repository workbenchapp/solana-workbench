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
import {
  NetStatus,
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
          // setValidatorImageTags(tags);
          // logger.info(`INSPECT: ${JSON.stringify(inspect)}`);

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
        .catch((inspectError) => {
          setContainerInspect({});
          // logger.error(inspectError);
        });
    }

    if (validator.status === NetStatus.Running) {
      window.electron.ipcRenderer.validatorLogs({
        filter: filterRef.current.value || '',
        net: validator.net,
      });
    }
  }, 5000);

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
          setValidatorLogs(res);
          break;
        default:
      }
    };
    window.electron.ipcRenderer.on('main', listener);
    if (validator.status === NetStatus.Running) {
      window.electron.ipcRenderer.validatorLogs({
        filter: '',
        net: validator.net,
      });
    }
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
            disabled={containerInspect?.State || validatorImageTag === ''}
            onClick={() => {
              logger.info(`calling ${JSON.stringify(validatorImageTag)}`);

              toast.promise(
                window.promiseIpc
                  .send('DOCKER-CreateValidatorContainer', validatorImageTag)
                  .then((info: any) => {
                    // setValidatorImageTags(tags);
                    logger.info(`hooray ${JSON.stringify(info)}`);
                    return info;
                  }),
                {
                  pending: `CreateValidatorContainer submitted`,
                  success: `CreateValidatorContainer succeeded 👌`,
                  error: `CreateValidatorContainer failed 🤯`,
                }
              );
            }}
            className="mt-2 mb-4"
            variant="dark"
          >
            Create Container
          </Button>
          <Button
            size="sm"
            disabled={
              containerInspect?.State?.Running || validatorImageTag === ''
            }
            onClick={() => {
              ipcDockerToast('StartValidatorContainer');
            }}
            className="mt-2 mb-4"
            variant="dark"
          >
            Start Container
          </Button>
          <Button
            size="sm"
            disabled={!containerInspect?.State?.Running}
            onClick={() => {
              ipcDockerToast('StartAmmanValidator');
            }}
            className="mt-2 mb-4"
            variant="dark"
          >
            Start Amman validator
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
            if (validator.status === NetStatus.Running) {
              window.electron.ipcRenderer.validatorLogs({
                filter: filterRef.current.value || '',
                net: validator.net,
              });
            }
          }, 300)}
        />
      </InputGroup>
      <pre className="mt-2 pre-scrollable">
        <code>{validatorLogs}</code>
      </pre>
    </div>
  );
};

export default Validator;
