import React from 'react';
import { Card, Accordion, Container } from 'react-bootstrap';
import * as sol from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useQuery } from 'react-query';
import {
  truncateSolAmount,
  queryTokenAccounts,
} from '../../data/accounts/getAccount';
import { selectValidatorNetworkState } from '../../data/ValidatorNetwork/validatorNetworkState';

import { useAppSelector } from '../../hooks';
import InlinePK from '../InlinePK';
import { MintInfoView } from '../MintInfoView';
import { MetaplexMintMetaDataView } from './MetaplexMintMetaDataView';
import MintTokenToButton from './MintTokenToButton';
import TransferTokenButton from './TransferTokenButton';
import { ActiveAccordionHeader } from './ActiveAccordionHeader';

export function TokensListView(props: { pubKey: string | undefined }) {
  const { pubKey } = props;
  const { net } = useAppSelector(selectValidatorNetworkState);
  // TODO: cleanup - do we really need these here?
  const accountPubKey = pubKey ? new sol.PublicKey(pubKey) : undefined;
  const fromKey = useWallet(); // pay from wallet adapter
  const { connection } = useConnection();

  // TODO: this can't be here before the query
  // TODO: there's a better way in query v4 - https://tkdodo.eu/blog/offline-react-query
  // if (status !== NetStatus.Running) {
  //   return (
  //     <Accordion.Item eventKey={`${pubKey}_info`}>
  //       <Accordion.Header>Validator Offline</Accordion.Header>
  //       <Accordion.Body>
  //         <pre className="exe-hexdump p-2 rounded">Validator Offline</pre>
  //       </Accordion.Body>
  //     </Accordion.Item>
  //   );
  // }

  const {
    status: loadStatus,
    // error,
    data: tokenAccountsData,
  } = useQuery<sol.AccountInfo<sol.ParsedAccountData>, Error>(
    ['parsed-token-account', { net, pubKey }],
    queryTokenAccounts
  );

  if (!pubKey) {
    return <></>;
  }

  const ataEventKey = `${pubKey}_info`;
  // ("idle" or "error" or "loading" or "success").
  if (loadStatus !== 'success') {
    return (
      <Accordion.Item eventKey={ataEventKey}>
        <ActiveAccordionHeader eventKey={ataEventKey} callback={() => {}}>
          Loading tokens list
        </ActiveAccordionHeader>
        <Accordion.Body>
          <pre className="exe-hexdump p-2 rounded">Loading info </pre>
        </Accordion.Body>
      </Accordion.Item>
    );
  }

  const tokenAccounts = tokenAccountsData.value;

  return (
    <Container size="sm">
      {tokenAccounts?.map(
        (tAccount: {
          pubkey: sol.PublicKey;
          account: sol.AccountInfo<sol.ParsedAccountData>;
        }) => {
          // TODO: extract to its own component
          return (
            <Card key={tAccount.pubkey.toString()}>
              <Card.Body>
                <Card.Title />
                <div className="card-text">
                  <Accordion flush>
                    <Accordion.Item eventKey={ataEventKey}>
                      <ActiveAccordionHeader
                        eventKey={ataEventKey}
                        callback={() => {}}
                      >
                        <div>
                          <b>ATA</b>
                          <InlinePK
                            pk={tAccount.pubkey.toString()}
                            formatLength={9}
                          />{' '}
                        </div>
                        <div>
                          holds{' '}
                          {tAccount.account.data.parsed.info.tokenAmount.amount}{' '}
                          tokens (
                          {truncateSolAmount(
                            tAccount.account.lamports / sol.LAMPORTS_PER_SOL
                          )}{' '}
                          SOL)
                          <MintTokenToButton
                            disabled={
                              // TODO: ONLY IF the wallet user has mint-auth (and should mint to this user...)
                              fromKey.publicKey?.toString() !==
                              accountPubKey?.toString()
                            }
                            connection={connection}
                            fromKey={fromKey}
                            mintKey={
                              new sol.PublicKey(
                                tAccount.account.data.parsed.info.mint.toString()
                              )
                            }
                            mintTo={accountPubKey}
                            andThen={(): void => {}}
                          />
                          <TransferTokenButton
                            disabled={
                              // TODO: ONLY IF the wallet user has permission to mutate this ATA's tokens...
                              fromKey.publicKey?.toString() !==
                              accountPubKey?.toString()
                            }
                            connection={connection}
                            fromKey={fromKey}
                            mintKey={tAccount.account.data.parsed.info.mint.toString()}
                            transferFrom={pubKey}
                          />
                        </div>
                      </ActiveAccordionHeader>
                      <Accordion.Body>
                        <pre className="exe-hexdump p-2 rounded">
                          <code>
                            {JSON.stringify(tAccount.account, null, 2)}
                          </code>
                        </pre>
                      </Accordion.Body>
                    </Accordion.Item>
                    <MintInfoView
                      mintKey={tAccount.account.data.parsed.info.mint}
                    />
                    <MetaplexMintMetaDataView
                      mintKey={tAccount.account.data.parsed.info.mint}
                    />
                  </Accordion>
                </div>
              </Card.Body>
            </Card>
          );
        }
      )}
    </Container>
  );
}

export default TokensListView;
