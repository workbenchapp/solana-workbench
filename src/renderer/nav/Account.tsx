import Stack from 'react-bootstrap/Stack';
import { Col, Row } from 'react-bootstrap';

import AccountView from '../components/AccountView';
import ProgramChangeView from '../components/ProgramChangeView';
import LogView from '../components/LogView';
import { useAppSelector } from '../hooks';
import { selectAccountsListState } from '../data/SelectedAccountsList/selectedAccountsState';

function Account() {
  const accounts = useAppSelector(selectAccountsListState);
  const { selectedAccount } = accounts;

  // TODO: the borders should eventually be resizable
  return (
    <Stack className="almost-vh-100">
      <Row className="flex-fill almost-vh-80">
        <Col className="col-md-6 almost-vh-100 vscroll">
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
