import { faFilter, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useRef, useState } from 'react';
import { Dropdown, DropdownButton, Button } from 'react-bootstrap';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import Table from 'react-bootstrap/Table';
import { toast } from 'react-toastify';
import Popover from 'react-bootstrap/Popover';

import OutsideClickHandler from 'react-outside-click-handler';

import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import { Keypair, SystemProgram } from '@solana/web3.js';
import {
  setSelected,
  accountsActions,
  selectAccountsListState,
} from 'renderer/data/SelectedAccountsList/selectedAccountsState';
import { useAppSelector, useAppDispatch } from '../hooks';
import {
  selectValidatorNetworkState,
  NetStatus,
} from '../data/ValidatorNetwork/validatorNetworkState';
import { BASE58_PUBKEY_REGEX } from '../data/accounts/getAccount';
import { AccountInfo } from '../data/accounts/accountInfo';

import Editable from './Editable';
import { ProgramChange } from './ProgramChange';
import {
  unsubscribeProgramChanges,
  subscribeProgramChanges,
} from '../data/accounts/programChanges';
import createNewAccount from '../data/accounts/account';
import WatchAccountButton from './WatchAccountButton';

export const MAX_PROGRAM_CHANGES_DISPLAYED = 20;
export enum KnownProgramID {
  SerumDEXV3 = '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',
  TokenProgram = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
}

interface PinnedAccountMap {
  [pubKey: string]: boolean;
}

function ProgramChangeView() {
  const dispatch = useAppDispatch();
  const { net, status } = useAppSelector(selectValidatorNetworkState);

  // TODO: I suspect It would be nicer to use a function need to try it..
  const selectAccounts = useAppSelector(selectAccountsListState);
  const { pinnedAccounts } = selectAccounts;

  const pinAccount = (pubKey: string, pinned: boolean) => {
    if (!pinned) {
      dispatch(accountsActions.unshift(pubKey));
    } else {
      dispatch(accountsActions.rm(pubKey));
    }
  };

  const [changes, setChangesState] = useState<AccountInfo[]>([]);
  const pinnedAccount: PinnedAccountMap = {};

  pinnedAccounts.forEach((key: string) => {
    pinnedAccount[key] = true;
  });

  changes.sort((a): number => {
    if (pinnedAccount[a.pubKey]) {
      return -1;
    }
    return 0;
  });

  const uniqueAccounts = changes.length;
  const [filterDropdownShow, setFilterDropdownShow] = useState(false);
  const filterProgramIDRef = useRef<HTMLInputElement>({} as HTMLInputElement);

  const [programID, setProgramID] = useState(
    SystemProgram.programId.toString()
  );
  const [anchorEl, setAnchorEl] = useState<Keypair | undefined>(undefined);

  useEffect(() => {
    if (status !== NetStatus.Running) {
      return () => {};
    }
    subscribeProgramChanges(net, programID, setChangesState);

    return () => {
      unsubscribeProgramChanges(net, programID);
    };
  }, [net, programID, status]);

  if (status !== NetStatus.Running) {
    return <div>network not available</div>;
  }

  const changeFilterDropdownTitle = (
    <>
      <FontAwesomeIcon className="me-1" icon={faFilter} />
      <span>Filter</span>
    </>
  );

  return (
    <div>
      <div className="mb-2">
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
          <ButtonGroup size="sm" className="me-2" aria-label="First group">
            <OverlayTrigger
              // trigger="click"
              placement="right"
              show={anchorEl !== undefined}
              overlay={
                <Popover className="mb-6" id="popover-basic">
                  <Popover.Header as="h3">
                    New Account
                    <Button
                      onClick={() => {
                        setAnchorEl(undefined);
                      }}
                    >
                      X
                    </Button>
                  </Popover.Header>
                  <Popover.Body>
                    <div>New Account Keypair created.</div>
                    <div>
                      Public Key:{' '}
                      <pre>
                        <code>{anchorEl?.publicKey.toString()}</code>
                      </pre>
                    </div>
                    <div>
                      Private Key: (keep this in a <code>.json</code> file
                      somewhere safe)
                    </div>
                    <textarea
                      className="vscroll almost-vh-100 w-100"
                      readOnly
                      value={`[${anchorEl?.secretKey.toString()}]`}
                    />
                    <b>
                      NOTE: This account does not exist on chain until you
                      Airdrop or transfer SOL to it.
                    </b>
                  </Popover.Body>
                </Popover>
              }
            >
              <Button
                onClick={() => {
                  const newAccount = createNewAccount();
                  pinAccount(newAccount.publicKey.toString(), false);
                  dispatch(setSelected(newAccount.publicKey.toString()));
                  // or do we save it to the backend? and defer getting it back to 0.4.0..
                  setAnchorEl(newAccount);
                }}
              >
                Create Account
              </Button>
            </OverlayTrigger>

            <WatchAccountButton pinAccount={pinAccount} />
          </ButtonGroup>
        </ButtonToolbar>
        <span>
          <small className="ms-2 text-secondary">
            <span>
              Program:
              <code className="me-2">{programID}</code>
              {`${uniqueAccounts} account${uniqueAccounts > 1 ? 's' : ''}`}
            </span>
          </small>
        </span>
      </div>
      <div>
        {pinnedAccounts.length > 0 && (
          <div>
            <h5>Pinned Accounts</h5>
            <Table hover size="sm">
              <tbody>
                {pinnedAccounts.map((pubKey: string) => {
                  return (
                    <ProgramChange
                      change={undefined}
                      selected={pubKey === selectAccounts.selectedAccount}
                      key={pubKey}
                      net={net}
                      pubKey={pubKey}
                      pinned
                      pinAccount={pinAccount}
                    />
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
        {changes.length > 0 ? (
          <div>
            <h5>Account Changes</h5>
            <Table hover size="sm">
              <tbody>
                {changes
                  .slice(0, MAX_PROGRAM_CHANGES_DISPLAYED)
                  .filter((change: AccountInfo) => {
                    return !(change.pubKey in pinnedAccount);
                  })
                  .map((change: AccountInfo) => {
                    const { pubKey } = change;
                    return (
                      <ProgramChange
                        change={change}
                        selected={pubKey === selectAccounts.selectedAccount}
                        key={pubKey}
                        net={net}
                        pubKey={pubKey}
                        pinned={false}
                        pinAccount={pinAccount}
                      />
                    );
                  })}
              </tbody>
            </Table>
          </div>
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
