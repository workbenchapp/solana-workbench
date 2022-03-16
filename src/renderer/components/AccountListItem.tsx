/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import { faEllipsisH, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import analytics from 'common/analytics';
import React, { useRef } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { accountsActions, RootState } from 'renderer/slices/mainSlice';
import { ACCOUNTS_NONE_KEY, WBAccount } from 'types/types';
import AccountNameEditable from './AccountNameEditable';
import Editable from './Editable';
import InlinePK from './InlinePK';
import RandomArt from './RandomArt';

const AccountListItem = (props: {
  initializing: boolean;
  account: WBAccount;
  attemptAccountAdd: (pk: string, b: boolean) => void;
}) => {
  const { initializing, account, attemptAccountAdd } = props;
  const dispatch = useDispatch();
  const { selectedAccount, hoveredAccount, editedAccount } = useSelector(
    (state: RootState) => state.accounts
  );
  const { net } = useSelector((state: RootState) => state.validator);
  const { exists, pubKey } = account;
  const selected = selectedAccount === pubKey;
  const hovered = hoveredAccount === pubKey;
  const edited = editedAccount === pubKey;
  const addAcctRef = useRef<HTMLInputElement>({} as HTMLInputElement);

  type EllipsisToggleProps = {
    children?: React.ReactNode;
    onClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  };

  const EllipsisToggle = React.forwardRef<HTMLDivElement>(
    (toggleProps: EllipsisToggleProps, ref) => {
      const { onClick, children } = toggleProps;
      return (
        <div
          ref={ref}
          onClick={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
            e.preventDefault();
            e.stopPropagation();
            if (onClick) onClick(e);
          }}
        >
          <div className="ps-2 pe-2 icon rounded">{children}</div>
        </div>
      );
    }
  );

  type EllipsisMenuProps = {
    children?: React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
    labeledBy?: string;
  };

  const EllipsisMenu = React.forwardRef<HTMLDivElement>(
    (toggleProps: EllipsisMenuProps, ref) => {
      const { children, style, className } = toggleProps;
      return (
        <div style={style} className={className} ref={ref}>
          {children}
        </div>
      );
    }
  );

  return (
    <div
      onClick={() => {
        analytics('selectAccount', { net });
        dispatch(accountsActions.setSelected(account.pubKey));
      }}
      className={`p-1 account-list-item ${
        !initializing && !exists && 'opacity-25'
      } ${
        selected
          ? 'account-list-item-selected border-top border-bottom border-primary'
          : 'border-top border-bottom'
      } ${hovered && !selected && 'bg-xlight'} ${
        edited && 'border-top border-bottom border-primary'
      }`}
      key={account.pubKey}
      onMouseEnter={() => dispatch(accountsActions.setHovered(account.pubKey))}
      onMouseLeave={() => dispatch(accountsActions.setHovered(''))}
    >
      <div className="row flex-nowrap">
        <div className="col">
          {account.pubKey === ACCOUNTS_NONE_KEY ? (
            <Editable
              ref={addAcctRef}
              value={account.pubKey}
              effect={() => {
                dispatch(accountsActions.setEdited(account.pubKey));
                addAcctRef.current.focus();
              }}
              editingStopped={() => dispatch(accountsActions.setEdited(''))}
              inputClassName={`input-clean-code ${
                initializing && 'input-no-max'
              }`}
              handleOutsideClick={() => {
                let pk = addAcctRef.current.value;
                if (pk === '') {
                  pk = ACCOUNTS_NONE_KEY;
                }
                attemptAccountAdd(pk, initializing);
              }}
              clearAllOnSelect={initializing}
              placeholder="Paste in an account ID"
            />
          ) : (
            <span>
              <RandomArt className="float-start me-1" art={account.art || ''} />
              <InlinePK pk={account.pubKey} />
            </span>
          )}
        </div>
        {!initializing && (
          <>
            <div className="col-auto">
              <small>
                <AccountNameEditable
                  account={account}
                  innerProps={{
                    placeholder: 'Write a description',
                    outerSelected: selected,
                    outerHovered: hovered,
                  }}
                />
              </small>
            </div>
            <div className="col-auto">
              <Dropdown>
                <Dropdown.Toggle as={EllipsisToggle}>
                  <FontAwesomeIcon size="sm" icon={faEllipsisH} />
                </Dropdown.Toggle>
                <Dropdown.Menu as={EllipsisMenu}>
                  <Dropdown.Item
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.electron.ipcRenderer.deleteAccount({
                        pubKey: account.pubKey,
                      });
                      dispatch(accountsActions.rm(account.pubKey));
                    }}
                  >
                    <small className="text-danger">
                      <FontAwesomeIcon
                        className="text-danger me-1"
                        icon={faTrash}
                      />
                      Delete
                    </small>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AccountListItem;
