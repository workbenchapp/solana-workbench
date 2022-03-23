import { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { accountsActions, RootState } from '../slices/mainSlice';
import analytics from '../../common/analytics';
import { WBAccount } from '../../types/types';
import Editable from './Editable';

const AccountNameEditable = (props: {
  account: WBAccount;
  innerProps: {
    placeholder: string;
    outerSelected: boolean | undefined;
    outerHovered: boolean | undefined;
  };
}) => {
  const { account, innerProps } = props;
  const { net } = useSelector((state: RootState) => state.validator);
  const dispatch = useDispatch();
  const { pubKey, humanName } = account;
  const ref = useRef<HTMLInputElement>({} as HTMLInputElement);
  return (
    <Editable
      ref={ref}
      value={humanName || ''}
      onClick={() => dispatch(accountsActions.setEdited(pubKey))}
      editingStopped={() => dispatch(accountsActions.setEdited(''))}
      handleOutsideClick={() => {
        analytics('updateAccountName', {});
        window.electron.ipcRenderer.updateAccountName({
          net,
          pubKey,
          humanName: ref.current.value,
        });
      }}
      {...innerProps}
    />
  );
};

export default AccountNameEditable;
