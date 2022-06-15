import AccountView from '../components/AccountView';
import LogView from '../components/LogView';
import ProgramChangeView from '../components/ProgramChangeView';
import { selectAccountsListState } from '../data/SelectedAccountsList/selectedAccountsState';
import { useAppSelector } from '../hooks';

function Account() {
  const accounts = useAppSelector(selectAccountsListState);
  const { selectedAccount } = accounts;

  // TODO: the borders should eventually be resizable
  return (
    <>
      <div className="flex-1 flex w-full min-h-0">
        <div className="flex min-h-min w-full">
          <ProgramChangeView />
        </div>
        <div className="w-xs">
          <div className="flex-1 p-3">
            <AccountView pubKey={selectedAccount} />
            <div className="border-top flex-fill">
              transaction or program details
            </div>
          </div>
        </div>
      </div>
      <div className="border-top h-50">
        <LogView />
      </div>
    </>
  );
}

export default Account;
