/* eslint-disable no-nested-ternary */
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useRef, useState } from 'react';
import { Button, FormControl, InputGroup } from 'react-bootstrap';
import { debounce } from 'underscore';

import { useInterval, useAppSelector } from '../hooks';
import {
  Net,
  NetStatus,
  selectValidatorNetworkState,
} from '../data/ValidatorNetwork/validatorNetworkState';

const Validator = () => {
  const [validatorLogs, setValidatorLogs] = useState('');
  const filterRef = useRef<HTMLInputElement>({} as HTMLInputElement);
  const validator = useAppSelector(selectValidatorNetworkState);

  useInterval(() => {
    if (validator.status === NetStatus.Running) {
      window.electron.ipcRenderer.validatorLogs({
        filter: filterRef.current.value || '',
        net: validator.net,
      });
    }
  }, 5000);

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
    window.electron.ipcRenderer.validatorLogs({
      filter: '',
      net: validator.net,
    });
    return () => {
      window.electron.ipcRenderer.removeListener('main', listener);
    };
  }, [validator.net]);

  // TODO(nathanleclaire): Don't nest ternary
  return (
    <div className="row">
      {!(validator.status === NetStatus.Running) &&
      !(validator.status === NetStatus.Starting) ? (
        <Button
          onClick={() => {
            window.electron.ipcRenderer.runValidator();
          }}
          className="mt-2"
          variant="dark"
        >
          Run
        </Button>
      ) : validator.status === NetStatus.Starting ? (
        <div>
          <FontAwesomeIcon className="me-1 fa-spin" icon={faSpinner} />
          <small className="text-muted">
            Starting validator. This can take about a minute...
          </small>
        </div>
      ) : (
        <>
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
        </>
      )}
      <pre className="mt-2 pre-scrollable">
        <code>{validatorLogs}</code>
      </pre>
    </div>
  );
};

export default Validator;
