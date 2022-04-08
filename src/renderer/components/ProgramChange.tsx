import { useEffect, useState, useCallback } from 'react';
import * as sol from '@solana/web3.js';

import { faStar } from '@fortawesome/free-solid-svg-icons';
import * as faRegular from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Container from 'react-bootstrap/Container';
import { useInterval } from '../hooks';

import InlinePK from './InlinePK';

import { AccountInfo } from '../data/accounts/accountInfo';
import { getAccount, truncateLamportAmount } from '../data/accounts/getAccount';
import { Net } from '../data/ValidatorNetwork/validatorNetworkState';

export function ProgramChange(props: {
  net: Net;
  pubKey: string;
  attemptAccountAdd: (pk: string, b: boolean) => void;
  pinned: boolean;
  pinAccount: (pk: string, b: boolean) => void;
}) {
  const { pubKey, net, attemptAccountAdd, pinned, pinAccount } = props;

  const [change, setChangeInfo] = useState<AccountInfo | undefined>(undefined);

  const updateAccount = useCallback(() => {
    let ok = false;
    if (pubKey) {
      getAccount(net, pubKey)
        .then((res) => {
          // eslint-disable-next-line promise/always-return
          if (res) {
            setChangeInfo(res);
            ok = true;
          }
        })
        /* eslint-disable no-console */
        .catch(console.log);
    }
    if (!ok) {
      const offChainAccount: AccountInfo = {
        net,
        pubKey,
        accountId: new sol.PublicKey(pubKey),
        accountInfo: sol.AccountInfo < Buffer > {},
        solDelta: 0,
        count: 0,
        maxDelta: 0,
        programID: '',
      };
      setChangeInfo(offChainAccount);
    }
  }, [net, pubKey]);

  useEffect(() => {
    updateAccount();
  }, [net, pubKey, updateAccount]);

  useInterval(() => {
    updateAccount();
  }, 666);

  if (!change) {
    return <Container key={pubKey}>Loading change for {pubKey}...</Container>;
  }

  const formatSolAmount = (amt: number): string => {
    if (Math.abs(amt) < 0.01) {
      return '<0.01';
    }
    return Math.abs(amt).toFixed(2);
  };
  return (
    <Container onClick={() => attemptAccountAdd(pubKey, false)}>
      <td onClick={() => pinAccount(pubKey, pinned)}>
        <span className="icon icon-interactive">
          <FontAwesomeIcon icon={pinned ? faStar : faRegular.faStar} />
        </span>
      </td>

      <td>
        <InlinePK pk={pubKey} />
      </td>
      <td>
        <span className="ms-2 rounded p-1">
          <small className="text-secondary">Max Δ</small>
          <small className="ms-2">{formatSolAmount(change.maxDelta)}</small>
        </span>
      </td>
      <td>
        <span className="ms-2 rounded p-1">
          <small className="text-secondary">SOL</small>
          <small className="ms-2">{truncateLamportAmount(change)}</small>
        </span>
      </td>
      <td>
        <span className="ms-2 badge bg-secondary rounded-pill">
          {change.count}
        </span>
      </td>
    </Container>
  );
}

export default ProgramChange;
