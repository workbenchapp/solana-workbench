import { useState } from 'react';

import Stack from 'react-bootstrap/Stack';
import { Button, Col, Row } from 'react-bootstrap';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';

import { toast } from 'react-toastify';

import AccountView from '../components/AccountView';
import ProgramChangeView from '../components/ProgramChangeView';
import LogView from '../components/LogView';
import { useAppSelector, useAppDispatch } from '../hooks';
import { selectValidatorNetworkState } from '../data/ValidatorNetwork/validatorNetworkState';
import {
  accountsActions,
  selectAccountsListState,
} from '../data/SelectedAccountsList/selectedAccountsState';
import { getAccount } from '../data/accounts/getAccount';
import createNewAccount from '../data/accounts/account';

function Account() {
  const dispatch = useAppDispatch();
  const validator = useAppSelector(selectValidatorNetworkState);
  const { net } = validator;
  const accounts = useAppSelector(selectAccountsListState);
  const { selectedAccount } = accounts;
  const [selectedAccountInfo, setSelectedAccountInfo] = useState<
    string | undefined
  >(selectedAccount);

  const attemptAccountAdd = (pubKey: string) => {
    dispatch(accountsActions.setSelected(pubKey));
    getAccount(net, pubKey)
      .then((res) => {
        // eslint-disable-next-line promise/always-return
        if (res) {
          // only add the account if it exists
          setSelectedAccountInfo(pubKey);
        }
      })
      /* eslint-disable no-console */
      .catch(console.log);
  };

  // TODO: the borders should eventually be resizable
  return (
    <Stack className="almost-vh-100">
      <ButtonToolbar aria-label="Toolbar with button groups">
        <ButtonGroup size="sm" className="me-2" aria-label="First group">
          <Button size="sm" disabled>
            Connect to Wallet
            {/* ala solana-keygen recover 'prompt://?key=0/0' -o file.json */}
          </Button>
          <Button size="sm" disabled>
            Import account
            {/** can be just a public key, or both? */}
          </Button>
          <Button
            onClick={() => {
              toast.promise(createNewAccount(net), {
                pending: 'Account being created',
                success: 'Account created 👌',
                error: 'Account creation failed 🤯',
              });
            }}
          >
            Create Account
          </Button>
        </ButtonGroup>
      </ButtonToolbar>

      <Row className="flex-fill">
        <Col className="add-border">
          <ProgramChangeView attemptAccountAdd={attemptAccountAdd} />
        </Col>
        <Col className="add-border">
          <Stack className=" almost-vh-100">
            <Row className="add-border flex-fill">
              <AccountView pubKey={selectedAccountInfo} />
            </Row>
            <Row className="add-border flex-fill">
              transaction or program details
            </Row>
          </Stack>
        </Col>
      </Row>
      <Row className="add-border almost-vh-20">
        ? console like thing - maybe this is where we emulate the solana/anchor
        cli?
        <LogView />
      </Row>
    </Stack>
  );
}

export default Account;
