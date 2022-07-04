import { toast } from 'react-toastify';
import * as sol from '@solana/web3.js';

import * as walletAdapter from '@solana/wallet-adapter-react';
import {
  Button,
  Col,
  Form,
  OverlayTrigger,
  Popover,
  Row,
} from 'react-bootstrap';
import { useEffect, useState } from 'react';
import * as walletWeb3 from '../../wallet-adapter/web3';

import { logger } from '@/common/globals';
import { useAppSelector } from '@/hooks';
import {
  NetStatus,
  selectValidatorNetworkState,
} from '@/data/ValidatorNetwork/validatorNetworkState';
import { ensureAtaFor } from './CreateNewMintButton';

async function transferTokenToReceiver(
  connection: sol.Connection,
  fromKey: walletAdapter.WalletContextState,
  mintKey: sol.PublicKey,
  transferTo: sol.PublicKey,
  tokenCount: int
) {
  if (!transferTo) {
    logger.info('no transferTo', transferTo);
    return;
  }
  if (!mintKey) {
    logger.info('no mintKey', mintKey);
    return;
  }
  if (!fromKey.publicKey) {
    logger.info('no fromKey.publicKey', fromKey);
    return;
  }
  const funderAta = await ensureAtaFor(
    connection,
    fromKey,
    mintKey,
    fromKey.publicKey
  );
  if (!funderAta) {
    logger.info('no funderAta', funderAta);
    return;
  }
  if (!transferTo) {
    logger.info('no transferTo', transferTo);
    return;
  }

  // Get the token account of the toWallet Solana address. If it does not exist, create it.
  logger.info('getOrCreateAssociatedTokenAccount');
  const ataReceiver = await ensureAtaFor(
    connection,
    fromKey,
    mintKey,
    transferTo
  );

  if (!ataReceiver) {
    logger.info('no ataReceiver', ataReceiver);
    return;
  }
  const signature = await walletWeb3.transfer(
    connection,
    fromKey, // Payer of the transaction fees
    funderAta, // Source account
    ataReceiver, // Destination account
    fromKey.publicKey, // Owner of the source account
    tokenCount // Number of tokens to transfer
  );
  logger.info('SIGNATURE', signature);
}

/// ///////////////////////////////////////////////////////////////////

function TransferTokenPopover(props: {
  connection: sol.Connection;
  fromKey: walletAdapter.WalletContextState;
  mintKey: string | undefined;
}) {
  const { connection, fromKey, mintKey } = props;

  let pubKeyVal;
  if (!pubKeyVal) {
    pubKeyVal = 'paste';
  }

  let fromKeyVal = fromKey.publicKey?.toString();
  if (!fromKeyVal) {
    fromKeyVal = 'unset';
  }

  const [tokenCount, setTokenCount] = useState<string>('1');
  // const [fromKey, setFromKey] = useState<string>(fromKeyVal);
  const [toKey, setToKey] = useState<string>('');

  useEffect(() => {
    if (pubKeyVal) {
      setToKey(pubKeyVal);
    }
  }, [pubKeyVal]);
  //   useEffect(() => {
  //     if (fromKeyVal) {
  //       setFromKey(fromKeyVal);
  //     }
  //   }, [fromKeyVal]);

  return (
    <Popover id="popover-basic">
      <Popover.Header as="h3">Transfer Tokens</Popover.Header>
      <Popover.Body>
        <Form>
          <Form.Group as={Row} className="mb-3" controlId="formSOLAmount">
            <Form.Label column sm={3}>
              Number of tokens
            </Form.Label>
            <Col sm={9}>
              <Form.Control
                type="number"
                placeholder="Select Number of tokens to transfer"
                value={tokenCount}
                onChange={(e) => setTokenCount(e.target.value)}
              />
              {/* TODO: check to see if the from Account has enough, including TX costs if its to come from them */}
              {/* TODO: add a MAX button */}
              <Form.Text className="text-muted" />
            </Col>
          </Form.Group>

          {/* TODO: add a switch to&from button */}
          <Form.Group as={Row} className="mb-3" controlId="formFromAccount">
            {/* TODO: these can only be accounts we know the private key for ... */}
            {/* TODO: should be able to edit, paste and select from list populated from accountList */}
            <Form.Label column sm={3}>
              From
            </Form.Label>
            <Col sm={9}>
              <Form.Control
                readOnly // Because we use the wallet to do the signing, this can't be changed
                type="text"
                placeholder="Select Account to take the SOL from"
                value={fromKey.publicKey?.toString()}
              />
              <Form.Text className="text-muted" />
            </Col>
          </Form.Group>

          <Form.Group as={Row} className="mb-3" controlId="formToAccount">
            <Form.Label column sm={3}>
              To
            </Form.Label>
            <Col sm={9}>
              <Form.Control
                type="text"
                placeholder="Select Account to send the SOL to"
                value={toKey}
                onChange={(e) => setToKey(e.target.value)}
              />
              <Form.Text className="text-muted">
                {/* TODO: add radio selector to choose where the TX cost comes from */}
                Transaction costs, and Ata Rent from wallet
              </Form.Text>
            </Col>
          </Form.Group>

          <Form.Group as={Row} className="mb-3">
            <Col sm={{ span: 10, offset: 2 }}>
              <Button
                type="button"
                onClick={() => {
                  document.body.click();
                  if (!mintKey) {
                    return;
                  }
                  toast.promise(
                    transferTokenToReceiver(
                      connection,
                      fromKey,
                      new sol.PublicKey(mintKey),
                      new sol.PublicKey(toKey),
                      tokenCount
                    ),
                    {
                      pending: 'Transfer submitted',
                      success: 'Transfer succeeded 👌',
                      error: {
                        render({ data }) {
                          // eslint-disable-next-line no-console
                          console.log('eror', data);
                          // When the promise reject, data will contains the error
                          return 'error';
                        },
                      },
                    }
                  );
                }}
              >
                Submit Transfer
              </Button>
            </Col>
          </Form.Group>
        </Form>
      </Popover.Body>
    </Popover>
  );
}

function TransferTokenButton(props: {
  connection: sol.Connection;
  fromKey: walletAdapter.WalletContextState;
  mintKey: string | undefined;
}) {
  const { connection, fromKey, mintKey } = props;
  const { status } = useAppSelector(selectValidatorNetworkState);

  return (
    <OverlayTrigger
      trigger="click"
      placement="bottom"
      overlay={TransferTokenPopover({ connection, fromKey, mintKey })}
      rootClose
    >
      <Button
        size="sm"
        disabled={mintKey === undefined || status !== NetStatus.Running}
        variant="success"
      >
        Transfer Tokens
      </Button>
    </OverlayTrigger>
  );
}

export default TransferTokenButton;
