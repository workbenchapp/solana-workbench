import React, { useEffect, useState } from 'react';
import Split from 'react-split';

import Stack from 'react-bootstrap/Stack';
import { Row, Col, Form, Accordion } from 'react-bootstrap';
import Button from 'react-bootstrap/Button';

import * as sol from '@solana/web3.js';
import * as spltoken from '@solana/spl-token';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';

import { toast } from 'react-toastify';
import { MetaplexMintMetaDataView } from '../components/tokens/MetaplexMintMetaDataView';
import {
  NetStatus,
  selectValidatorNetworkState,
} from '../data/ValidatorNetwork/validatorNetworkState';
import MetaplexTokenDataButton from '../components/tokens/MetaplexTokenData';
import { getTokenAccounts } from '../data/accounts/getAccount';
import { useAppSelector } from '../hooks';
import AccountView from '../components/AccountView';
import { closeMint, MintInfoView } from '../components/MintInfoView';
import CreateNewMintButton, {
  ensureAtaFor,
} from '../components/tokens/CreateNewMintButton';

import { logger } from '../common/globals';

function TokenPage() {
  const fromKey = useWallet();
  const { connection } = useConnection();
  const { net, status } = useAppSelector(selectValidatorNetworkState);

  // TODO: this will come from main config...
  const [mintList, updateMintList] = useState<sol.PublicKey[]>([]);
  const [mintKey, updateMintKey] = useState<sol.PublicKey>();

  const setMintPubKey = (pubKey: string | sol.PublicKey) => {
    const key = new sol.PublicKey(pubKey);

    updateMintKey(key);
  };
  useEffect(() => {
    if (status !== NetStatus.Running) {
      return;
    }
    if (!fromKey.publicKey) {
      return;
    }
    if (mintList.length > 0) {
      // TODO: need to work out when to refresh
      return;
    }
    getTokenAccounts(net, fromKey.publicKey.toString())
      .then((ATAs) => {
        const mints: sol.PublicKey[] = [];
        let addMintKey = true;
        ATAs.value.map((ATA) => {
          const accountState = ATA.account.data.parsed.info as spltoken.Account;

          mints.push(accountState.mint);
          if (accountState.mint === mintKey) {
            addMintKey = false;
          }
          return mints;
        });
        if (addMintKey && mintKey) {
          mints.push(mintKey);
        }

        updateMintList(mints);
        if (mints.length > 0) {
          setMintPubKey(mints[0].toString());
        }
        return mints;
      })
      .catch(logger.error);
  }, [fromKey.publicKey, mintKey, mintList.length, net, status]);

  const { publicKey } = fromKey;
  if (!publicKey) {
    return <div>Loading wallet</div>;
  }
  const myWallet = publicKey;

  return (
    <Stack className="almost-vh-100">
      <Row>
        <Col />
      </Row>

      <Row className="flex-fill almost-vh-80">
        <Split
          sizes={[50, 50]}
          direction="horizontal"
          className="flex-1 w-full flex"
          gutterSize={5}
        >
          <Col className="col-md-6 almost-vh-100 vscroll">
            Our Wallet
            <AccountView pubKey={myWallet?.toString()} />
          </Col>
          <Col className="col-md-6 almost-vh-100 vscroll">
            Token Mint
            <Form.Select
              aria-label="Default select example"
              onChange={(value) => setMintPubKey(value.target.value)}
            >
              {mintList.map((key) => {
                const sel = key === mintKey;
                return (
                  <option selected={sel} value={key.toString()}>
                    {key.toString()}
                  </option>
                );
              })}
            </Form.Select>
            <CreateNewMintButton
              disabled={false}
              connection={connection}
              fromKey={fromKey}
              myWallet={myWallet}
              andThen={(newMint: sol.PublicKey) => {
                setMintPubKey(newMint);
                ensureAtaFor(connection, fromKey, newMint, myWallet); // needed as we create the Mintlist using the ATA's the user wallet has ATA's for...
                updateMintList([]);
                return newMint;
              }}
            />
            <MetaplexTokenDataButton mintPubKey={mintKey} />
            <Button
              size="sm"
              disabled={myWallet === undefined || mintKey === undefined}
              onClick={() => {
                if (!mintKey) {
                  return;
                }
                toast.promise(
                  closeMint(connection, fromKey, mintKey, myWallet),
                  {
                    pending: `Close mint account submitted`,
                    success: `Close mint account  succeeded 👌`,
                    error: `Close mint account   failed 🤯`,
                  }
                );
              }}
            >
              Set max supply (aka, close mint)
            </Button>
            <AccountView pubKey={mintKey?.toString()} />
            <Accordion>
              <MintInfoView mintKey={mintKey ? mintKey.toString() : ''} />
            </Accordion>
            <Accordion>
              <MetaplexMintMetaDataView
                mintKey={mintKey ? mintKey.toString() : ''}
              />{' '}
            </Accordion>
          </Col>
        </Split>
      </Row>
    </Stack>
  );
}

export default TokenPage;
