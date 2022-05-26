import { useState } from 'react';
import Stack from 'react-bootstrap/Stack';
import { Row, Col } from 'react-bootstrap';
import Button from 'react-bootstrap/Button';

import * as sol from '@solana/web3.js';
import * as metaplex from '@metaplex/js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

import {
  getOrCreateAssociatedTokenAccount,
  mintTo,
  setAuthority,
  transfer,
} from '@solana/spl-token';
import { toast } from 'react-toastify';
import createNewAccount from 'renderer/data/accounts/account';
import * as walletWeb3 from '../wallet-adapter/web3';
import AccountView from '../components/AccountView';
import { TokenMetaView } from '../components/TokenView';

// eslint-disable-next-line no-global-assign
Buffer = require('buffer').Buffer;

const logger = window.electron.log;

function TokenPage() {
  const fromKey = useWallet();
  const { connection } = useConnection();

  // TODO: this will come from main config...
  const [mintKey, updateMintKey] = useState<sol.Keypair>();
  const [tokenSender, updateTokenSender] = useState<sol.PublicKey>();
  const [tokenReceiver, updateTokenReceiver] = useState<sol.Keypair>();
  const [ataReceiver, updateAtaReceiver] = useState<sol.PublicKey>();

  const { publicKey } = fromKey;
  if (!publicKey) {
    return <div>Loading wallet</div>;
  }
  const myWallet = publicKey;

  async function createOurMintKeypair() {
    if (!mintKey) {
      // TODO: OMFG - the reloadFromMain() causes the wallet to disconnect...
      createNewAccount()
        .then((mint) => {
          updateMintKey(mint);
          return mint;
        })
        .catch(logger.error);
    }
  }
  async function createOurMint() {
    if (!myWallet) {
      logger.info('no myWallet', myWallet);
      return;
    }
    if (!mintKey) {
      logger.info('no myWallet');
      return;
    }

    // Create a new token
    logger.info('createMint', myWallet);
    // https://github.com/solana-labs/solana-program-library/blob/f487f520bf10ca29bf8d491192b6ff2b4bf89710/token/js/src/actions/createMint.ts
    // const mint = await createMint(
    //   connection,
    //   myWallet, // Payer of the transaction
    //   myWallet.publicKey, // Account that will control the minting
    //   null, // Account that will control the freezing of the token
    //   0 // Location of the decimal place
    // );
    const confirmOptions: sol.ConfirmOptions = {
      commitment: 'finalized',
    };
    const mint = await walletWeb3.createMint(
      connection,
      fromKey, // Payer of the transaction
      myWallet, // Account that will control the minting
      null, // Account that will control the freezing of the token
      0, // Location of the decimal place
      mintKey, // mint keypair - will be generated if not specified
      confirmOptions
    );
    logger.info('Minted ', mint);
  }
  async function createOurMintMetadata() {
    if (!myWallet) {
      logger.info('no myWallet', myWallet);
      return;
    }
    if (!mintKey) {
      logger.info('no mintKey', mintKey);
      return;
    }

    // Create a new token
    logger.info('createOurMintMetadata', mintKey);
    try {
      const metadata = new metaplex.programs.metadata.MetadataDataData({
        name: 'Workbench token',
        symbol: 'WORKBENCH',
        uri: 'https://github.com/workbenchapp/solana-workbench/',
        sellerFeeBasisPoints: 10,
        creators: null,
      });

      const meta = await metaplex.actions.createMetadata({
        connection,
        wallet: new metaplex.NodeWallet(myWallet),
        editionMint: mintKey,
        metadataData: metadata,
      });
      logger.info('metadata', meta);
      // const meta = metaplex.programs.metadata.Metadata.load(conn, tokenPublicKey);
    } catch (e) {
      logger.error('metadata create', e);
    }
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

    try {
      const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
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

    const toWallet = sol.Keypair.generate();
    updateTokenReceiver(toWallet);

    // Get the token account of the toWallet Solana address. If it does not exist, create it.
    logger.info('getOrCreateAssociatedTokenAccount');
    try {
      const toTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
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

    // Minting 1 new token to the "fromTokenAccount" account we just returned/created.
    const signature = await mintTo(
      connection,
      myWallet, // Payer of the transaction fees
      mintKey, // Mint for the account
      tokenSender, // Address of the account to mint to
      myWallet.publicKey, // Minting authority
      1 // Amount to mint
    );
    logger.info('SIGNATURE', signature);
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

    await setAuthority(
      connection,
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
    const signature = await transfer(
      connection,
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
            disabled={myWallet === undefined || mintKey !== undefined}
            onClick={() => {
              toast.promise(createOurMintKeypair(), {
                pending: `Create mint keys submitted`,
                success: `Create mint keys  succeeded 👌`,
                error: `Create mint keys   failed 🤯`,
              });
            }}
          >
            initialize mint
          </Button>
          <Button
            disabled={myWallet === undefined || mintKey === undefined}
            onClick={() => {
              toast.promise(createOurMint(), {
                pending: `Create mint account submitted`,
                success: `Create mint account  succeeded 👌`,
                error: `Create mint account   failed 🤯`,
              });
            }}
          >
            initialize mint
          </Button>
          <Button
            disabled={myWallet === undefined || mintKey === undefined}
            onClick={() => {
              toast.promise(createOurMintMetadata(), {
                pending: `Add mint metadata submitted`,
                success: `Add mint metadata  succeeded 👌`,
                error: `Add mint metadata   failed 🤯`,
              });
            }}
          >
            add mint metadata
          </Button>
          <Button
            disabled={
              myWallet === undefined ||
              mintKey === undefined ||
              tokenSender !== undefined
            }
            onClick={() => {
              toast.promise(ensuremyAta(), {
                pending: `Create funder ATA account submitted`,
                success: `Create funder ATA account  succeeded 👌`,
                error: `Create funder ATA account   failed 🤯`,
              });
            }}
          >
            create funder account ATA for this mint
          </Button>
          <Button
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
            create receiver account and ATA account
          </Button>
          <Button
            disabled={
              myWallet === undefined ||
              mintKey === undefined ||
              tokenSender === undefined
            }
            onClick={() => {
              toast.promise(mintToken(), {
                pending: `Mint To ${myWallet?.publicKey.toString()} submitted`,
                success: `Mint To ${myWallet?.publicKey.toString()} succeeded 👌`,
                error: `Mint To ${myWallet?.publicKey.toString()}  failed 🤯`,
              });
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
              toast.promise(transferTokenToReceiver(), {
                pending: `Transfer token To ${ataReceiver?.toString()} submitted`,
                success: `Transfer token To ${ataReceiver?.toString()} succeeded 👌`,
                error: `Transfer token To ${ataReceiver?.toString()}  failed 🤯`,
              });
            }}
          >
            send token to receiver
          </Button>
          <Button
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
        </Col>
      </Row>

      <Row className="flex-fill almost-vh-80">
        <Col className="col-md-4 almost-vh-100 vscroll">
          <AccountView pubKey={myWallet?.toString()} />
        </Col>
        <Col className="col-md-4 almost-vh-100 vscroll">
          Token Mint
          <AccountView pubKey={mintKey?.publicKey.toString()} />
          <div>
            <TokenMetaView
              mintKey={mintKey ? mintKey.publicKey.toString() : ''}
            />
          </div>
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

export default TokenPage;
