import { useState } from 'react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { Row, Col } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import * as metaplex from '@metaplex/js';
import * as sol from '@solana/web3.js';

import { useQuery } from 'react-query';
import { queryTokenMetadata } from '../../data/accounts/getAccount';
import { useAppSelector } from '../../hooks';

import {
  NetStatus,
  selectValidatorNetworkState,
} from '../../data/ValidatorNetwork/validatorNetworkState';

const logger = window.electron.log;

function DataPopover(props: { mintPubKey: sol.PublicKey }) {
  const { mintPubKey } = props;
  const selectedWallet = useWallet();
  const { connection } = useConnection();
  const { net } = useAppSelector(selectValidatorNetworkState);

  const pubKey = mintPubKey.toString();
  const {
    status: loadStatus,
    // error,
    data: metaData,
  } = useQuery<metaplex.programs.metadata.Metadata | undefined, Error>(
    ['token-mint-meta', { net, pubKey }],
    queryTokenMetadata,
    {}
  );

  const [name, setName] = useState<string>(
    metaData?.data?.data.name || 'Workbench token'
  );
  const [symbol, setSymbol] = useState<string>(
    metaData?.data?.data.symbol || 'WORKBENCH'
  );
  const [uri, setUri] = useState<string>(
    metaData?.data?.data.uri ||
      'https://github.com/workbenchapp/solana-workbench/'
  );
  const [sellerFeeBasisPoints, setSellerFeeBasisPoints] = useState<number>(
    metaData?.data?.data.sellerFeeBasisPoints || 10
  );

  if (loadStatus !== 'success' && loadStatus !== 'error') {
    return <b>loading</b>;
  }

  async function createOurMintMetadata() {
    // Create a new token
    logger.info('createOurMintMetadata', mintPubKey);
    if (!mintPubKey) {
      return;
    }
    try {
      const metadata = new metaplex.programs.metadata.MetadataDataData({
        name,
        symbol,
        uri,
        sellerFeeBasisPoints,
        creators: null, // TODO:
      });

      if (metaData && metaData.data.mint === mintPubKey.toString()) {
        // https://github.com/metaplex-foundation/js/blob/a4274ec97c6599dbfae8860ae2edc03f49d35d68/src/actions/updateMetadata.ts
        const meta = await metaplex.actions.updateMetadata({
          connection,
          wallet: selectedWallet,
          editionMint: mintPubKey,
          /** An optional new {@link MetadataDataData} object to replace the current data. This will completely overwrite the data so all fields must be set explicitly. * */
          newMetadataData: metadata,
          //   newUpdateAuthority?: PublicKey,
          //   /** This parameter can only be set to true once after which it can't be reverted to false **/
          //   primarySaleHappened?: boolean,
        });
        logger.info('update metadata', meta);
      } else {
        // https://github.com/metaplex-foundation/js/blob/a4274ec97c6599dbfae8860ae2edc03f49d35d68/src/actions/createMetadata.ts#L32
        const meta = await metaplex.actions.createMetadata({
          connection,
          wallet: selectedWallet,
          editionMint: mintPubKey,
          metadataData: metadata,
        });
        logger.info('create metadata', meta);
      }

      // const meta = metaplex.programs.metadata.Metadata.load(conn, tokenPublicKey);
    } catch (e) {
      logger.error('metadata create', e);
      throw e;
    }
  }

  return (
    <Popover id="popover-basic">
      <Popover.Header as="h3">Metaplex token metadata</Popover.Header>
      <Popover.Body>
        <Form>
          <Form.Group as={Row} className="mb-3" controlId="formTokenName">
            <Form.Label column sm={3}>
              Name
            </Form.Label>
            <Col sm={9}>
              <Form.Control
                type="text"
                placeholder="Token Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Form.Text className="text-muted" />
            </Col>
          </Form.Group>
          <Form.Group as={Row} className="mb-3" controlId="formTokenSymbol">
            <Form.Label column sm={3}>
              Symbol
            </Form.Label>
            <Col sm={9}>
              <Form.Control
                type="text"
                placeholder="Token Symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
              />
              <Form.Text className="text-muted" />
            </Col>
          </Form.Group>
          <Form.Group as={Row} className="mb-3" controlId="formTokenUri">
            <Form.Label column sm={3}>
              Uri
            </Form.Label>
            <Col sm={9}>
              <Form.Control
                type="text"
                placeholder="Token Uri"
                value={uri}
                onChange={(e) => setUri(e.target.value)}
              />
              <Form.Text className="text-muted" />
            </Col>
          </Form.Group>

          <Form.Group
            as={Row}
            className="mb-3"
            controlId="formSellerFeeBasisPoints"
          >
            <Form.Label column sm={3}>
              Sellr basis points
            </Form.Label>
            <Col sm={9}>
              <Form.Control
                type="number"
                placeholder="Sller basis points"
                value={sellerFeeBasisPoints}
                onChange={(e) => setSellerFeeBasisPoints(e.target.value)}
              />
              {/* TODO: check to see if the from Account has enough, including TX costs if its to come from them */}
              {/* TODO: add a MAX button */}
              <Form.Text className="text-muted" />
            </Col>
          </Form.Group>

          <Form.Group as={Row} className="mb-3">
            <Col sm={{ span: 10, offset: 2 }}>
              <Button
                type="button"
                onClick={() => {
                  document.body.click();
                  toast.promise(createOurMintMetadata(), {
                    pending: 'Add mint metadata submitted',
                    success: 'Add mint metadata succeeded 👌',
                    error: {
                      render({ data }) {
                        // eslint-disable-next-line no-console
                        console.log('error', data);
                        // When the promise reject, data will contains the error
                        return 'Error modifying mint metadata';
                      },
                    },
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

function MetaplexTokenDataButton(props: {
  mintPubKey: sol.PublicKey | undefined;
  disabled: boolean;
}) {
  const { mintPubKey, disabled } = props;
  const { status } = useAppSelector(selectValidatorNetworkState);

  return (
    <OverlayTrigger
      trigger="click"
      placement="bottom"
      overlay={DataPopover({ mintPubKey })}
      rootClose
    >
      <Button
        size="sm"
        disabled={
          disabled || mintPubKey === undefined || status !== NetStatus.Running
        }
        variant="success"
      >
        Edit Metaplex data
      </Button>
    </OverlayTrigger>
  );
}

export default MetaplexTokenDataButton;
