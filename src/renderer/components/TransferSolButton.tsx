import { useState, useEffect } from 'react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { Row, Col } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useAppSelector } from '../hooks';

import {
  sendSolFromSelectedWallet,
  transferSol,
} from '../data/accounts/account';
import {
  NetStatus,
  selectValidatorNetworkState,
} from '../data/ValidatorNetwork/validatorNetworkState';

function TransferSolPopover(props: { pubKey: string | undefined }) {
  const { pubKey } = props;
  const selectedWallet = useWallet();
  const { connection } = useConnection();

  let pubKeyVal = pubKey;
  if (!pubKeyVal) {
    pubKeyVal = 'paste';
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
              <Form.Control
                readOnly // Because we use the wallet to do the signing, this can't be changed
                type="text"
                placeholder="Select Account to take the SOL from"
                value={fromKey}
                onChange={(e) => setFromKey(e.target.value)}
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
                Transaction cost from To account (after transfer takes place)
              </Form.Text>
            </Col>
          </Form.Group>

          <Form.Group as={Row} className="mb-3" controlId="formBasicCheckbox">
            <Col sm={{ span: 10, offset: 2 }}>
              <Form.Check type="checkbox" label="Check me out" />
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

function TransferSolButton(props: { pubKey: string | undefined }) {
  const { pubKey } = props;
  const { status } = useAppSelector(selectValidatorNetworkState);

  return (
    <OverlayTrigger
      trigger="click"
      placement="bottom"
      overlay={TransferSolPopover({ pubKey })}
      rootClose
    >
      <Button
        disabled={pubKey === undefined || status !== NetStatus.Running}
        variant="success"
      >
        Transfer SOL
      </Button>
    </OverlayTrigger>
  );
}

export default TransferSolButton;
