import { useRef } from 'react';
import analytics from '../common/analytics';
import { useAppSelector, useAppDispatch } from '../hooks';
import { accountsActions } from '../data/SelectedAccountsList/selectedAccountsState';
import { selectValidatorNetworkState } from '../data/ValidatorNetwork/validatorNetworkState';

import { AccountInfo } from '../data/accounts/accountInfo';
import { getHumanName } from '../data/accounts/getAccount';

import Editable from './Editable';

function AccountNameEditable(props: {
  account: AccountInfo;
  innerProps: {
    placeholder: string;
    outerSelected: boolean | undefined;
    outerHovered: boolean | undefined;
  };
}) {
  const { account, innerProps } = props;
  const { net } = useAppSelector(selectValidatorNetworkState);
  const dispatch = useAppDispatch();
  const { pubKey } = account;
  const humanName = getHumanName(account);
  const ref = useRef<HTMLInputElement>({} as HTMLInputElement);
  return (
    <Editable
      ref={ref}
      value={humanName || ''}
      onClick={() => dispatch(accountsActions.setEdited(pubKey))}
      editingStopped={() => dispatch(accountsActions.setEdited(''))}
      handleOutsideClick={() => {
        analytics('updateAccountName', { net, pubKey });
        // updateAccountName({
        //     net,
        //     pubKey,
        //     humanName: ref.current.value,
        // })
      }}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...innerProps}
    />
  );
}

export default AccountNameEditable;
