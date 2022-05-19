import { useEffect, useRef, useState } from 'react';
import analytics from '../common/analytics';
import { useAppSelector, useAppDispatch } from '../hooks';
import { accountsActions } from '../data/SelectedAccountsList/selectedAccountsState';
import { selectValidatorNetworkState } from '../data/ValidatorNetwork/validatorNetworkState';
import { AccountInfo } from '../data/accounts/accountInfo';
import { getHumanName } from '../data/accounts/getAccount';
import {
  setAccountValues,
  useAccountMeta,
} from '../data/accounts/accountState';

import Editable from './Editable';

const logger = window.electron.log;

function AccountNameEditable(props: {
  pubKey: string;
  innerProps: {
    placeholder: string;
    outerSelected: boolean | undefined;
    outerHovered: boolean | undefined;
  };
}) {
  const { pubKey, innerProps } = props;
  const { net } = useAppSelector(selectValidatorNetworkState);
  const dispatch = useAppDispatch();
  const accountMeta = useAccountMeta(pubKey);
  const [humanName, setHumanName] = useState<string>('');

  useEffect(() => {
    const alias = getHumanName(accountMeta);
    setHumanName(alias);
    logger.info(`get human name for pubKey ${pubKey} == ${alias}`);
  }, [pubKey, accountMeta]);

  const ref = useRef<HTMLInputElement>({} as HTMLInputElement);
  return (
    <Editable
      ref={ref}
      value={humanName}
      // onClick={() => dispatch(accountsActions.setEdited(pubKey))}
      editingStopped={() => {
        dispatch(accountsActions.setEdited(''));
        dispatch(
          setAccountValues({
            key: pubKey,
            value: {
              ...accountMeta,
              humanname: ref.current.value,
            },
          })
        );
      }}
      // handleOutsideClick={() => {
      //   analytics('updateAccountName', { net, pubKey });
      //   dispatch(
      //     setAccountValues({
      //       key: pubKey,
      //       value: {
      //         accountMeta,
      //         humanname: ref.current.value,
      //       },
      //     })
      //   );
      // }}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...innerProps}
    />
  );
}

export default AccountNameEditable;
