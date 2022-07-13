import { useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { Col, Row } from 'react-bootstrap';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';

function WatchAcountPopover(props: {
  pinAccount: (pk: string, b: boolean) => void;
}) {
  const { pinAccount } = props;

  const pubKeyVal = '';

  const [toKey, setToKey] = useState<string>(pubKeyVal);
  const [validationError, setValidationErr] = useState('');

  useEffect(() => {
    if (pubKeyVal) {
      setToKey(pubKeyVal);
    }
  }, [pubKeyVal]);

  useEffect(() => {
    if (!toKey) {
      setValidationErr('');
      return;
    }
    // validate public key
    try {
      PublicKey.isOnCurve(toKey);
      setValidationErr('');
    } catch (err) {
      setValidationErr('Invalid key');
      console.log(err);
    }
  }, [toKey]);

  return (
    <Popover id="popover-basic">
      <Popover.Header as="h3">Watch Account</Popover.Header>
      <Popover.Body>
        <Form>
          <Form.Group as={Row} className="mb-8" controlId="formToAccount">
            <Form.Label column sm={3}>
              Public Key
            </Form.Label>
            <Col sm={9}>
              <Form.Control
                type="text"
                placeholder="enter key"
                value={toKey}
                onChange={(e) => setToKey(e.target.value)}
              />
              {validationError ? (
                <Form.Control.Feedback
                  type="invalid"
                  className="text-red-400 text-xs"
                >
                  {validationError}
                </Form.Control.Feedback>
              ) : (
                <></>
              )}
              <Form.Text className="text-muted" />
            </Col>
          </Form.Group>

          <Form.Group as={Row} className="mb-3">
            <Col sm={{ span: 10, offset: 2 }}>
              <Button
                type="button"
                disabled={!!validationError || !toKey}
                onClick={() => {
                  pinAccount(toKey, false);
                }}
              >
                Watch
              </Button>
            </Col>
          </Form.Group>
        </Form>
      </Popover.Body>
    </Popover>
  );
}

function WatchAccountButton(props: {
  pinAccount: (pk: string, b: boolean) => void;
}) {
  const { pinAccount } = props;

  return (
    <OverlayTrigger
      trigger="click"
      placement="bottom"
      overlay={WatchAcountPopover({ pinAccount })}
      rootClose
    >
      <Button variant="success" size="sm">
        Watch
      </Button>
    </OverlayTrigger>
  );
}

export default WatchAccountButton;
