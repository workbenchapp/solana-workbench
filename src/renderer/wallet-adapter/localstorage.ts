/* eslint-disable no-underscore-dangle */
// code style from solana-labs/wallet-adapter

/*  eslint-disable max-classes-per-file */

import {
  BaseMessageSignerWalletAdapter,
  EventEmitter,
  SendTransactionOptions,
  WalletDisconnectedError,
  WalletDisconnectionError,
  WalletName,
  WalletNotConnectedError,
  WalletNotReadyError,
  WalletReadyState,
  WalletSignTransactionError,
} from '@solana/wallet-adapter-base';
import * as sol from '@solana/web3.js';
import * as bip39 from 'bip39';
import { saveState, loadState } from '../data/localstorage';

interface LocalStorageWalletEvents {
  connect(...args: unknown[]): unknown;
  disconnect(...args: unknown[]): unknown;
}

interface LocalStorageWallet extends EventEmitter<LocalStorageWalletEvents> {
  isLocalStorage?: boolean;
  publicKey?: { toBytes(): Uint8Array };
  isConnected: boolean;
  signTransaction(transaction: sol.Transaction): Promise<sol.Transaction>;
  signAllTransactions(
    transactions: sol.Transaction[]
  ): Promise<sol.Transaction[]>;
  signAndSendTransaction(
    transaction: sol.Transaction,
    options?: sol.SendOptions
  ): Promise<{ signature: sol.TransactionSignature }>;
  signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  _handleDisconnect(...args: unknown[]): unknown;
}

/*
  TODO: there's a bunch of things that should be done to this over the next months:
  1. Make a second (and prefered) WalletProvider that creates, sotres and signs transactions on the electron main app, and uses IPC to communicate back to the render app
2. Make a third (and prefered again :) Wallet Provider that creates, stores and signs transactions in a totally separate program (presumably our go service with systray)
3. and keep iterating until the user has a secure account magically created for them...
*/

class LocalStorageWalletProvider implements LocalStorageWallet {
  isLocalStorage = true;

  isConnected = false;

  endpoint: string;

  account: sol.Keypair;

  constructor(config: LocalStorageWalletAdapterConfig) {
    this.endpoint = config.endpoint;
    this.account = config.account;
  }

  signTransaction = async (transaction: sol.Transaction) => {
    transaction.partialSign(this.account);
    return transaction;
  };

  signAllTransactions = async (
    transactions: sol.Transaction[]
  ): Promise<sol.Transaction[]> => {
    return transactions;
  };

  signAndSendTransaction = async (
    transaction: sol.Transaction,
    options?: sol.SendOptions
  ): Promise<{ signature: sol.TransactionSignature }> => {
    const connection = new sol.Connection(this.endpoint);

    transaction.recentBlockhash = (
      await connection.getRecentBlockhash('max')
    ).blockhash;
    // transaction.setSigners(
    //   // fee payed by the wallet owner
    //   this.publicKey,
    //   ...signers.map((s) => s.publicKey)
    // );

    // if (signers.length > 0) {
    //   transaction.partialSign(...signers);
    // }

    const signedTransaction = await this.signTransaction(transaction);
    const rawTransaction = signedTransaction.serialize();
    const sig = await connection.sendRawTransaction(
      rawTransaction,
      options
      // {
      // skipPreflight,
      // preflightCommitment: 'single',
      // }
    );
    return { signature: sig };
  };

  signMessage = async (
    message: Uint8Array
  ): Promise<{ signature: Uint8Array }> => {};

  connect = async (): Promise<void> => {};

  disconnect = async (): Promise<void> => {};

  _handleDisconnect = (): void => {};
}

// interface LocalStorageWindow extends Window {
//   solana?: LocalStorageWallet;
// }

// declare const window: LocalStorageWindow;

export interface LocalStorageWalletAdapterConfig {
  endpoint: string;
  account: sol.Keypair;
}

export const LocalStorageWalletName =
  'LocalStorage' as WalletName<'LocalStorage'>;

export class LocalStorageWalletAdapter extends BaseMessageSignerWalletAdapter {
  name = LocalStorageWalletName;

  url = 'https://LocalStorage.app';

  icon =
    'data:image/svg+xml;base64,PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjM0IiB3aWR0aD0iMzQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGxpbmVhckdyYWRpZW50IGlkPSJhIiB4MT0iLjUiIHgyPSIuNSIgeTE9IjAiIHkyPSIxIj48c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiM1MzRiYjEiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM1NTFiZjkiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iYiIgeDE9Ii41IiB4Mj0iLjUiIHkxPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZmIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjZmZmIiBzdG9wLW9wYWNpdHk9Ii44MiIvPjwvbGluZWFyR3JhZGllbnQ+PGNpcmNsZSBjeD0iMTciIGN5PSIxNyIgZmlsbD0idXJsKCNhKSIgcj0iMTciLz48cGF0aCBkPSJtMjkuMTcwMiAxNy4yMDcxaC0yLjk5NjljMC02LjEwNzQtNC45NjgzLTExLjA1ODE3LTExLjA5NzUtMTEuMDU4MTctNi4wNTMyNSAwLTEwLjk3NDYzIDQuODI5NTctMTEuMDk1MDggMTAuODMyMzctLjEyNDYxIDYuMjA1IDUuNzE3NTIgMTEuNTkzMiAxMS45NDUzOCAxMS41OTMyaC43ODM0YzUuNDkwNiAwIDEyLjg0OTctNC4yODI5IDEzLjk5OTUtOS41MDEzLjIxMjMtLjk2MTktLjU1MDItMS44NjYxLTEuNTM4OC0xLjg2NjF6bS0xOC41NDc5LjI3MjFjMCAuODE2Ny0uNjcwMzggMS40ODQ3LTEuNDkwMDEgMS40ODQ3LS44MTk2NCAwLTEuNDg5OTgtLjY2ODMtMS40ODk5OC0xLjQ4NDd2LTIuNDAxOWMwLS44MTY3LjY3MDM0LTEuNDg0NyAxLjQ4OTk4LTEuNDg0Ny44MTk2MyAwIDEuNDkwMDEuNjY4IDEuNDkwMDEgMS40ODQ3em01LjE3MzggMGMwIC44MTY3LS42NzAzIDEuNDg0Ny0xLjQ4OTkgMS40ODQ3LS44MTk3IDAtMS40OS0uNjY4My0xLjQ5LTEuNDg0N3YtMi40MDE5YzAtLjgxNjcuNjcwNi0xLjQ4NDcgMS40OS0xLjQ4NDcuODE5NiAwIDEuNDg5OS42NjggMS40ODk5IDEuNDg0N3oiIGZpbGw9InVybCgjYikiLz48L3N2Zz4K';

  private _wallet: LocalStorageWallet | null;

  private _keyPair: sol.Keypair | null = null;

  private _publicKey: sol.PublicKey | null;

  private _connecting: boolean;

  private _readyState: WalletReadyState = WalletReadyState.Installed;

  private _config: LocalStorageWalletAdapterConfig;

  constructor(config: LocalStorageWalletAdapterConfig) {
    super();
    this._connecting = false;
    this._wallet = null;
    this._publicKey = null;
    this._config = config;

    this._readyState = WalletReadyState.Installed;
    this.emit('readyStateChange', this._readyState);
  }

  get publicKey(): sol.PublicKey | null {
    return this._publicKey;
  }

  get connecting(): boolean {
    return this._connecting;
  }

  get connected(): boolean {
    return !!this._wallet?.isConnected;
  }

  get readyState(): WalletReadyState {
    return this._readyState;
  }

  async connect(): Promise<void> {
    if (this.connected || this.connecting) return;
    if (this._readyState !== WalletReadyState.Installed)
      throw new WalletNotReadyError();

    this._connecting = true;

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    //    this._wallet = window!.solana!;

    if (!this._publicKey) {
      // LocalStorage is always connected
      // if we don't yet have an account, generate one, and store it in local storage
      const loaded = loadState('WorkbenchLocalStoreWallet');
      if (loaded) {
        try {
          const seed = await bip39.mnemonicToSeed(loaded);
          // this._keyPair = Keypair.generate();
          this._keyPair = sol.Keypair.fromSeed(seed.slice(0, 32));
        } catch (e) {
          // eslint-disable-next-line no-console
          console.log(`Error loading LocalStorage wallet: ${e}`);
        }
      }
      if (!this._keyPair) {
        const mnemonic = bip39.generateMnemonic();
        const seed = await bip39.mnemonicToSeed(mnemonic);
        // this._keyPair = Keypair.generate();
        this._keyPair = sol.Keypair.fromSeed(seed.slice(0, 32));
        saveState('WorkbenchLocalStoreWallet', mnemonic);
      }
      this._publicKey = this._keyPair.publicKey;
      this._config.account = this._keyPair;
      this._wallet = new LocalStorageWalletProvider(this._config);
      this._wallet.isConnected = true;

      // set this._PublicKey...
      this.emit('connect', this._publicKey);
      this._connecting = false;
    }
  }

  async disconnect(): Promise<void> {
    if (this._wallet) {
      this._wallet.off('disconnect', this._disconnected);

      this._wallet = null;
      this._publicKey = null;

      try {
        await this._wallet.disconnect();
      } catch (error: any) {
        this.emit('error', new WalletDisconnectionError(error?.message, error));
      }
    }
    this.emit('disconnect');
  }

  async sendTransaction(
    transaction: sol.Transaction,
    connection: sol.Connection,
    options?: SendTransactionOptions
  ): Promise<sol.TransactionSignature> {
    try {
      const wallet = this._wallet;
      // LocalStorage doesn't handle partial signers, so if they are provided, don't use `signAndSendTransaction`
      if (wallet && 'signAndSendTransaction' in wallet && !options?.signers) {
        // HACK: LocalStorage's `signAndSendTransaction` should always set these, but doesn't yet
        transaction.feePayer =
          transaction.feePayer || this.publicKey || undefined;
        transaction.recentBlockhash =
          transaction.recentBlockhash ||
          (await connection.getRecentBlockhash('finalized')).blockhash;

        const { signature } = await wallet.signAndSendTransaction(
          transaction,
          options
        );
        return signature;
      }
    } catch (error: any) {
      this.emit('error', error);
      throw error;
    }

    return super.sendTransaction(transaction, connection, options);
  }

  async signTransaction(
    transaction: sol.Transaction
  ): Promise<sol.Transaction> {
    try {
      const wallet = this._wallet;
      if (!wallet) throw new WalletNotConnectedError();

      try {
        return (await wallet.signTransaction(transaction)) || transaction;
      } catch (error: any) {
        throw new WalletSignTransactionError(error?.message, error);
      }
    } catch (error: any) {
      this.emit('error', error);
      throw error;
    }
  }

  async signAllTransactions(
    transactions: sol.Transaction[]
  ): Promise<sol.Transaction[]> {
    try {
      const wallet = this._wallet;
      if (!wallet) throw new WalletNotConnectedError();

      try {
        return (await wallet.signAllTransactions(transactions)) || transactions;
      } catch (error: any) {
        throw new WalletSignTransactionError(error?.message, error);
      }
    } catch (error: any) {
      this.emit('error', error);
      throw error;
    }
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    try {
      const wallet = this._wallet;
      if (!wallet) throw new WalletNotConnectedError();

      try {
        const { signature } = await wallet.signMessage(message);
        return signature;
      } catch (error: any) {
        throw new WalletSignTransactionError(error?.message, error);
      }
    } catch (error: any) {
      this.emit('error', error);
      throw error;
    }
  }

  private _disconnected = () => {
    const wallet = this._wallet;
    if (wallet) {
      wallet.off('disconnect', this._disconnected);

      this._wallet = null;
      this._publicKey = null;

      this.emit('error', new WalletDisconnectedError());
      this.emit('disconnect');
    }
  };
}
