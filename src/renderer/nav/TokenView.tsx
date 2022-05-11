import { useEffect, useState } from 'react';
import Container from 'react-bootstrap/Container';
import { Row, Col } from 'react-bootstrap';
import Button from 'react-bootstrap/Button';

import * as sol from '@solana/web3.js';

import {
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  setAuthority,
  transfer,
} from '@solana/spl-token';
import { useAppSelector } from '../hooks';
import {
  netToURL,
  selectValidatorNetworkState,
} from '../data/ValidatorNetwork/validatorNetworkState';
import { toast } from 'react-toastify';

Buffer = require("buffer").Buffer;

const logger = window.electron.log;

function TokenView() {
  const validator = useAppSelector(selectValidatorNetworkState);
  const { net } = validator;

  // TODO: this will come from main config...
  const [myWallet, updateWallet] = useState<sol.Keypair>();
  const [mintKey, updateMintKey] = useState<sol.PublicKey>();
  const [tokenReceiver, updateTokenReceiver] = useState<sol.Keypair>();
  const [ataReceiver, updateAtaReceiver] = useState<sol.PublicKey>();



  async function makeToken() {
    // TODO: i wonder if this is sharing a connection under the hood, or if we should be...
    const solConn = new sol.Connection(netToURL(net), 'confirmed');

    if (!myWallet) {
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
    if (!myWallet) {
      logger.info("no myWallet", myWallet)
      return;
    }
  
    // Create a new token
    logger.info("createMint", myWallet)
    const mint = await createMint(
      solConn,
      myWallet, // Payer of the transaction
      myWallet.publicKey, // Account that will control the minting
      null, // Account that will control the freezing of the token
      0 // Location of the decimal place
    );
    updateMintKey(mint);
  
    // Get the token account of the fromWallet Solana address. If it does not exist, create it.
    logger.info("getOrCreateAssociatedTokenAccount")
    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
      solConn,
      myWallet,
      mint,
      myWallet.publicKey
    );
  
    // Generate a new wallet to receive the newly minted token
    const toWallet = sol.Keypair.generate();
    updateTokenReceiver(toWallet);
  
    // Get the token account of the toWallet Solana address. If it does not exist, create it.
    logger.info("getOrCreateAssociatedTokenAccount")
    const toTokenAccount = await getOrCreateAssociatedTokenAccount(
      solConn,
      myWallet,
      mint,
      toWallet.publicKey
    );
    updateAtaReceiver(toTokenAccount.address);
  
    // Minting 1 new token to the "fromTokenAccount" account we just returned/created.
    let signature = await mintTo(
      solConn,
      myWallet, // Payer of the transaction fees
      mint, // Mint for the account
      fromTokenAccount.address, // Address of the account to mint to
      myWallet.publicKey, // Minting authority
      1 // Amount to mint
    );
  
    await setAuthority(
      solConn,
      myWallet, // Payer of the transaction fees
      mint, // Account
      myWallet.publicKey, // Current authority
      0, // Authority type: "0" represents Mint Tokens
      null // Setting the new Authority to null
    );
  
    signature = await transfer(
      solConn,
      myWallet, // Payer of the transaction fees
      fromTokenAccount.address, // Source account
      toTokenAccount.address, // Destination account
      myWallet.publicKey, // Owner of the source account
      1 // Number of tokens to transfer
    );
  
    console.log('SIGNATURE', signature);
  }

  return (
    <Container fluid>
      <Row>
        <Col>
          List of buttons for each step? or maybe just a set of tabs that lets
          the user do the steps in order, or whatever they like...
        </Col>
      </Row>
      <Row>
        <Col>
          <Button disabled={myWallet !== undefined}
          onClick={() => {
            makeToken();
          }}>create and fund initiating account account</Button>
          <Button>create mint account</Button>
          <Button>initialize mint</Button>
          <Button>create mint metadata account</Button>
          <Button>create ATA account for receiver</Button>
          <Button>mint token to receiver</Button>
          <Button>Set max supply (aka, close mint)</Button>
        </Col>
      </Row>

      <Row>
        <Col>Current User Account:</Col>
        <Col>
        {myWallet?.publicKey.toString()} - 
        {myWallet?.secretKey.toString()}
        Make it a dropdown of all the ones we have...
        </Col>
        <Col>Mint Pubkey: {mintKey?.toString()}</Col>
        <Col>
        tokenReceiver: 
        {tokenReceiver?.publicKey.toString()} - 
        {tokenReceiver?.secretKey.toString()}
        </Col>
        <Col>ATA: 
        {ataReceiver?.toString()} - 
        </Col>
        
      </Row>
      <Row>List my account's tokens...</Row>
    </Container>
  );
}

export default TokenView;
