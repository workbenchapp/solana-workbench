import { faCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import useInterval from 'common/hooks';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, FormControl, InputGroup } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, validatorActions } from 'renderer/slices/mainSlice';
import { Net, ValidatorState } from 'types/types';
import { debounce } from 'underscore';

const Run = () => {
  const [validatorLogs, setValidatorLogs] = useState('');
  const filterRef = useRef<HTMLInputElement>({} as HTMLInputElement);
  const validator: ValidatorState = useSelector(
    (state: RootState) => state.validator
  );

  const dispatch = useDispatch();

  const fetchLogs = useCallback(() => {
    if (validator.running) {
      window.electron.ipcRenderer.validatorLogs({
        filter: filterRef.current.value,
      });
    }
  }, [validator.running]);

  const triggerFetchLogs = debounce(fetchLogs, 800);

  const runValidator = () => {
    dispatch(validatorActions.setWaitingForRun(true));
    window.electron.ipcRenderer.runValidator();
  };

  useEffect(() => {
    window.electron.ipcRenderer.validatorState({
      net: Net.Localhost,
    });
  }, []);

  useInterval(
    () => window.electron.ipcRenderer.validatorState({ net: Net.Localhost }),
    5000
  );
  useEffect(() => {
    const validatorLogsListener = (logs: string) => {
      setValidatorLogs(logs);
    };
    window.electron.ipcRenderer.on('validator-logs', validatorLogsListener);
    fetchLogs();

    return () => {
      window.electron.ipcRenderer.removeListener(
        'validator-logs',
        validatorLogsListener
      );
    };
  }, [fetchLogs]);

  let statusDisplay = (
    <div>
      <FontAwesomeIcon className="me-1 fa-spin" icon={faSpinner} />
      {validator.waitingForRun && (
        <small className="text-muted">
          Starting validator. This can take about a minute...
        </small>
      )}
    </div>
  );

  if (!validator.loading && !validator.waitingForRun) {
    if (validator.running) {
      statusDisplay = (
        <span className="badge bg-light text-dark">
          <FontAwesomeIcon className="sol-green me-1" icon={faCircle} />
          Validator Available
        </span>
      );
    } else {
      statusDisplay = (
        <div>
          <div>
            <span className="badge bg-light text-dark">
              <FontAwesomeIcon className="text-danger me-1" icon={faCircle} />
              Validator Not Running
            </span>
          </div>
          <div>
            <Button onClick={runValidator} className="mt-2" variant="dark">
              Run
            </Button>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="row">
      <div className="col-sm-3">
        <div className="col">
          <div>{statusDisplay}</div>
        </div>
      </div>
      <div className="col-sm-9">
        <InputGroup size="sm">
          <FormControl
            ref={filterRef}
            placeholder="Filter logs"
            aria-label="Amount"
            onKeyDown={triggerFetchLogs}
          />
        </InputGroup>
        <pre className="mt-2 pre-scrollable">
          <code className={`${!validator.running ? 'text-muted' : ''}`}>
            {validatorLogs}
          </code>
        </pre>
      </div>
    </div>
  );
};

export default Run;
