import { useEffect, useState } from 'react';
import Stack from 'react-bootstrap/Stack';
import { Row, Col } from 'react-bootstrap';
import Button from 'react-bootstrap/Button';

import * as sol from '@solana/web3.js';

import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  setAuthority,
  transfer,
} from '@solana/spl-token';
import { toast } from 'react-toastify';
import { useAppSelector } from '../hooks';
import {
  netToURL,
  selectValidatorNetworkState,
} from '../data/ValidatorNetwork/validatorNetworkState';
import AccountView from '../components/AccountView';

// eslint-disable-next-line no-global-assign
Buffer = require('buffer').Buffer;

const logger = window.electron.log;

function TokenView() {
  const validator = useAppSelector(selectValidatorNetworkState);
  const { net } = validator;

  // TODO: this will come from main config...
  const [myWallet, updateWallet] = useState<sol.Keypair>();
  const [mintKey, updateMintKey] = useState<sol.PublicKey>();
  const [tokenSender, updateTokenSender] = useState<sol.PublicKey>();
  const [tokenReceiver, updateTokenReceiver] = useState<sol.Keypair>();
  const [ataReceiver, updateAtaReceiver] = useState<sol.PublicKey>();

  async function prepareFundingWallet() {
    if (!myWallet) {
      // TODO: i wonder if this is sharing a connection under the hood, or if we should be...
      const solConn = new sol.Connection(netToURL(net), 'confirmed');

      // Generate a new wallet keypair and airdrop SOL
      const fromWallet = sol.Keypair.generate();
      updateWallet(fromWallet);
      const fromAirdropSignature = await solConn.requestAirdrop(
        fromWallet.publicKey,
        LAMPORTS_PER_SOL
      );
      // Wait for airdrop confirmation
      await solConn.confirmTransaction(fromAirdropSignature);
    }
  }
  async function createOurMint() {
    if (!myWallet) {
      logger.info('no myWallet', myWallet);
      return;
    }

    // Create a new token
    logger.info('createMint', myWallet);
    const solConn = new sol.Connection(netToURL(net), 'confirmed');
    const mint = await createMint(
      solConn,
      myWallet, // Payer of the transaction
      myWallet.publicKey, // Account that will control the minting
      null, // Account that will control the freezing of the token
      0 // Location of the decimal place
    );
    updateMintKey(mint);
  }
  async function ensuremyAta() {
    if (!myWallet) {
      logger.info('no myWallet', myWallet);
      return;
    }
    if (!mintKey) {
      logger.info('no mintKey', mintKey);
      return;
    }

    // Get the token account of the fromWallet Solana address. If it does not exist, create it.
    logger.info('getOrCreateAssociatedTokenAccount');
    const solConn = new sol.Connection(netToURL(net), 'confirmed');

    try {
      const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
        solConn,
        myWallet,
        mintKey,
        myWallet.publicKey
      );
      updateTokenSender(fromTokenAccount.address);
    } catch (e) {
      logger.error(e, 'getOrCreateAssociatedTokenAccount ensuremyAta');
    }
  }
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
    const solConn = new sol.Connection(netToURL(net), 'confirmed');

    const toWallet = sol.Keypair.generate();
    updateTokenReceiver(toWallet);

    // Get the token account of the toWallet Solana address. If it does not exist, create it.
    logger.info('getOrCreateAssociatedTokenAccount');
    try {
      const toTokenAccount = await getOrCreateAssociatedTokenAccount(
        solConn,
        myWallet,
        mintKey,
        toWallet.publicKey
      );
      updateAtaReceiver(toTokenAccount.address);
    } catch (e) {
      logger.error(e, 'getOrCreateAssociatedTokenAccount ensureReceiverAta');
    }
  }
  async function mintToken() {
    if (!myWallet) {
      logger.info('no myWallet', myWallet);
      return;
    }
    if (!mintKey) {
      logger.info('no mintKey', mintKey);
      return;
    }
    if (!tokenSender) {
      logger.info('no tokenSender', tokenSender);
      return;
    }
    const solConn = new sol.Connection(netToURL(net), 'confirmed');

    // Minting 1 new token to the "fromTokenAccount" account we just returned/created.
    const signature = await mintTo(
      solConn,
      myWallet, // Payer of the transaction fees
      mintKey, // Mint for the account
      tokenSender, // Address of the account to mint to
      myWallet.publicKey, // Minting authority
      1 // Amount to mint
    );
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
    const solConn = new sol.Connection(netToURL(net), 'confirmed');

    await setAuthority(
      solConn,
      myWallet, // Payer of the transaction fees
      mintKey, // Account
      myWallet.publicKey, // Current authority
      0, // Authority type: "0" represents Mint Tokens
      null // Setting the new Authority to null
    );
  }
  async function transferTokenToReceiver() {
    if (!myWallet) {
      logger.info('no myWallet', myWallet);
      return;
    }
    if (!tokenSender) {
      logger.info('no tokenSender', tokenSender);
      return;
    }
    if (!ataReceiver) {
      logger.info('no ataReceiver', ataReceiver);
      return;
    }
    const solConn = new sol.Connection(netToURL(net), 'confirmed');

    const signature = await transfer(
      solConn,
      myWallet, // Payer of the transaction fees
      tokenSender, // Source account
      ataReceiver, // Destination account
      myWallet.publicKey, // Owner of the source account
      1 // Number of tokens to transfer
    );

    logger.info('SIGNATURE', signature);
  }

  return (
    <Stack className="almost-vh-100">
      <Row>
        <Col>
          List of buttons for each step? or maybe just a set of tabs that lets
          the user do the steps in order, or whatever they like...
        </Col>
      </Row>
      <Row>
        <Col>
          <Button
            disabled={myWallet !== undefined}
            onClick={() => {
              prepareFundingWallet();
            }}
          >
            create and fund initiating account account
          </Button>
          <Button
            disabled={myWallet === undefined || mintKey !== undefined}
            onClick={() => {
              createOurMint();
            }}
          >
            initialize mint
          </Button>
          <Button
            disabled={
              myWallet === undefined ||
              mintKey === undefined ||
              tokenSender !== undefined
            }
            onClick={() => {
              ensuremyAta();
            }}
          >
            create initiating account ATA for this mint
          </Button>
          <Button
            disabled={
              myWallet === undefined ||
              mintKey === undefined ||
              tokenReceiver !== undefined
            }
            onClick={() => {
              ensureReceiverAta();
            }}
          >
            create receiver account and ATA account
          </Button>
          <Button
            disabled={
              myWallet === undefined ||
              mintKey === undefined ||
              tokenSender === undefined
            }
            onClick={() => {
              mintToken();
            }}
          >
            mint token to funder
          </Button>
          <Button
            disabled={
              myWallet === undefined ||
              tokenSender === undefined ||
              ataReceiver === undefined
            }
            onClick={() => {
              transferTokenToReceiver();
            }}
          >
            send token to receiver
          </Button>
          <Button
            disabled={myWallet === undefined || mintKey === undefined}
            onClick={() => {
              closeMint();
            }}
          >
            Set max supply (aka, close mint)
          </Button>
        </Col>
      </Row>

      <Row className="flex-fill almost-vh-80">
        <Col className="col-md-4 almost-vh-100 vscroll">
          User Account (Fee payer, mint owner):
          {myWallet?.secretKey.toString()}
          Make it a dropdown of all the ones we have...
          <AccountView pubKey={myWallet?.publicKey?.toString()} />
        </Col>
        <Col className="col-md-4 almost-vh-100 vscroll">
          Token Mint
          <AccountView pubKey={mintKey?.toString()} />
        </Col>
        <Col className="col-md-4 almost-vh-100 vscroll">
          tokenReceiver:
          {tokenReceiver?.secretKey?.toString()}
          ATA:
          {ataReceiver?.toString()}
          <AccountView pubKey={tokenReceiver?.publicKey?.toString()} />
        </Col>
      </Row>
    </Stack>
  );
}

export default TokenView;
