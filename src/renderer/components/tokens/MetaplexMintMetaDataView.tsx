import * as sol from '@solana/web3.js';
import * as metaplex from '@metaplex/js';

import Accordion from 'react-bootstrap/esm/Accordion';
import { useWallet } from '@solana/wallet-adapter-react';
import { useQuery } from 'react-query';

import { queryTokenMetadata } from '../../data/accounts/getAccount';
import { selectValidatorNetworkState } from '../../data/ValidatorNetwork/validatorNetworkState';
import MetaplexTokenDataButton from './MetaplexTokenData';

import InlinePK from '../InlinePK';
import { ActiveAccordionHeader } from './ActiveAccordionHeader';
import { useAppSelector } from '../../hooks';

export function MetaplexMintMetaDataView(props: { mintKey: string }) {
  const { mintKey } = props;
  const fromKey = useWallet();
  const { net } = useAppSelector(selectValidatorNetworkState);

  // TODO: this can't be here before the query
  // TODO: there's a better way in query v4 - https://tkdodo.eu/blog/offline-react-query
  // if (status !== NetStatus.Running) {
  //   return (
  //     <Accordion.Item eventKey={`${mintKey}_info`}>
  //       <ActiveAccordionHeader>
  //         Validator Offline{' '}
  //         <MetaplexTokenDataButton
  //           mintPubKey={mintKey ? new sol.PublicKey(mintKey) : undefined}
  //           disabled
  //         />
  //       </ActiveAccordionHeader>
  //       <Accordion.Body>
  //         <pre className="exe-hexdump p-2 rounded">Validator Offline</pre>
  //       </Accordion.Body>
  //     </Accordion.Item>
  //   );
  // }

  const {
    status: loadStatus,
    // error,
    data: metaInfo,
  } = useQuery<metaplex.programs.metadata.Metadata | undefined, Error>(
    ['token-mint-meta', { net, pubKey: mintKey }],
    // TODO: need to be able to say "we errored, don't keep looking" - there doesn't need to be metadata...
    queryTokenMetadata,
    {}
  );

  const mintEventKey = `${mintKey}_metaplex_info`;

  if (!mintKey) {
    return (
      <Accordion.Item eventKey={mintEventKey}>
        <ActiveAccordionHeader eventKey={mintEventKey} callback={() => {}}>
          No Mint selected
        </ActiveAccordionHeader>
        <Accordion.Body>
          <pre className="exe-hexdump p-2 rounded">No DATA</pre>
        </Accordion.Body>
      </Accordion.Item>
    );
  }
  const mintPubKey = new sol.PublicKey(mintKey);

  // ("idle" or "error" or "loading" or "success").
  if (loadStatus === 'loading') {
    return (
      <Accordion.Item eventKey={mintEventKey}>
        <ActiveAccordionHeader eventKey={mintEventKey} callback={() => {}}>
          Loading Metaplex token info{' '}
          <MetaplexTokenDataButton mintPubKey={mintPubKey} disabled />
        </ActiveAccordionHeader>
        <Accordion.Body>
          <pre className="exe-hexdump p-2 rounded">No DATA</pre>
        </Accordion.Body>
      </Accordion.Item>
    );
  }

  // logger.info('token metaInfo:', JSON.stringify(metaInfo));

  if (!metaInfo || !metaInfo.data) {
    return (
      <Accordion.Item eventKey={mintEventKey}>
        <ActiveAccordionHeader eventKey={mintEventKey} callback={() => {}}>
          No Metaplex token info{' '}
          <MetaplexTokenDataButton
            mintPubKey={mintPubKey}
            // TODO: restrict to what the mint allows (i think that means it needs to be passed into the component?)
            disabled={false}
          />
        </ActiveAccordionHeader>
      </Accordion.Item>
    );
  }

  const canEditMetadata =
    metaInfo.data.updateAuthority === fromKey.publicKey?.toString() &&
    metaInfo.data.isMutable;

  return (
    <Accordion.Item eventKey={mintEventKey}>
      <ActiveAccordionHeader eventKey={mintEventKey} callback={() => {}}>
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
      </ActiveAccordionHeader>
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
