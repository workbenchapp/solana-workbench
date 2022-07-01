import { useEffect, useState } from 'react';
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
import * as walletWeb3 from '../wallet-adapter/web3';
import AccountView from '../components/AccountView';
import { MintInfoView } from '../components/MintInfoView';
import CreateNewMintButton, {
  ensureAtaFor,
} from '@/components/tokens/CreateNewMintButton';

import { logger } from '@/common/globals';
import MintTokenToButton from '@/components/tokens/MintTokenToButton';

function TokenPage() {
  const fromKey = useWallet();
  const { connection } = useConnection();
  const { net, status } = useAppSelector(selectValidatorNetworkState);

  // TODO: this will come from main config...
  const [mintList, updateMintList] = useState<sol.PublicKey[]>([]);
  const [mintKey, updateMintKey] = useState<sol.PublicKey>();
  // const [tokenSender, updateFunderATA] = useState<sol.PublicKey>();
  const [tokenReceiver, updateTokenReceiver] = useState<sol.Keypair>();
  const [ataReceiver, updateAtaReceiver] = useState<sol.PublicKey>();

  const setMintPubKey = (pubKey: string | sol.PublicKey) => {
    const key = new sol.PublicKey(pubKey);

    updateMintKey(key);
    // updateFunderATA(undefined);
    updateAtaReceiver(undefined);
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
  });

  const { publicKey } = fromKey;
  if (!publicKey) {
    return <div>Loading wallet</div>;
  }
  const myWallet = publicKey;

  async function ensureReceiverAta() {
    if (!myWallet) {
      logger.info('no myWallet', myWallet);
      return;
    }
    if (!mintKey) {
      logger.info('no mintKey', mintKey);
      return;
    }
    // Generate a new wallet to receive the newly minted token
    const toWallet = sol.Keypair.generate();
    updateTokenReceiver(toWallet);
  }

  async function closeMint() {
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
  async function transferTokenToReceiver() {
    if (!myWallet) {
      logger.info('no myWallet', myWallet);
      return;
    }
    if (!mintKey) {
      logger.info('no mintKey', mintKey);
      return;
    }
    const funderAta = await ensureAtaFor(
      connection,
      fromKey,
      mintKey,
      myWallet
    );
    if (!funderAta) {
      logger.info('no funderAta', funderAta);
      return;
    }
    if (!tokenReceiver) {
      logger.info('no tokenReceiver', tokenReceiver);
      return;
    }

    // Get the token account of the toWallet Solana address. If it does not exist, create it.
    logger.info('getOrCreateAssociatedTokenAccount');
    try {
      const toTokenAccount = await walletWeb3.getOrCreateAssociatedTokenAccount(
        connection,
        fromKey,
        mintKey,
        tokenReceiver.publicKey
      );
      updateAtaReceiver(toTokenAccount.address);
    } catch (e) {
      logger.error(e, 'getOrCreateAssociatedTokenAccount ensureReceiverAta');
    }

    if (!ataReceiver) {
      logger.info('no ataReceiver', ataReceiver);
      return;
    }
    const signature = await walletWeb3.transfer(
      connection,
      fromKey, // Payer of the transaction fees
      funderAta, // Source account
      ataReceiver, // Destination account
      myWallet, // Owner of the source account
      1 // Number of tokens to transfer
    );
    logger.info('SIGNATURE', signature);
  }

  return (
    <Stack className="almost-vh-100">
      <Row>
        <Col />
      </Row>

      <Row className="flex-fill almost-vh-80">
        <Col className="col-md-4 almost-vh-100 vscroll">
          Our Wallet
          <MintTokenToButton
            connection={connection}
            fromKey={fromKey}
            mintKey={mintKey}
            mintTo={myWallet}
            andThen={(): void => {}}
          />
          <AccountView pubKey={myWallet?.toString()} />
        </Col>
        <Col className="col-md-4 almost-vh-100 vscroll">
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
              toast.promise(closeMint(), {
                pending: `Close mint account submitted`,
                success: `Close mint account  succeeded 👌`,
                error: `Close mint account   failed 🤯`,
              });
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
        <Col className="col-md-4 almost-vh-100 vscroll">
          non-funder account
          <Button
            size="sm"
            disabled={
              myWallet === undefined ||
              mintKey === undefined ||
              tokenReceiver !== undefined
            }
            onClick={() => {
              toast.promise(ensureReceiverAta(), {
                pending: `Create receiver ATA account submitted`,
                success: `Create receiver ATA account  succeeded 👌`,
                error: `Create receiver ATA account   failed 🤯`,
              });
            }}
          >
            create new User account and ATA account
          </Button>
          <Button
            size="sm"
            disabled={myWallet === undefined}
            onClick={() => {
              toast.promise(transferTokenToReceiver(), {
                pending: `Transfer token To ${ataReceiver?.toString()} submitted`,
                success: `Transfer token To ${ataReceiver?.toString()} succeeded 👌`,
                error: `Transfer token To ${ataReceiver?.toString()}  failed 🤯`,
              });
            }}
          >
            transfer token from funder
          </Button>
          <AccountView pubKey={tokenReceiver?.publicKey?.toString()} />
        </Col>
      </Row>
    </Stack>
  );
}

export default TokenPage;