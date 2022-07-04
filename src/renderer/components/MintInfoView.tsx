import { useEffect, useState } from 'react';
import * as sol from '@solana/web3.js';

import Accordion from 'react-bootstrap/esm/Accordion';
import { Button } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAppSelector } from '../hooks';

import { getAccount, truncateSolAmount } from '../data/accounts/getAccount';
import {
  NetStatus,
  selectValidatorNetworkState,
} from '../data/ValidatorNetwork/validatorNetworkState';

const logger = window.electron.log;

// TODO: need to trigger an update of a component like this automatically when the cetAccount cache notices a change...

export function MintInfoView(props: { mintKey: string }) {
  const { mintKey } = props;
  const { net, status } = useAppSelector(selectValidatorNetworkState);

  const [mintInto, updateMintInfo] = useState<sol.AccountInfo<
    Buffer | sol.ParsedAccountData
  > | null>();

  useEffect(() => {
    if (status !== NetStatus.Running) {
      return;
    }
    try {
      // const solConn = new sol.Connection(netToURL(net));
      // const key = new sol.PublicKey(mintKey);
      // solConn
      //   .getParsedAccountInfo(key)
      getAccount(net, mintKey)
        .then((account) => {
          logger.info('got it', account);
          if (account) {
            updateMintInfo(account);
          }
          return account;
        })
        .catch((err) => {
          logger.error('WHAT', err);
        });
    } catch (e) {
      // moreInfo = JSON.stringify(e);
      logger.error('getAccount what', e);
    }
  }, [mintKey, net, status]);

  return (
    <Accordion.Item eventKey={`${mintKey}_info`}>
      <Accordion.Header>
        Mint holds {mintInto?.accountInfo.data.parsed.info.supply} tokens (
        {truncateSolAmount(
          mintInto?.accountInfo.lamports / sol.LAMPORTS_PER_SOL
        )}{' '}
        SOL)
        <Button
          size="sm"
          disabled={mintKey === undefined}
          onClick={() => {
            toast.promise(closeMint(), {
              pending: `Close mint account submitted`,
              success: `Close mint account  succeeded 👌`,
              error: `Close mint account   failed 🤯`,
            });
          }}
        >
          Close mint
        </Button>
      </Accordion.Header>
      <Accordion.Body>
        <pre className="exe-hexdump p-2 rounded">
          <code>Mint info: {JSON.stringify(mintInto, null, 2)}</code>
        </pre>
      </Accordion.Body>
    </Accordion.Item>
  );
}

export default MintInfoView;
