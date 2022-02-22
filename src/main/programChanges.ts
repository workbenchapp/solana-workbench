import * as sol from '@solana/web3.js';
import {
  ChangeBatchSize,
  ChangeLookupMap,
  ChangeSubscriptionMap,
  Net,
  ProgramAccountChange,
  ProgramChangeResponse,
  SubscribeProgramChangesRequest,
  UnsubscribeProgramChangesRequest,
} from '../types/types';
import { netToURL } from '../common/strings';

const PROGRAM_CHANGE_MAX_BATCH_SIZES: ChangeBatchSize = {
  [Net.Localhost]: 1,
  [Net.Dev]: 20,
  [Net.Test]: 100,
  [Net.MainnetBeta]: 500,
};

const changeSubscriptions: ChangeSubscriptionMap = {};
const subscribeProgramChanges = async (
  event: Electron.IpcMainEvent,
  msg: SubscribeProgramChangesRequest
) => {
  const { net, programID } = msg;
  let programIDPubkey: sol.PublicKey;
  if (programID === sol.SystemProgram.programId.toString()) {
    programIDPubkey = sol.SystemProgram.programId;
  } else {
    programIDPubkey = new sol.PublicKey(programID);
  }
  let batchLen = 0;
  const changeLookupMap: ChangeLookupMap = {};

  if (
    !(net in changeSubscriptions) ||
    !(programID in changeSubscriptions[net])
  ) {
    const solConn = new sol.Connection(netToURL(net));
    const subscriptionID = solConn.onProgramAccountChange(
      programIDPubkey,
      (info: sol.KeyedAccountInfo, ctx: sol.Context) => {
        const pubKey = info.accountId.toString();
        const solAmount = info.accountInfo.lamports / sol.LAMPORTS_PER_SOL;
        let [count, maxDelta, solDelta, prevSolAmount] = [1, 0, 0, 0];

        if (pubKey in changeLookupMap) {
          ({ count, maxDelta } = changeLookupMap[pubKey]);
          prevSolAmount = changeLookupMap[pubKey].solAmount;
          solDelta = solAmount - prevSolAmount;
          if (Math.abs(solDelta) > Math.abs(maxDelta)) {
            maxDelta = solDelta;
          }
          count += 1;
        }

        if (batchLen === PROGRAM_CHANGE_MAX_BATCH_SIZES[net]) {
          const sortedChanges = Object.values(changeLookupMap);
          sortedChanges.sort((a, b) => {
            return Math.abs(b.maxDelta) - Math.abs(a.maxDelta);
          });
          const res: ProgramChangeResponse = {
            net,
            changes: sortedChanges,
            uniqueAccounts: Object.keys(changeLookupMap).length,
          };
          event.reply('main', {
            method: 'program-changes',
            res,
          });
          batchLen = 0;
        } else {
          const programAccountChange: ProgramAccountChange = {
            net,
            pubKey,
            info,
            ctx,
            solAmount,
            count,
            solDelta,
            maxDelta,
            programID,
          };
          changeLookupMap[pubKey] = programAccountChange;
          batchLen += 1;
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

const unsubscribeProgramChanges = async (
  msg: UnsubscribeProgramChangesRequest
) => {
  const sub = changeSubscriptions[msg.net][msg.programID];
  if (!sub) return;
  await sub.solConn.removeProgramAccountChangeListener(sub.subscriptionID);
  delete changeSubscriptions[msg.net][msg.programID];
};

export { unsubscribeProgramChanges, subscribeProgramChanges };
