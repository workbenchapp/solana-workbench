import { useEffect, useState } from 'react';
import * as metaplex from '@metaplex/js';

import { useAppSelector } from '../hooks';

import { getTokenMetadata } from '../data/accounts/getAccount';
import {
  NetStatus,
  selectValidatorNetworkState,
} from '../data/ValidatorNetwork/validatorNetworkState';
import InlinePK from './InlinePK';

const logger = window.electron.log;

// TODO: need to trigger an update of a component like this automatically when the cetAccount cache notices a change...

export function TokenMetaView(props: { mintKey: string; className?: string }) {
  const { mintKey, className } = props;
  const { net, status } = useAppSelector(selectValidatorNetworkState);

  const [metaInfo, updateMetaInfo] =
    useState<metaplex.programs.metadata.Metadata>();

  useEffect(() => {
    if (status !== NetStatus.Running) {
      return;
    }
    // let moreInfo = 'NONE';
    try {
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

  // TODO: how do I find out the total number of tokens minted, vs how many could be minted
  // TODO: or a list of all the ATA's that have tokens (or even more fun, ATA's for this mint that don't have tokens ...)
  return (
    <div className={className}>
      <div>
        Mint: <InlinePK pk={mintKey.toString()} />
        <a href={metaInfo?.data.data.uri}>{metaInfo?.data.data.symbol}</a> (
        {metaInfo?.data.data.name} )
      </div>
      <div>Meta: {JSON.stringify(metaInfo)}</div>
    </div>
  );
}
TokenMetaView.defaultProps = {
  className: '',
};

export default TokenMetaView;
