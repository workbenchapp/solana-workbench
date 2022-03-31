import { faFilter, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useRef, useState } from 'react';
import { Dropdown, DropdownButton } from 'react-bootstrap';
import ReactDOM from 'react-dom';
import OutsideClickHandler from 'react-outside-click-handler';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, toastActions } from '../slices/mainSlice';
import {
  BASE58_PUBKEY_REGEX,
  ImportedAccountMap,
  MAX_PROGRAM_CHANGES_DISPLAYED,
  ProgramAccountChange,
  ProgramChangesState,
  ProgramID,
  WBAccount,
} from '../../types/types';
import Editable from './Editable';
import ProgramChange from './ProgramChange';

function ProgramChangeView(props: {
  accounts: WBAccount[];
  attemptAccountAdd: (pubKey: string, initializing: boolean) => void;
}) {
  const dispatch = useDispatch();
  const { accounts, attemptAccountAdd } = props;
  const { net } = useSelector((state: RootState) => state.validator);

  // want to check paused before updating changes later,
  // so we include these together
  const [changesState, setChangesState] = useState<ProgramChangesState>({
    changes: [],
    paused: false,
  });
  const { changes, paused } = changesState;

  const [uniqueAccounts, setUniqueAccounts] = useState(0);
  const [filterDropdownShow, setFilterDropdownShow] = useState(false);
  const filterProgramIDRef = useRef<HTMLInputElement>({} as HTMLInputElement);

  const [programID, setProgramID] = useState(ProgramID.SystemProgram);

  const pausedTimeoutRef = useRef(0);

  const importedAccounts: ImportedAccountMap = {};
  accounts.forEach((a) => {
    importedAccounts[a.pubKey] = true;
  });

  useEffect(() => {
    const listener = (resp: any) => {
      const { method, res } = resp;
      switch (method) {
        case 'subscribe-program-changes':
          break;
        case 'unsubscribe-program-changes':
          break;
        case 'program-changes':
          ReactDOM.unstable_batchedUpdates(() => {
            setChangesState((prevState) => {
              if (!prevState.paused) {
                setUniqueAccounts(res.uniqueAccounts);
                return { ...prevState, changes: res.changes };
              }
              return prevState;
            });
          });
          break;
        default:
      }
    };
    window.electron.ipcRenderer.on('main', listener);

    return () => {
      window.electron.ipcRenderer.removeListener('main', listener);
    };
  }, []);

  useEffect(() => {
    window.electron.ipcRenderer.subscribeProgramChanges({
      net,
      programID,
    });

    return () => {
      window.electron.ipcRenderer.unsubscribeProgramChanges({
        net,
        programID,
      });
    };
  }, [net, programID]);

  const changeFilterDropdownTitle = (
    <>
      <FontAwesomeIcon className="me-1" icon={faFilter} />
      <span>Filter</span>
    </>
  );

  const setPaused = (p: boolean) => {
    setChangesState((prevState) => ({
      ...prevState,
      paused: p,
    }));
  };
  const pause = () => {
    if (pausedTimeoutRef.current === 0) {
      pausedTimeoutRef.current = window.setTimeout(() => {
        setPaused(true);
        pausedTimeoutRef.current = 0;
      }, 3000);
    }
  };
  const unpause = () => {
    if (pausedTimeoutRef.current !== 0) {
      window.clearTimeout(pausedTimeoutRef.current);
      pausedTimeoutRef.current = 0;
    }
    setPaused(false);
  };

  return (
    <div>
      <div className="mb-2">
        <div className="mb-2">
          <small>
            <strong>Program Account Changes</strong>
          </small>
        </div>
        <Dropdown>
          <OutsideClickHandler
            onOutsideClick={() => setFilterDropdownShow(false)}
            display="inline"
          >
            <DropdownButton
              size="sm"
              id="dropdown-basic-button"
              title={changeFilterDropdownTitle}
              onSelect={(s: string | null) => {
                setFilterDropdownShow(false);
                if (s) setProgramID(s as ProgramID);
              }}
              onClick={() => {
                if (!filterDropdownShow) {
                  setFilterDropdownShow(true);
                } else {
                  setFilterDropdownShow(false);
                }
              }}
              className="ms-2 d-inline"
              variant="light"
              show={filterDropdownShow}
            >
              <div className="ms-1 p-1 border-bottom border-light">
                <small>
                  <strong>Program ID</strong>
                </small>
              </div>
              <Dropdown.Item eventKey="">
                <small>System Program</small>
              </Dropdown.Item>
              <Dropdown.Item eventKey={ProgramID.TokenProgram}>
                <small>Token Program</small>
              </Dropdown.Item>
              <Dropdown.Item eventKey={ProgramID.SerumDEXV3}>
                <small>Serum DEX V3</small>
              </Dropdown.Item>
              <div className="p-2">
                <Editable
                  value="Custom"
                  ref={filterProgramIDRef}
                  onClick={() => {
                    filterProgramIDRef.current.value = '';
                  }}
                  placeholder="Paste Program ID"
                  onKeyDown={(e) => {
                    if (!(e.code === 'MetaRight' || e.code === 'KeyV')) {
                      dispatch(
                        toastActions.push({
                          msg: 'Must paste in valid program ID',
                          variant: 'warning',
                        })
                      );
                      filterProgramIDRef.current.value = 'Custom';
                      filterProgramIDRef.current.blur();
                      setFilterDropdownShow(false);
                    }
                  }}
                  onPaste={(e) => {
                    const pastedID = e.clipboardData.getData('Text');
                    if (pastedID.match(BASE58_PUBKEY_REGEX)) {
                      window.electron.ipcRenderer.unsubscribeProgramChanges({
                        net,
                        programID,
                      });
                      window.electron.ipcRenderer.subscribeProgramChanges({
                        net,
                        programID: pastedID,
                      });
                      setProgramID(pastedID);
                    } else {
                      dispatch(
                        toastActions.push({
                          // todo: full jsx access would be better (code)
                          msg: `Invalid program ID: ${pastedID}`,
                          variant: 'warning',
                        })
                      );
                    }
                    filterProgramIDRef.current.value = 'Custom';
                    filterProgramIDRef.current.blur();
                    setFilterDropdownShow(false);
                  }}
                />
              </div>
            </DropdownButton>
          </OutsideClickHandler>
        </Dropdown>
        <span>
          <small className="ms-2 text-secondary">
            {paused ? (
              'Paused'
            ) : (
              <span>
                <code className="me-2">{programID}</code>
                {`${uniqueAccounts} account${uniqueAccounts > 1 ? 's' : ''}`}
              </span>
            )}
          </small>
        </span>
      </div>
      <div
        onMouseOver={pause}
        onMouseLeave={unpause}
        onFocus={pause}
        onBlur={unpause}
      >
        {changes.length > 0 ? (
          <table className="table table-sm">
            <tbody>
              {changes
                .slice(0, MAX_PROGRAM_CHANGES_DISPLAYED)
                .map((change: ProgramAccountChange) => {
                  const { pubKey } = change;
                  return (
                    <tr
                      className={`${
                        pubKey in importedAccounts ? 'opacity-25' : ''
                      }`}
                      key={pubKey}
                    >
                      <ProgramChange
                        key={pubKey}
                        attemptAccountAdd={attemptAccountAdd}
                        importedAccounts={importedAccounts}
                        {...change}
                      />
                    </tr>
                  );
                })}
            </tbody>
          </table>
        ) : (
          <div>
            <FontAwesomeIcon className="me-1 fa-spin" icon={faSpinner} />
            <small className="me-2">Scanning for program changes...</small>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProgramChangeView;
