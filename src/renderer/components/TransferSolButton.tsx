import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { Col, Row } from 'react-bootstrap';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';
import { toast } from 'react-toastify';
import { useAppSelector } from '../hooks';

import CopyIcon from './CopyIcon';
import prettifyPubkey from '../common/prettifyPubkey';

import { sendSolFromSelectedWallet } from '../data/accounts/account';
import {
  NetStatus,
  selectValidatorNetworkState,
} from '../data/ValidatorNetwork/validatorNetworkState';

const PK_FORMAT_LENGTH = 24;

function TransferSolPopover(props: {
  pubKey: string | undefined;
  targetInputDisabled: boolean | undefined;
  targetPlaceholder: string | undefined;
}) {
  const { pubKey, targetInputDisabled, targetPlaceholder } = props;
  const selectedWallet = useWallet();
  const { connection } = useConnection();

  let pubKeyVal = pubKey;
  if (!pubKeyVal) {
    pubKeyVal = targetPlaceholder || '';
  }

  let fromKeyVal = selectedWallet.publicKey?.toString();
  if (!fromKeyVal) {
    fromKeyVal = 'unset';
  }

  const [sol, setSol] = useState<string>('0.01');
  const [fromKey, setFromKey] = useState<string>(fromKeyVal);
  const [toKey, setToKey] = useState<string>(pubKeyVal);

  useEffect(() => {
    if (pubKeyVal) {
      setToKey(pubKeyVal);
    }
  }, [pubKeyVal]);
  useEffect(() => {
    if (fromKeyVal) {
      setFromKey(fromKeyVal);
    }
  }, [fromKeyVal]);

  return (
    <Popover id="popover-basic">
      <Popover.Header as="h3">Transfer SOL</Popover.Header>
      <Popover.Body>
        <Form>
          <Form.Group as={Row} className="mb-3" controlId="formSOLAmount">
            <Form.Label column sm={3}>
              SOL
            </Form.Label>
            <Col sm={9}>
              <Form.Control
                type="number"
                placeholder="Select amount of SOL to transfer"
                value={sol}
                onChange={(e) => setSol(e.target.value)}
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
              <div className="d-flex">
                <code className="mt-4">
                  {prettifyPubkey(fromKey, PK_FORMAT_LENGTH)}
                </code>
                <CopyIcon writeValue={fromKey} />
              </div>
              <Form.Text className="text-muted" />
            </Col>
          </Form.Group>

          <Form.Group as={Row} className="mb-3" controlId="formToAccount">
            <Form.Label column sm={3}>
              To
            </Form.Label>
            <Col sm={9}>
              {targetInputDisabled ? (
                <div className="d-flex">
                  <code className="mt-4">
                    {prettifyPubkey(toKey, PK_FORMAT_LENGTH)}
                  </code>
                  <CopyIcon writeValue={toKey} />
                </div>
              ) : (
                <Form.Control
                  type="text"
                  placeholder="Select Account to send the SOL to"
                  value={toKey}
                  onChange={(e) => setToKey(e.target.value)}
                />
              )}
              {/* TODO: add radio selector to choose where the TX cost comes from                   
                  <Form.Text className="text-muted">
                    Transaction cost from To account (after transfer takes place)
                  </Form.Text> 
              */}
            </Col>
          </Form.Group>

          <Form.Group as={Row} className="mb-3">
            <Col sm={{ span: 10, offset: 2 }}>
              <Button
                type="button"
                onClick={() => {
                  document.body.click();
                  toast.promise(
                    sendSolFromSelectedWallet(
                      connection,
                      selectedWallet,
                      toKey,
                      sol
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

function TransferSolButton(props: {
  pubKey: string | undefined;
  label: string | undefined;
  targetInputDisabled: boolean | undefined;
  targetPlaceholder: string | undefined;
}) {
  const { pubKey, label, targetInputDisabled, targetPlaceholder } = props;
  const { status } = useAppSelector(selectValidatorNetworkState);

  return (
    <OverlayTrigger
      trigger="click"
      placement="bottom"
      overlay={TransferSolPopover({
        pubKey,
        targetInputDisabled,
        targetPlaceholder,
      })}
      rootClose
    >
      <Button
        size="sm"
        disabled={pubKey === undefined || status !== NetStatus.Running}
        variant="success"
      >
        {label || 'Transfer SOL'}
      </Button>
    </OverlayTrigger>
  );
}

export default TransferSolButton;
