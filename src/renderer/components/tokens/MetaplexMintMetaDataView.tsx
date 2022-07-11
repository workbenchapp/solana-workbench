import React, { useEffect, useState } from 'react';
import * as sol from '@solana/web3.js';
import * as metaplex from '@metaplex/js';

import Accordion from 'react-bootstrap/esm/Accordion';
import hexdump from 'hexdump-nodejs';
import { Buffer } from 'buffer';
import { useAppSelector } from '../../hooks';

import { getTokenMetadata } from '../../data/accounts/getAccount';
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
  const { net, status } = useAppSelector(selectValidatorNetworkState);

  const [metaInfo, updateMetaInfo] =
    useState<metaplex.programs.metadata.Metadata>();

  useEffect(() => {
    if (status !== NetStatus.Running) {
      return;
    }
    try {
      // this assumes metaplex
      const meta = getTokenMetadata(net, mintKey.toString());
      meta
        .then((m) => {
          updateMetaInfo(m);
          logger.info('getTokenMetadata', m.data.data.symbol);
          // moreInfo = JSON.stringify(m.data);
          return m;
        })
        .catch(logger.error);
      // moreInfo = JSON.stringify(meta);
      // moreInfo = 'what';
    } catch (e) {
      // moreInfo = JSON.stringify(e);
      logger.error('getTokenMetadata', e);
    }
  }, [mintKey, net, status]);

  if (!metaInfo) {
    return (
      <Accordion.Item eventKey={`${mintKey}_metaplex_info`}>
        <Accordion.Header>
          No Metaplex token info{' '}
          <MetaplexTokenDataButton
            mintPubKey={mintKey ? new sol.PublicKey(mintKey) : null}
          />
        </Accordion.Header>
      </Accordion.Item>
    );
  }
  return (
    <Accordion.Item eventKey={`${mintKey}_metaplex_info`}>
      <Accordion.Header>
        Metaplex:{'  '}
        <InlinePK pk={metaInfo.pubkey.toString()} formatLength={9} />
        <a target="_blank" href={metaInfo?.data.data.uri} rel="noreferrer">
          {metaInfo?.data.data.symbol}
        </a>
        :{'  '} ({metaInfo?.data.data.name} )
        <MetaplexTokenDataButton mintPubKey={new sol.PublicKey(mintKey)} />
      </Accordion.Header>
      <Accordion.Body>
        <pre className="exe-hexdump p-2 rounded">
          <code>
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
