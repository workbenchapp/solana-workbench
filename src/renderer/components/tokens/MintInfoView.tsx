import * as sol from '@solana/web3.js';

import Accordion from 'react-bootstrap/esm/Accordion';
import { Button, Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import {
  useConnection,
  useWallet,
  WalletContextState,
} from '@solana/wallet-adapter-react';
import { useState } from 'react';
import * as walletWeb3 from '../../wallet-adapter/web3';
import { useAppSelector } from '../../hooks';

import { useParsedAccount } from '../../data/accounts/getAccount';
import { selectValidatorNetworkState } from '../../data/ValidatorNetwork/validatorNetworkState';

import { logger } from '../../common/globals';
import InlinePK from '../InlinePK';
import { ActiveAccordionHeader } from './ActiveAccordionHeader';

function ButtonWithConfirmation({ disabled, children, onClick, title }) {
  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  return (
    <>
      <Button variant="primary" onClick={handleShow} disabled={disabled}>
        {title}
      </Button>

      <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{children}</Modal.Body>
        <Modal.Footer>
          <Button
            variant="primary"
            onClick={() => {
              onClick();
              handleClose();
            }}
          >
            OK
          </Button>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

// TODO: need to trigger an update of a component like this automatically when the cetAccount cache notices a change...
export async function closeMint(
  connection: sol.Connection,
  fromKey: WalletContextState,
  mintKey: sol.PublicKey,
  myWallet: sol.PublicKey
) {
  if (!myWallet) {
    logger.info('no myWallet', myWallet);
    return;
  }
  if (!mintKey) {
    logger.info('no mintKey', mintKey);
    return;
  }

  await walletWeb3.setAuthority(
    connection,
    fromKey, // Payer of the transaction fees
    mintKey, // Account
    myWallet, // Current authority
    'MintTokens', // Authority type: "0" represents Mint Tokens
    null // Setting the new Authority to null
  );
}

export function MintInfoView(props: { mintKey: string }) {
  const { mintKey } = props;
  const fromKey = useWallet();
  const { connection } = useConnection();
  const { net } = useAppSelector(selectValidatorNetworkState);

  const {
    loadStatus,
    account: mintInfo,
    error,
  } = useParsedAccount(net, mintKey, {
    retry: 2, // TODO: this is here because sometimes, we get given an accountInfo with no parsed data.
  });
  logger.debug(
    `MintInfoView(${mintKey}): ${loadStatus} - ${error}: ${JSON.stringify(
      mintInfo
    )}`
  );
  const mintEventKey = `${mintKey}_mint_info`;

  // ("idle" or "error" or "loading" or "success").
  if (
    loadStatus !== 'success' ||
    !mintInfo ||
    !mintInfo.accountInfo ||
    !mintInfo.accountInfo.data?.parsed
  ) {
    logger.verbose(
      `something not ready for ${JSON.stringify(mintInfo)}: ${loadStatus}`
    );

    return (
      <Accordion.Item eventKey={mintEventKey}>
        <ActiveAccordionHeader eventKey={mintEventKey} callback={() => {}}>
          Loading Mint info
        </ActiveAccordionHeader>
        <Accordion.Body>
          <pre className="exe-hexdump p-2 rounded">Loading Mint info</pre>
        </Accordion.Body>
      </Accordion.Item>
    );
  }

  // logger.info('mintInfo:', JSON.stringify(mintInfo));
  const hasAuthority =
    mintInfo.accountInfo.data?.parsed.info.mintAuthority ===
    fromKey.publicKey?.toString();
  const mintAuthorityIsNull =
    !mintInfo?.accountInfo.data?.parsed.info.mintAuthority;

  if (!mintInfo || mintInfo?.data) {
    // logger.error(`something undefined`);
    return (
      <Accordion.Item eventKey={mintEventKey}>
        <ActiveAccordionHeader eventKey={mintEventKey} callback={() => {}}>
          Loading Mint data
        </ActiveAccordionHeader>
        <Accordion.Body>
          <pre className="exe-hexdump p-2 rounded">Loading Mint data </pre>
        </Accordion.Body>
      </Accordion.Item>
    );
  }

  const supply = mintInfo?.accountInfo.data?.parsed.info.supply;

  return (
    <Accordion.Item className="pl-2" eventKey={mintEventKey}>
      <ActiveAccordionHeader eventKey={mintEventKey} callback={() => {}}>
        <div className=" basis-48">
          <b className="mr-2">Mint</b>
          <InlinePK pk={mintKey} formatLength={9} />
        </div>
        <div className="flex-1">
          {supply} token{supply > 1 && 's'}
        </div>
        <div className="shrink">
          <ButtonWithConfirmation
            disabled={!hasAuthority || mintKey === undefined}
            title={mintAuthorityIsNull ? 'Mint Closed' : 'Close Mint'}
            onClick={() => {
              if (!fromKey.publicKey) {
                return;
              }
              toast.promise(
                closeMint(
                  connection,
                  fromKey,
                  new sol.PublicKey(mintKey),
                  fromKey.publicKey
                ),
                {
                  pending: `Close mint account submitted`,
                  success: `Close mint account  succeeded 👌`,
                  error: `Close mint account   failed 🤯`,
                }
              );
            }}
          >
            <div>
              Are you sure you want to close the token mint? This will set the
              update authority for the mint to null, and is not reversable.
            </div>
            <div>
              Mint: <InlinePK pk={mintKey} formatLength={9} />
            </div>
          </ButtonWithConfirmation>
        </div>
      </ActiveAccordionHeader>
      <Accordion.Body>
        <pre className="exe-hexdump p-2 rounded">
          <code>Mint info: {JSON.stringify(mintInfo, null, 2)}</code>
        </pre>
      </Accordion.Body>
    </Accordion.Item>
  );
}

export default MintInfoView;
