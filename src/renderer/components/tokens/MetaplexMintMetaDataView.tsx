import React, { useContext } from 'react';
import * as sol from '@solana/web3.js';
import * as metaplex from '@metaplex/js';

import Accordion from 'react-bootstrap/esm/Accordion';
import { useWallet } from '@solana/wallet-adapter-react';
import { useQuery } from 'react-query';
import { AccordionContext, Card, useAccordionButton } from 'react-bootstrap';
import { useAppSelector } from '../../hooks';

import { queryTokenMetadata } from '../../data/accounts/getAccount';
import { selectValidatorNetworkState } from '../../data/ValidatorNetwork/validatorNetworkState';
import MetaplexTokenDataButton from './MetaplexTokenData';

import InlinePK from '../InlinePK';
import { logger } from '../../common/globals';

function ContextAwareToggle({ children, eventKey, callback }) {
  const { activeEventKey } = useContext(AccordionContext);

  const decoratedOnClick = useAccordionButton(
    eventKey,
    () => callback && callback(eventKey)
  );

  const isCurrentEventKey = activeEventKey === eventKey;

  return (
    <button
      type="button"
      style={{ backgroundColor: isCurrentEventKey ? 'pink' : 'lavender' }}
      onClick={decoratedOnClick}
    >
      {children}
    </button>
  );
}

export function MetaplexMintMetaDataView(props: { mintKey: string }) {
  const { mintKey } = props;
  const fromKey = useWallet();
  const { net } = useAppSelector(selectValidatorNetworkState);

  // TODO: this can't be here before the query
  // TODO: there's a better way in query v4 - https://tkdodo.eu/blog/offline-react-query
  // if (status !== NetStatus.Running) {
  //   return (
  //     <Accordion.Item eventKey={`${mintKey}_info`}>
  //       <Accordion.Header>
  //         Validator Offline{' '}
  //         <MetaplexTokenDataButton
  //           mintPubKey={mintKey ? new sol.PublicKey(mintKey) : undefined}
  //           disabled
  //         />
  //       </Accordion.Header>
  //       <Accordion.Body>
  //         <pre className="exe-hexdump p-2 rounded">Validator Offline</pre>
  //       </Accordion.Body>
  //     </Accordion.Item>
  //   );
  // }

  const pubKey = mintKey.toString();
  const {
    status: loadStatus,
    // error,
    data: metaInfo,
  } = useQuery<metaplex.programs.metadata.Metadata | undefined, Error>(
    ['token-mint-meta', { net, pubKey }],
    // TODO: need to be able to say "we errored, don't keep looking" - there doesn't need to be metadata...
    queryTokenMetadata,
    {}
  );

  if (!mintKey) {
    return (
      <Accordion.Item eventKey={`${pubKey}_info`}>
        <Accordion.Header>No Mint selected</Accordion.Header>
        <Accordion.Body>
          <pre className="exe-hexdump p-2 rounded">No DATA</pre>
        </Accordion.Body>
      </Accordion.Item>
    );
  }
  const mintPubKey = new sol.PublicKey(mintKey);
  try {
    logger.info(mintKey.toString());
  } catch (e) {
    logger.error(`WTF ${e}`);
  }

  // ("idle" or "error" or "loading" or "success").
  if (loadStatus === 'loading') {
    return (
      <Card>
        <Card.Header>
          <ContextAwareToggle eventKey={`${pubKey}_info`} callback={() => {}}>
            open
          </ContextAwareToggle>
          Loading Metaplex token info{' '}
          <MetaplexTokenDataButton mintPubKey={mintPubKey} disabled />
        </Card.Header>
        <Accordion.Collapse eventKey={`${pubKey}_info`}>
          <Card.Body>
            <pre className="exe-hexdump p-2 rounded">Loading info </pre>
          </Card.Body>
        </Accordion.Collapse>
      </Card>
    );
  }

  // logger.info('token metaInfo:', JSON.stringify(metaInfo));

  if (!metaInfo || !metaInfo.data) {
    return (
      <Accordion.Item eventKey={`${mintKey}_metaplex_info`}>
        <Accordion.Header>
          No Metaplex token info{' '}
          <MetaplexTokenDataButton
            mintPubKey={mintPubKey}
            // TODO: restrict to what the mint allows (i think that means it needs to be passed into the component?)
            disabled={false}
          />
        </Accordion.Header>
      </Accordion.Item>
    );
  }

  const canEditMetadata =
    metaInfo.data.updateAuthority === fromKey.publicKey?.toString() &&
    metaInfo.data.isMutable;

  return (
    <Accordion.Item eventKey={`${mintKey}_metaplex_info`}>
      <Accordion.Header>
        <div className="col">
          <b>Metaplex Metadata</b>
          <InlinePK pk={metaInfo.pubkey?.toString()} formatLength={9} />
        </div>
        <div className="col ">
          <a target="_blank" href={metaInfo?.data.data.uri} rel="noreferrer">
            {metaInfo?.data.data.symbol}
          </a>
          :{'  '} ({metaInfo?.data.data.name} )
        </div>
        <div className="col ">
          <MetaplexTokenDataButton
            disabled={!canEditMetadata}
            mintPubKey={mintPubKey}
          />
        </div>
      </Accordion.Header>
      <Accordion.Body>
        <pre>
          <code className="exe-hexdump p-2 rounded">
            {JSON.stringify(
              metaInfo,
              (k, v) => {
                if (k === 'data') {
                  if (v.type || v.mint || v.name) {
                    return v;
                  }
                  return `${JSON.stringify(v).substring(0, 32)} ...`;
                }
                return v;
              },
              2
            )}
          </code>
        </pre>
      </Accordion.Body>
    </Accordion.Item>
  );
}

export default MetaplexMintMetaDataView;
