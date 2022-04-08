import { useState, FC, useCallback } from 'react';

import Stack from 'react-bootstrap/Stack';
import { Button, Col, Row } from 'react-bootstrap';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';

import { toast } from 'react-toastify';

// import { Button } from '@mui/material';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, TransactionSignature } from '@solana/web3.js';
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

function notify(type: string, message: string, signature: string | undefined) {
  // eslint-disable-next-line no-console
  console.log(`${type}: ${message} (${signature})`);
}

// TODO: Only added because there's no way to AccountView an account that has no stake (ie, is not on the chain)
//       Once we have "watch account" able to list zero balance accounts, and are able to select them, we can delete this...
export const RequestAirdrop: FC = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const onClick = useCallback(async () => {
    if (!publicKey) {
      notify('error', 'Wallet not connected!', undefined);
      return;
    }

    let signature: TransactionSignature = '';
    try {
      signature = await connection.requestAirdrop(publicKey, LAMPORTS_PER_SOL);
      notify('info', 'Airdrop requested:', signature);

      await connection.confirmTransaction(signature, 'processed');
      notify('success', 'Airdrop successful!', signature);
    } catch (error) {
      notify('error', `Airdrop failed! ${error?.message}`, signature);
    }
  }, [publicKey, connection]);

  return (
    <Button
      variant="contained"
      color="secondary"
      onClick={onClick}
      disabled={!publicKey}
    >
      Request Airdrop
    </Button>
  );
};

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
            Watch account
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
          <RequestAirdrop />
        </ButtonGroup>
      </ButtonToolbar>

      <Row className="flex-fill">
        <Col className="border">
          <ProgramChangeView attemptAccountAdd={attemptAccountAdd} />
        </Col>
        <Col className="border">
          <Stack className=" almost-vh-100">
            <Row className="border flex-fill">
              <AccountView pubKey={selectedAccountInfo} />
            </Row>
            <Row className="border flex-fill">
              transaction or program details
            </Row>
          </Stack>
        </Col>
      </Row>
      <Row className="border almost-vh-20">
        ? console like thing - maybe this is where we emulate the solana/anchor
        cli?
        <LogView />
      </Row>
    </Stack>
  );
}

export default Account;
