import { Col, Row } from 'react-bootstrap';

import Split from 'react-split';
import AccountView from '../components/AccountView';
import ProgramChangeView from '../components/ProgramChangeView';
import LogView from '../components/LogView';
import { useAppSelector } from '../hooks';
import { selectAccountsListState } from '../data/SelectedAccountsList/selectedAccountsState';

function Account() {
  const accounts = useAppSelector(selectAccountsListState);
  const { selectedAccount } = accounts;

  return (
    <Split
      className="almost-vh-100 v-stack"
      direction="vertical"
      sizes={[80, 20]}
    >
      <Split className="d-flex almost-vh-80 row" sizes={[50, 48]}>
        <Col className="col-md-6 almost-vh-100 vscroll">
          <ProgramChangeView />
        </Col>
        <Col className="border-left col-md-6 almost-vh-100 vscroll">
          <Split
            className="almost-vh-100 v-stack vstack"
            direction="vertical"
            sizes={[80, 20]}
          >
            <Row className="flex-fill">
              <AccountView pubKey={selectedAccount} />
            </Row>
            <Row className="border-top flex-fill bg-light">
              transaction or program details
            </Row>
          </Split>
        </Col>
      </Split>
      <Row className="border-top almost-vh-20">
        <LogView />
      </Row>
    </Split>
  );
}

export default Account;
