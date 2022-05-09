import * as sol from '@solana/web3.js';
import { MAX_PROGRAM_CHANGES_DISPLAYED } from 'types/types';
import { Net, netToURL } from '../ValidatorNetwork/validatorNetworkState';

import { AccountInfo } from './accountInfo';
import { updateCache } from './getAccount';

const logger = window.electron.log;

export interface ProgramChangesState {
  changes: AccountInfo[];
  paused: boolean;
}

export interface ChangeBatchSize {
  [net: string]: number;
}
const PROGRAM_CHANGE_MAX_BATCH_SIZES: ChangeBatchSize = {
  [Net.Localhost]: 1,
  [Net.Dev]: 20,
  [Net.Test]: 100,
  [Net.MainnetBeta]: 500,
};
export interface ChangeLookupMap {
  [pubKey: string]: AccountInfo;
}
export interface ChangeSubscriptionMap {
  [net: string]: {
    [programID: string]: {
      subscriptionID: number;
      solConn: sol.Connection;
    };
  };
}

const changeSubscriptions: ChangeSubscriptionMap = {};
export const subscribeProgramChanges = async (
  net: Net,
  programID: string,
  setChangesState: (accounts: AccountInfo[]) => void
) => {
  let programIDPubkey: sol.PublicKey;
  if (programID === sol.SystemProgram.programId.toString()) {
    programIDPubkey = sol.SystemProgram.programId;
  } else {
    programIDPubkey = new sol.PublicKey(programID);
  }
  let batchLen = 0;
  // TODO: need to expire entries from it - otherwise, if you leave it running for too long, we blow up.
  const changeLookupMap: ChangeLookupMap = {};

  if (
    !(net in changeSubscriptions) ||
    !(programID in changeSubscriptions[net])
  ) {
    const solConn = new sol.Connection(netToURL(net));
    const subscriptionID = solConn.onProgramAccountChange(
      programIDPubkey,
      (info: sol.KeyedAccountInfo /* , ctx: sol.Context */) => {
        const pubKey = info.accountId.toString();
        logger.silly('programChange', pubKey);
        const solAmount = info.accountInfo.lamports / sol.LAMPORTS_PER_SOL;
        let [count, maxDelta, solDelta, prevSolAmount] = [1, 0, 0, 0];

        if (pubKey in changeLookupMap) {
          ({ count, maxDelta } = changeLookupMap[pubKey]);
          prevSolAmount =
            changeLookupMap[pubKey].accountInfo.lamports / sol.LAMPORTS_PER_SOL;
          solDelta = solAmount - prevSolAmount;
          if (Math.abs(solDelta) > Math.abs(maxDelta)) {
            maxDelta = solDelta;
          }
          count += 1;
        } else {
          logger.silly('new pubKey in programChange', pubKey);
        }

        const programAccountChange: AccountInfo = {
          net,
          pubKey,
          accountInfo: info.accountInfo,
          accountId: info.accountId,

          count,
          solDelta,
          maxDelta,
          programID,
        };
        changeLookupMap[pubKey] = programAccountChange;
        batchLen += 1;

        updateCache(programAccountChange);

        if (batchLen === PROGRAM_CHANGE_MAX_BATCH_SIZES[net]) {
          // TODO: this kind of sort should really be in the view, not subscription
          const sortedChanges = Object.values(changeLookupMap);
          sortedChanges.sort(
            (a, b) => Math.abs(b.maxDelta) - Math.abs(a.maxDelta)
          );

          if (setChangesState) {
            setChangesState(
              sortedChanges.slice(0, MAX_PROGRAM_CHANGES_DISPLAYED)
            );
          }
          batchLen = 0;
        }
      }
    );
    changeSubscriptions[net] = {
      [programID]: {
        subscriptionID,
        solConn,
      },
    };
  }
};

export const unsubscribeProgramChanges = async (
  net: Net,
  programID: string
) => {
  const sub = changeSubscriptions[net][programID];
  if (!sub) return;
  await sub.solConn.removeProgramAccountChangeListener(sub.subscriptionID);
  delete changeSubscriptions[net][programID];
};
