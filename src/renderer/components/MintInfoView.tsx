import { useEffect, useState } from 'react';
import * as sol from '@solana/web3.js';

import Accordion from 'react-bootstrap/esm/Accordion';
import { Button } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAppSelector } from '../hooks';

import {
  getParsedAccount,
  truncateSolAmount,
} from '../data/accounts/getAccount';
import {
  NetStatus,
  selectValidatorNetworkState,
} from '../data/ValidatorNetwork/validatorNetworkState';
import { AccountInfo } from '../data/accounts/accountInfo';

const logger = window.electron.log;

// TODO: need to trigger an update of a component like this automatically when the cetAccount cache notices a change...

export function MintInfoView(props: { mintKey: string }) {
  const { mintKey } = props;
  const { net, status } = useAppSelector(selectValidatorNetworkState);

  // TODO: need to figure out why we're not displaying the parsed data
  const [mintInto, updateMintInfo] =
    useState<sol.AccountInfo<sol.ParsedAccountData> | null>();
  const [mintedTokens, setMintedTokens] = useState<number>(12);

  useEffect(() => {
    if (status !== NetStatus.Running) {
      return;
    }
    try {
      // const solConn = new sol.Connection(netToURL(net));
      // const key = new sol.PublicKey(mintKey);
      // solConn
      //   .getParsedAccountInfo(key)
      getParsedAccount(net, mintKey)
        .then((account) => {
          logger.info('got it', account);
          if (account) {
            updateMintInfo(account);
            setMintedTokens(account.accountInfo.data?.parsed.info.supply);
          }
          return account;
        })
        .catch((err) => {
          logger.error('WHAT', err);
        });
    } catch (e) {
      // moreInfo = JSON.stringify(e);
      logger.error('getParsedAccount what', e);
    }
  }, [mintKey, net, status]);

  logger.info('mintInto:', JSON.stringify(mintInto));

  if (!mintInto || mintInto?.data) {
    return (
      <Accordion.Item eventKey={`${mintKey}_info`}>
        <Accordion.Header>Loading info</Accordion.Header>
        <Accordion.Body>
          <pre className="exe-hexdump p-2 rounded">Loading info </pre>
        </Accordion.Body>
      </Accordion.Item>
    );
  }

  return (
    <Accordion.Item eventKey={`${mintKey}_info`}>
      <Accordion.Header>
        Mint holds{' '}
        {mintedTokens /* mintInto?.accountInfo.data?.parsed.info.supply */}{' '}
        tokens (
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
