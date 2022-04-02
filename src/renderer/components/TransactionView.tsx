import { faPencil, faSignature } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as sol from '@solana/web3.js';
import useInterval from 'common/hooks';
import { explorerURL, netToURL } from 'common/strings';
import { useEffect, useState } from 'react';
import {
  ListGroup,
  ListGroupItem,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap';
import analytics from 'renderer/common/analytics';
import ValidatorNetwork from 'renderer/data/ValidatorNetwork/ValidatorNetwork';
import {
  NetStatus,
  selectValidatorNetworkState,
} from 'renderer/data/ValidatorNetwork/validatorNetworkState';
import { useAppSelector } from 'renderer/hooks';
import InlinePK from './InlinePK';

type InstructionAccountData = {
  instruction: sol.ParsedInstruction;
  accountKeys: sol.ParsedMessageAccount | undefined;
  signatures: string[] | undefined;
};

function TransactionView() {
  const validator = useAppSelector(selectValidatorNetworkState);
  const { net } = validator;
  const validatorStatus = validator.status;
  const [latestProcessedSlot, setLatestProcessedSlot] = useState(0);
  const [renderedParsedTransactions, setRenderedParsedTransactions] = useState<
    (sol.ParsedTransactionWithMeta | null)[][]
  >([]);

  const updateTxns = () => {
    async function txnsFromBlocks() {
      const solConn = new sol.Connection(netToURL(net));

      const blockProduction = await solConn.getBlockProduction();
      if (latestProcessedSlot === blockProduction.context.slot - 1) {
        return;
      }
      const blocks = await solConn.getBlocks(
        latestProcessedSlot,
        blockProduction.context.slot - 1
      );

      blocks.forEach(async (block) => {
        const blockDetails = await solConn.getBlock(block);
        const nonVoteTxns = blockDetails?.transactions.filter((txn) => {
          return (
            txn.transaction.message.programIds()[0].toString() !==
            sol.VoteProgram.programId.toString()
          );
        });
        if (!nonVoteTxns || nonVoteTxns.length === 0) {
          return;
        }
        const signatures = Array.prototype.concat(
          ...nonVoteTxns.map((txn) => txn.transaction.signatures)
        );
        if (signatures.length === 0) {
          return;
        }
        const parsedTxns = await solConn.getParsedTransactions(signatures);
        parsedTxns.forEach(
          async (txn: sol.ParsedTransactionWithMeta | null) => {
            if (!txn) {
              return;
            }
            const { instructions } = txn.transaction.message;
            if (instructions) {
              const newRenderedParsedTransactions = [
                parsedTxns,
                ...renderedParsedTransactions,
              ];
              setRenderedParsedTransactions(newRenderedParsedTransactions);
            }
          }
        );
      });

      setLatestProcessedSlot(blockProduction.context.slot);
    }
    if (validatorStatus === NetStatus.Running) {
      txnsFromBlocks();
    }
  };

  useEffect(updateTxns, []);
  useInterval(updateTxns, 500);

  const pillify = (instruction: sol.ParsedInstruction) => {
    const { parsed, program, programId } = instruction;
    const { info } = parsed;
    return <pre>{JSON.stringify(instruction, null, 2)}</pre>;
  };

  const accountInstructionData = renderedParsedTransactions.map(
    (parsedTxns) => {
      const accountsAndInstructions: InstructionAccountData[] = [];
      const txn = parsedTxns[0]?.transaction;
      parsedTxns[0]?.transaction.message.instructions.forEach(
        (instruction, i) => {
          accountsAndInstructions.push({
            accountKeys: txn?.message.accountKeys[i],
            instruction: instruction as sol.ParsedInstruction,
            signatures: txn?.signatures,
          });
        }
      );
      return accountsAndInstructions;
    }
  );

  return (
    <ListGroup>
      {accountInstructionData.map((data: InstructionAccountData[]) => {
        return (
          <ListGroupItem>
            {data.map((d) => {
              return (
                <div
                  key={`${d.signatures && d.signatures[0]}`}
                  className="ms-2"
                >
                  <div className="fw-bold">
                    {d.instruction.program !== ''
                      ? `${d.instruction.program}.${d.instruction.parsed?.type}`
                      : 'unknown'}
                    {d.signatures?.map((sig) => (
                      <InlinePK className="ms-2" pk={sig} />
                    ))}
                  </div>
                  <div>
                    {d.accountKeys?.writable && (
                      <OverlayTrigger
                        placement="bottom"
                        overlay={<Tooltip>Writable</Tooltip>}
                      >
                        <span>
                          <FontAwesomeIcon className="me-2" icon={faPencil} />
                        </span>
                      </OverlayTrigger>
                    )}
                    {d.accountKeys?.signer && (
                      <OverlayTrigger
                        placement="bottom"
                        overlay={<Tooltip>Signer</Tooltip>}
                      >
                        <span>
                          <FontAwesomeIcon
                            className="me-2"
                            icon={faSignature}
                          />
                        </span>
                      </OverlayTrigger>
                    )}
                    <a
                      onClick={() => analytics('clickExplorerLink', { net })}
                      href={explorerURL(
                        net,
                        `/tx/${d.signatures && d.signatures[0]}`
                      )}
                      target="_blank"
                      className="sol-link"
                      rel="noreferrer"
                    >
                      Explorer
                    </a>
                  </div>
                </div>
              );
            })}
          </ListGroupItem>
        );
      })}
    </ListGroup>
  );
}
export default TransactionView;
