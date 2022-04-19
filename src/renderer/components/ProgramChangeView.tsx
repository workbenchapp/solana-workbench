import { faFilter, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useRef, useState } from 'react';
import { Dropdown, DropdownButton, Button } from 'react-bootstrap';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import Table from 'react-bootstrap/Table';
import { toast } from 'react-toastify';

import OutsideClickHandler from 'react-outside-click-handler';

import { useAppSelector, useAppDispatch } from '../hooks';
import { selectValidatorNetworkState } from '../data/ValidatorNetwork/validatorNetworkState';
import { BASE58_PUBKEY_REGEX, getAccount } from '../data/accounts/getAccount';
import { AccountInfo } from '../data/accounts/accountInfo';

import Editable from './Editable';
import { ProgramChange } from './ProgramChange';
import {
  unsubscribeProgramChanges,
  subscribeProgramChanges,
} from '../data/accounts/programChanges';
import {
  accountsActions,
  selectAccountsListState,
} from '../data/SelectedAccountsList/selectedAccountsState';

export const MAX_PROGRAM_CHANGES_DISPLAYED = 20;
export enum KnownProgramID {
  SystemProgram = '11111111111111111111111111111111',
  SerumDEXV3 = '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',
  TokenProgram = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
}

interface PinnedAccountMap {
  [pubKey: string]: boolean;
}

function ProgramChangeView(props: {
  attemptAccountAdd: (pubKey: string, initializing: boolean) => void;
}) {
  const dispatch = useAppDispatch();
  const { attemptAccountAdd } = props;
  const { net } = useAppSelector(selectValidatorNetworkState);

  // TODO: I suspect It would be nicer to use a function need to try it..
  const selectAccounts = useAppSelector(selectAccountsListState);
  const { pinnedAccounts } = selectAccounts;

  const pinAccount = (pubKey: string, pinned: boolean) => {
    if (!pinned) {
      getAccount(net, pubKey)
        .then((res) => {
          // eslint-disable-next-line promise/always-return
          if (res) {
            dispatch(accountsActions.unshift(res));
          }
        })
        /* eslint-disable no-console */
        .catch(console.log);
    } else {
      dispatch(accountsActions.rm(pubKey));
    }
  };

  const [changes, setChangesState] = useState<AccountInfo[]>([]);

  const displayList: string[] = []; // list of Keys
  const pinnedAccount: PinnedAccountMap = {};

  pinnedAccounts.forEach((key: string) => {
    displayList.push(key);
    pinnedAccount[key] = true;
  });
  changes.forEach((c: AccountInfo) => {
    if (!(c.pubKey in pinnedAccount)) {
      displayList.push(c.pubKey);
    }
  });

  const uniqueAccounts = displayList.length;
  const [filterDropdownShow, setFilterDropdownShow] = useState(false);
  const filterProgramIDRef = useRef<HTMLInputElement>({} as HTMLInputElement);

  const [programID, setProgramID] = useState(KnownProgramID.SystemProgram);

  useEffect(() => {
    subscribeProgramChanges(net, programID, setChangesState);

    return () => {
      unsubscribeProgramChanges(net, programID);
    };
  }, [net, programID]);

  const changeFilterDropdownTitle = (
    <>
      <FontAwesomeIcon className="me-1" icon={faFilter} />
      <span>Filter</span>
    </>
  );

  return (
    <div>
      <div className="mb-2">
        <div className="mb-2">
          <small>
            <strong>Program Account Changes</strong>
          </small>
        </div>
        <ButtonToolbar aria-label="Toolbar with button groups">
          <ButtonGroup size="sm" className="me-2" aria-label="First group">
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
                    if (s) setProgramID(s as KnownProgramID);
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
                  <Dropdown.Item eventKey={KnownProgramID.TokenProgram}>
                    <small>Token Program</small>
                  </Dropdown.Item>
                  <Dropdown.Item eventKey={KnownProgramID.SerumDEXV3}>
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
                          toast.warn('Must paste in valid program ID');
                          filterProgramIDRef.current.value = 'Custom';
                          filterProgramIDRef.current.blur();
                          setFilterDropdownShow(false);
                        }
                      }}
                      onPaste={(e) => {
                        const pastedID = e.clipboardData.getData('Text');
                        if (pastedID.match(BASE58_PUBKEY_REGEX)) {
                          unsubscribeProgramChanges(net, programID);
                          subscribeProgramChanges(
                            net,
                            programID,
                            setChangesState
                          );
                          setProgramID(pastedID);
                        } else {
                          toast.warn(`Invalid program ID: ${pastedID}`);
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
          </ButtonGroup>
        </ButtonToolbar>
        <span>
          <small className="ms-2 text-secondary">
            <span>
              <code className="me-2">{programID}</code>
              {`${uniqueAccounts} account${uniqueAccounts > 1 ? 's' : ''}`}
            </span>
          </small>
        </span>
      </div>
      <div>
        {displayList.length > 0 ? (
          <Table striped hover size="sm">
            <tbody>
              {displayList
                .slice(0, MAX_PROGRAM_CHANGES_DISPLAYED)
                .map((pubKey: string) => {
                  return (
                    <tr key={pubKey}>
                      <ProgramChange
                        key={pubKey}
                        pubKey={pubKey}
                        net={net}
                        pinned={pinnedAccount[pubKey]}
                        pinAccount={pinAccount}
                        attemptAccountAdd={attemptAccountAdd}
                      />
                    </tr>
                  );
                })}
            </tbody>
          </Table>
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
