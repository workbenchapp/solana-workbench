import { useState, useEffect } from 'react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { Row, Col } from 'react-bootstrap';
import { toast } from 'react-toastify';

import { transferSol } from '../data/accounts/account';

function TransferSolPopover(props: { pubKey: string | undefined }) {
  const { pubKey } = props;

  let pubKeyVal = pubKey;
  if (!pubKeyVal) {
    pubKeyVal = 'paste';
  }

  const [sol, setSol] = useState<string>('0.01');
  const [fromKey, setFromKey] = useState<string>(pubKeyVal);
  const [toKey, setToKey] = useState<string>('');

  useEffect(() => {
    if (pubKeyVal) {
      setFromKey(pubKeyVal);
    }
  }, [pubKeyVal]);

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
                  toast.promise(transferSol(fromKey, toKey, sol), {
                    pending: 'Transfer submitted',
                    success: 'Transfer succeeded 👌',
                    error: 'Transfer failed 🤯',
                  });
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

  return (
    <OverlayTrigger
      trigger="click"
      placement="bottom"
      overlay={TransferSolPopover({ pubKey })}
      rootClose
    >
      <Button variant="success">Transfer SOL</Button>
    </OverlayTrigger>
  );
}

export default TransferSolButton;
