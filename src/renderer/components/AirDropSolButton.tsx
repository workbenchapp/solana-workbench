import { useEffect, useState } from 'react';
import { Col, Row } from 'react-bootstrap';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';
import { toast } from 'react-toastify';

import {
  NetStatus,
  selectValidatorNetworkState,
} from '../data/ValidatorNetwork/validatorNetworkState';

import { airdropSol } from '../data/accounts/account';
import { useAppSelector } from '../hooks';

function AirDropPopover(props: { pubKey: string | undefined }) {
  const { pubKey } = props;
  const { net } = useAppSelector(selectValidatorNetworkState);

  let pubKeyVal = pubKey;
  if (!pubKeyVal) {
    pubKeyVal = 'paste';
  }

  const [sol, setSol] = useState<string>('0.01');
  const [toKey, setToKey] = useState<string>(pubKeyVal);

  useEffect(() => {
    if (pubKeyVal) {
      setToKey(pubKeyVal);
    }
  }, [pubKeyVal]);

  return (
    <Popover id="popover-basic">
      <Popover.Header as="h3">Airdrop SOL</Popover.Header>
      <Popover.Body>
        <Form>
          <Form.Group as={Row} className="mb-3" controlId="formSOLAmount">
            <Form.Label column sm={3}>
              SOL
            </Form.Label>
            <Col sm={9}>
              <Form.Control
                type="number"
                placeholder="Select amount of SOL to AirDrop"
                value={sol}
                onChange={(e) => setSol(e.target.value)}
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
              <Form.Text className="text-muted" />
            </Col>
          </Form.Group>

          <Form.Group as={Row} className="mb-3">
            <Col sm={{ span: 10, offset: 2 }}>
              <Button
                type="button"
                onClick={() => {
                  document.body.click();
                  toast.promise(airdropSol(net, toKey, sol), {
                    pending: 'Airdrop submitted',
                    success: 'Airdrop succeeded 👌',
                    error: 'Airdrop failed 🤯',
                  });
                }}
              >
                Submit Airdrop
              </Button>
            </Col>
          </Form.Group>
        </Form>
      </Popover.Body>
    </Popover>
  );
}

function AirDropSolButton(props: { pubKey: string | undefined }) {
  const { pubKey } = props;
  const { status } = useAppSelector(selectValidatorNetworkState);

  return (
    <OverlayTrigger
      trigger="click"
      placement="bottom"
      overlay={AirDropPopover({ pubKey })}
      rootClose
    >
      <Button
        size="sm"
        disabled={pubKey === undefined || status !== NetStatus.Running}
        variant="success"
      >
        Airdrop SOL
      </Button>
    </OverlayTrigger>
  );
}

export default AirDropSolButton;
