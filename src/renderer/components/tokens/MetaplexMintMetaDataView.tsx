import React from 'react';
import * as sol from '@solana/web3.js';
import * as metaplex from '@metaplex/js';

import Accordion from 'react-bootstrap/esm/Accordion';
import { useWallet } from '@solana/wallet-adapter-react';
import { useQuery } from 'react-query';
import { useAppSelector } from '../../hooks';

import { queryTokenMetadata } from '../../data/accounts/getAccount';
import {
  NetStatus,
  selectValidatorNetworkState,
} from '../../data/ValidatorNetwork/validatorNetworkState';
import MetaplexTokenDataButton from './MetaplexTokenData';

import { logger } from '../../common/globals';
import InlinePK from '../InlinePK';

// TODO: need to trigger an update of a component like this automatically when the cetAccount cache notices a change...

export function MetaplexMintMetaDataView(props: { mintKey: string }) {
  const { mintKey } = props;
  const fromKey = useWallet();
  const { net, status } = useAppSelector(selectValidatorNetworkState);

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
    error,
    data: metaInfo,
  } = useQuery<metaplex.programs.metadata.Metadata | undefined, Error>(
    ['token-mint-meta', { net, pubKey }],
    // TODO: need to be able to say "we errored, don't keep looking" - there doesn't need to be metadata...
    queryTokenMetadata,
    {}
  );
  // logger.silly(
  //   `queryTokenMetadata(${pubKey}): ${loadStatus} - error: ${error}`
  // );

  // ("idle" or "error" or "loading" or "success").
  if (loadStatus === 'loading') {
    return (
      <Accordion.Item eventKey={`${pubKey}_info`}>
        <Accordion.Header>
          Loading Metaplex token info{' '}
          <MetaplexTokenDataButton
            mintPubKey={mintKey ? new sol.PublicKey(mintKey) : undefined}
            disabled
          />
        </Accordion.Header>
        <Accordion.Body>
          <pre className="exe-hexdump p-2 rounded">Loading info </pre>
        </Accordion.Body>
      </Accordion.Item>
    );
  }

  // logger.info('token metaInfo:', JSON.stringify(metaInfo));

  if (!metaInfo || !metaInfo.data) {
    return (
      <Accordion.Item eventKey={`${mintKey}_metaplex_info`}>
        <Accordion.Header>
          No Metaplex token info{' '}
          <MetaplexTokenDataButton
            mintPubKey={mintKey ? new sol.PublicKey(mintKey) : undefined}
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
            mintPubKey={new sol.PublicKey(mintKey)}
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
