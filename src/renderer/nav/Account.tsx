import Split from 'react-split';
import AccountView from '../components/AccountView';
import LogView from '../components/LogView';
import ProgramChangeView from '../components/ProgramChangeView';
import { selectAccountsListState } from '../data/SelectedAccountsList/selectedAccountsState';
import { useAppSelector } from '../hooks';

function Account() {
  const accounts = useAppSelector(selectAccountsListState);
  const { selectedAccount } = accounts;

  return (
    <Split
      sizes={[75, 25]}
      direction="vertical"
      className="flex-1 min-h-0"
      gutterSize={5}
    >
      <Split
        sizes={[75, 25]}
        direction="horizontal"
        className="flex-1 w-full flex"
        gutterSize={5}
      >
        <ProgramChangeView />
        <div className="overflow-auto">
          <div className="flex-1 p-3">
            <AccountView pubKey={selectedAccount} />
          </div>
        </div>
      </Split>
      <div className="overflow-auto">
        <LogView />
      </div>
    </Split>
  );
}

export default Account;
