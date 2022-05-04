import Stack from 'react-bootstrap/Stack';
import { Button, Col, Row } from 'react-bootstrap';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';

import { toast } from 'react-toastify';

import AccountView from '../components/AccountView';
import ProgramChangeView from '../components/ProgramChangeView';
import LogView from '../components/LogView';
import { useAppSelector } from '../hooks';
import { selectValidatorNetworkState } from '../data/ValidatorNetwork/validatorNetworkState';
import { selectAccountsListState } from '../data/SelectedAccountsList/selectedAccountsState';
import createNewAccount from '../data/accounts/account';

function Account() {
  const validator = useAppSelector(selectValidatorNetworkState);
  const { net } = validator;
  const accounts = useAppSelector(selectAccountsListState);
  const { selectedAccount } = accounts;

  // TODO: the borders should eventually be resizable
  return (
    <Stack className="almost-vh-100">
      <Row className="flex-fill almost-vh-80">
        <Col className="col-md-6 almost-vh-100 vscroll">
          <ButtonToolbar aria-label="Toolbar with button groups">
            <ButtonGroup size="sm" className="me-2" aria-label="First group">
              <div className="mb-2">
                <strong>Program Account Changes</strong>
              </div>
            </ButtonGroup>
            <ButtonGroup size="sm" className="me-2" aria-label="First group">
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
          <ProgramChangeView />
        </Col>
        <Col className="border-left col-md-6 almost-vh-100 vscroll">
          <Stack className="almost-vh-100">
            <Row className="flex-fill">
              <AccountView pubKey={selectedAccount} />
            </Row>
            <Row className="border-top flex-fill">
              transaction or program details
            </Row>
          </Stack>
        </Col>
      </Row>
      <Row className="border-top almost-vh-20">
        <LogView />
      </Row>
    </Stack>
  );
}

export default Account;
