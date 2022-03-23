import { useSelector } from 'react-redux';

import { RootState } from '../slices/mainSlice';
import { AccountsState, ACCOUNTS_NONE_KEY, WBAccount } from '../../types/types';
import AccountListItem from './AccountListItem';

const AccountListView = (props: {
  attemptAccountAdd: (pk: string, b: boolean) => void;
}) => {
  const { attemptAccountAdd } = props;
  const accounts: AccountsState = useSelector(
    (state: RootState) => state.accounts
  );
  const { listedAccounts } = accounts;
  return (
    <>
      {listedAccounts.map((account: WBAccount) => {
        const initializing = account.pubKey === ACCOUNTS_NONE_KEY;
        return (
          <AccountListItem
            account={account}
            initializing={initializing}
            key={`pubKey=${account.pubKey},initializing=${initializing}`}
            attemptAccountAdd={attemptAccountAdd}
          />
        );
      })}
    </>
  );
};

export default AccountListView;
