import * as sol from '@solana/web3.js';
import { Net, netToURL } from '../ValidatorNetwork/validatorNetworkState';

import { AccountInfo } from './accountInfo';
import { peekAccount, getAllAccounts, updateCache } from './getAccount';

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
  setChangesState: (accounts: AccountInfo[]) => void,
  sortFunction: (a: AccountInfo, b: AccountInfo) => number,
  setValidatorSlot: (slot: number) => void
) => {
  let programIDPubkey: sol.PublicKey;
  if (programID === sol.SystemProgram.programId.toString()) {
    programIDPubkey = sol.SystemProgram.programId;
  } else {
    programIDPubkey = new sol.PublicKey(programID);
  }
  let batchLen = 0;

  if (
    !(net in changeSubscriptions) ||
    !(programID in changeSubscriptions[net])
  ) {
    const solConn = new sol.Connection(netToURL(net));
    const subscriptionID = solConn.onProgramAccountChange(
      programIDPubkey,
      (info: sol.KeyedAccountInfo, ctx: sol.Context) => {
        if (setValidatorSlot) {
          setValidatorSlot(ctx.slot);
        }
        const pubKey = info.accountId.toString();
        logger.silly('programChange', pubKey);
        const solAmount = info.accountInfo.lamports / sol.LAMPORTS_PER_SOL;
        let [count, maxDelta, solDelta, prevSolAmount] = [1, 0, 0, 0];

        const account = peekAccount(net, pubKey);
        if (account) {
          ({ count, maxDelta } = account);
          prevSolAmount = account.accountInfo.lamports / sol.LAMPORTS_PER_SOL;
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
        batchLen += 1;

        updateCache(programAccountChange);

        if (batchLen === PROGRAM_CHANGE_MAX_BATCH_SIZES[net]) {
          const sortedChanges = getAllAccounts();
          if (sortFunction) {
            sortedChanges.sort((a, b) => sortFunction(a, b));
          }

          if (setChangesState) {
            setChangesState(sortedChanges);
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
