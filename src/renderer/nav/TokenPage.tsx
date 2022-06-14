import { useState } from 'react';
import Stack from 'react-bootstrap/Stack';
import { Row, Col } from 'react-bootstrap';
import Button from 'react-bootstrap/Button';

import * as sol from '@solana/web3.js';
import * as metaplex from '@metaplex/js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

import { toast } from 'react-toastify';
import createNewAccount from 'renderer/data/accounts/account';
import WatchAccountButton from 'renderer/components/WatchAccountButton';
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
  const [tokenSender, updateFunderATA] = useState<sol.PublicKey>();
  const [tokenReceiver, updateTokenReceiver] = useState<sol.Keypair>();
  const [ataReceiver, updateAtaReceiver] = useState<sol.PublicKey>();

  const setMintPubKey = (pubKey: string) => {
    const key = new sol.PublicKey(pubKey);

    const edkey: sol.Ed25519Keypair = {
      publicKey: key.toBytes(),
      secretKey: key.toBytes(),
    };
    const kp = new sol.Keypair(edkey);
    if (kp) {
      updateMintKey(kp);
      updateFunderATA(undefined);
      updateAtaReceiver(undefined);
    }
  };

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
      const fromTokenAccount =
        await walletWeb3.getOrCreateAssociatedTokenAccount(
          connection,
          fromKey,
          mintKey.publicKey,
          myWallet
        );
      updateFunderATA(fromTokenAccount.address);
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
    const signature = await walletWeb3.mintTo(
      connection,
      fromKey, // Payer of the transaction fees
      mintKey.publicKey, // Mint for the account
      tokenSender, // Address of the account to mint to
      myWallet, // Minting authority
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

    await walletWeb3.setAuthority(
      connection,
      fromKey, // Payer of the transaction fees
      mintKey.publicKey, // Account
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
    if (!tokenSender) {
      logger.info('no tokenSender', tokenSender);
      return;
    }
    if (!mintKey) {
      logger.info('no mintKey', mintKey);
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
        mintKey.publicKey,
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
      tokenSender, // Source account
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
          <Button
            // TODO: need to auto-detect that it already exists?
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
            Ensure ATA account
          </Button>
          <Button
            disabled={
              myWallet === undefined ||
              mintKey === undefined ||
              tokenSender === undefined
            }
            onClick={() => {
              toast.promise(mintToken(), {
                pending: `Mint To ${myWallet?.toString()} submitted`,
                success: `Mint To ${myWallet?.toString()} succeeded 👌`,
                error: `Mint To ${myWallet?.toString()}  failed 🤯`,
              });
            }}
          >
            mint token to funder
          </Button>
          <AccountView pubKey={myWallet?.toString()} />
        </Col>
        <Col className="col-md-4 almost-vh-100 vscroll">
          Token Mint
          <WatchAccountButton pinAccount={setMintPubKey} />
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
            create mint keypair
          </Button>
          <Button
            // TODO: this button should be disabled if the selected mint (or account) exists
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
            disabled={true || myWallet === undefined || mintKey === undefined}
            onClick={() => {
              toast.promise(createOurMintMetadata(), {
                pending: `Add mint metadata submitted`,
                success: `Add mint metadata  succeeded 👌`,
                error: `Add mint metadata   failed 🤯`,
              });
            }}
          >
            add metadata
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
          <AccountView pubKey={mintKey?.publicKey.toString()} />
          <div>
            <TokenMetaView
              mintKey={mintKey ? mintKey.publicKey.toString() : ''}
            />
          </div>
        </Col>
        <Col className="col-md-4 almost-vh-100 vscroll">
          non-funder account
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
            disabled={myWallet === undefined || tokenSender === undefined}
            onClick={() => {
              toast.promise(transferTokenToReceiver(), {
                pending: `Transfer token To ${ataReceiver?.toString()} submitted`,
                success: `Transfer token To ${ataReceiver?.toString()} succeeded 👌`,
                error: `Transfer token To ${ataReceiver?.toString()}  failed 🤯`,
              });
            }}
          >
            mint token to receiver
          </Button>
          <AccountView pubKey={tokenReceiver?.publicKey?.toString()} />
        </Col>
      </Row>
    </Stack>
  );
}

export default TokenPage;
