import { faArrowLeft, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { truncateSolAmount } from 'common/strings';
import { useState } from 'react';
import { ImportedAccountMap } from 'types/types';
import InlinePK from './InlinePK';

function ProgramChange(props: {
  pubKey: string;
  count: number;
  solAmount: number;
  maxDelta: number;
  attemptAccountAdd: (pk: string, b: boolean) => void;
  importedAccounts: ImportedAccountMap;
}) {
  const {
    count,
    pubKey,
    attemptAccountAdd,
    importedAccounts,
    solAmount,
    maxDelta,
  } = props;
  const imported = pubKey in importedAccounts;
  const [importing, setImporting] = useState(false);
  const formatSolAmount = (amt: number): string => {
    if (Math.abs(amt) < 0.01) {
      return '<0.01';
    }
    return Math.abs(amt).toFixed(2);
  };
  return (
    <>
      <td>
        <span
          className={`${
            imported ? 'cursor-not-allowed' : 'cursor-pointer'
          } pt-1 pb-1 ps-2 pe-2 icon rounded`}
        >
          <FontAwesomeIcon
            onClick={() => {
              if (!imported && !importing) {
                setImporting(true);
                attemptAccountAdd(pubKey, false);
              }
            }}
            icon={faArrowLeft}
            size="1x"
          />
        </span>
        <InlinePK pk={pubKey} />
      </td>
      <td>
        <span className="ms-2 rounded p-1">
          <small className="text-secondary">Max Δ</small>
          <small className="ms-2">{formatSolAmount(maxDelta)}</small>
        </span>
      </td>
      <td>
        <span className="ms-2 rounded p-1">
          <small className="text-secondary">SOL</small>
          <small className="ms-2">{truncateSolAmount(solAmount)}</small>
        </span>
      </td>
      <td>
        <span className="ms-2 badge bg-secondary rounded-pill">{count}</span>
      </td>
      <td>
        {importing && (
          <FontAwesomeIcon className="ms-2 fa-spin" icon={faSpinner} />
        )}
      </td>
    </>
  );
}

export default ProgramChange;
