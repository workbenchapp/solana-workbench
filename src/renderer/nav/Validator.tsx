/* eslint-disable no-nested-ternary */
/* eslint-disable no-console */
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import useInterval from 'common/hooks';
import { useEffect, useRef, useState } from 'react';
import { Button, FormControl, InputGroup } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, validatorActions } from 'renderer/slices/mainSlice';
import { Net, NetStatus, ValidatorState } from 'types/types';
import { debounce } from 'underscore';

const Validator = () => {
  const [validatorLogs, setValidatorLogs] = useState('');
  const filterRef = useRef<HTMLInputElement>({} as HTMLInputElement);
  const validator: ValidatorState = useSelector(
    (state: RootState) => state.validator
  );
  const dispatch = useDispatch();

  useEffect(() => {
    window.electron.ipcRenderer.validatorState({ net: Net.Localhost });
  }, []);

  useInterval(() => {
    window.electron.ipcRenderer.validatorState({ net: Net.Localhost });
    if (validator.status === NetStatus.Running) {
      window.electron.ipcRenderer.validatorLogs({
        filter: filterRef.current.value || '',
      });
    }
  }, 5000);

  useEffect(() => {
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
      net: Net.Localhost,
    });
    return () => {
      window.electron.ipcRenderer.removeListener('main', listener);
    };
  }, []);

  // TODO(nathanleclaire): Don't nest ternary
  return (
    <div className="row">
      {!(validator.status === NetStatus.Running) && !(validator.status === NetStatus.Starting) ? (
        <Button
          onClick={() => {
            dispatch(validatorActions.setState(NetStatus.Starting));
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
                  });
                }
              }, 300)}
            />
          </InputGroup>
          <pre className="mt-2 pre-scrollable">
            <code>{validatorLogs}</code>
          </pre>
        </>
      )}
    </div>
  );
};

export default Validator;
