/* eslint-disable no-underscore-dangle */
// code style from solana-labs/wallet-adapter

/*  eslint-disable max-classes-per-file */

/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  BaseMessageSignerWalletAdapter,
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
import {
  netToURL,
  globalNetworkSet,
} from '../data/ValidatorNetwork/validatorNetworkState';

interface ElectronAppStorageWallet {
  isElectronAppStorage?: boolean;
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
  off(_name: string, _func: { (): void; (): void }): void;
}

/*
  TODO: there's a bunch of things that should be done to this over the next months:
  1. Make a second (and prefered) WalletProvider that creates, sotres and signs transactions on the electron main app, and uses IPC to communicate back to the render app
2. Make a third (and prefered again :) Wallet Provider that creates, stores and signs transactions in a totally separate program (presumably our go service with systray)
3. and keep iterating until the user has a secure account magically created for them...
*/

class ElectronAppStorageWalletProvider implements ElectronAppStorageWallet {
  isElectronAppStorage = true;

  isConnected = false;

  account: sol.Keypair;

  constructor(config: ElectronAppStorageWalletAdapterConfig) {
    if (!config.account) {
      throw Error('Wallet account info not ready yet');
    }
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
    const connection = new sol.Connection(netToURL(globalNetworkSet.net));

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
  ): Promise<{ signature: Uint8Array }> => {
    throw new Error(`nope: ${message}`);
  };

  connect = async (): Promise<void> => {};

  disconnect = async (): Promise<void> => {};

  _handleDisconnect = (): void => {};

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  off = (_name: string, _func: { (): void; (): void }): void => {};
}

// interface ElectronAppStorageWindow extends Window {
//   solana?: ElectronAppStorageWallet;
// }

// declare const window: ElectronAppStorageWindow;

export interface ElectronAppStorageWalletAdapterConfig {
  accountFn: () => Promise<sol.Keypair>;
  account?: sol.Keypair;
}

export const ElectronAppStorageWalletName = 'ElectronAppStorage' as WalletName;

export class ElectronAppStorageWalletAdapter extends BaseMessageSignerWalletAdapter {
  name = ElectronAppStorageWalletName;

  url = 'https://ElectronAppStorage.app';

  icon =
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAxMyIgaGVpZ2h0PSIxMDEzIiB2aWV3Qm94PSIwIDAgMTAxMyAxMDEzIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8ZyBmaWx0ZXI9InVybCgjZmlsdGVyMF9kXzBfMSkiPgo8cGF0aCBkPSJNMzcyLjMwNSAxTDQyMi4zMDUgMjg1TDQ5NC4zMDUgMzI3TDU1My4zMDUgMjc3TDUzMS44MDUgMjcxLjVDNTMyLjMwNSAyNjguMTY3IDUzMS45MDUgMjU4LjYgNTI2LjMwNSAyNDdDNTE5LjMwNSAyMzIuNSA1MjcuMzA1IDIxNS41IDUyNi4zMDUgMTk3QzUyNS41MDUgMTgyLjIgNTE2LjMwNSAxNjAuODMzIDUxMS44MDUgMTUyQzUxOC42MDUgMTMwLjQgNTExLjk3MiAxMDUgNTA3LjgwNSA5NUM1MTYuMjA1IDc5LjQgNTA4LjMwNSAzMy44MzMzIDUwMy4zMDUgMTNMNDk5LjgwNSA1MEM1MDAuODA1IDU1LjMzMzMgNTAwLjQwNSA2OC43IDQ5MC44MDUgNzkuNUM0ODEuMjA1IDkwLjMgNDg5LjEzOCAxMTEuMzMzIDQ5NC4zMDUgMTIwLjVDNDczLjMwNSAxNzEuNSA1MDYuMzA1IDE4Ni41IDQ5NC4zMDUgMTk3QzQ4Mi4zMDUgMjA3LjUgNDgwLjMwNSAyMTkgNDgxLjgwNSAyMzNDNDgzLjAwNSAyNDQuMiA0OTAuNjM4IDI2MS42NjcgNDk0LjMwNSAyNjlMNDYxLjMwNSAyNzEuNUwzNzIuMzA1IDFaIiBmaWxsPSJ3aGl0ZSIgc3Ryb2tlPSIjNDc0NzQ3IiBzdHJva2Utd2lkdGg9IjMiLz4KPHBhdGggZD0iTTYzNC4xNiAzMTQuODE0TDY1NC43NzQgMzM0LjQ5N0w2MDAuMzMyIDM2OEw1OTAuNzE5IDI5MC4wNThMNjAwLjMzMiAyOTguNDM1QzYwMS41NjEgMjk1LjI3IDYwNi42OCAyODcuMDk1IDYxNy4zMzEgMjc5LjcxNUM2MzAuNjQ0IDI3MC40OSA2MzIuMTczIDI1MS42NSA2NDIuMjY5IDIzNS45NTRDNjUwLjM0NSAyMjMuMzk3IDY2OC45OTUgMjA5LjI1MSA2NzcuMzExIDIwMy43NDhDNjgyLjE3NiAxODEuNDc2IDcwMC42MDggMTYyLjUzIDcwOS4yMTYgMTU1Ljg0QzcwOS42OTggMTM4LjAyOCA3MzkuMjg5IDEwMi4wNTggNzU0LjAyNCA4Ni4yOTk3TDczOC42MSAxMjAuNDE2QzczNS4wODIgMTI0LjU4OSA3MjguNzYyIDEzNi40ODYgNzMxLjcxNiAxNTAuNjkxQzczNC42NzEgMTY0Ljg5NyA3MTcuMjg3IDE3OS4zNzggNzA4LjIyNiAxODQuODQzQzcwMS4wMzUgMjM5Ljg3NyA2NjQuODgyIDIzNi42NjYgNjcwLjA3MSAyNTEuNzk3QzY3NS4yNiAyNjYuOTI5IDY3MS4yNjIgMjc3Ljk4NCA2NjIuOTc2IDI4OS40OTVDNjU2LjM0NyAyOTguNzAzIDY0MS4wMDQgMzEwLjIxMSA2MzQuMTYgMzE0LjgxNFoiIGZpbGw9IndoaXRlIiBzdHJva2U9IiM0NzQ3NDciIHN0cm9rZS13aWR0aD0iMyIvPgo8cGF0aCBkPSJNMTAwNS40IDM5Ny4xNDVMNzE5LjUyMiA0MzQuOTU0TDY0NyA0ODRMNzE5LjUyMiA1NjFMNzI4LjMyNyA1NDQuOTMxQzczMS42MzYgNTQ1LjU3MyA3NDEuMjExIDU0NS41ODMgNzUzLjA0IDU0MC40ODRDNzY3LjgyNiA1MzQuMTExIDc4NC40NjkgNTQyLjgzIDgwMi45OTQgNTQyLjYyMkM4MTcuODE1IDU0Mi40NTYgODM5LjU1NiA1MzQuMTc4IDg0OC41NzMgNTMwLjA2Qzg2OS44NjMgNTM3Ljc3OCA4OTUuNTIzIDUzMi4yMzcgOTA1LjY5MiA1MjguNTAxQzkyMC45MTkgNTM3LjU2MSA5NjYuNzgyIDUzMS42MTcgOTg3LjgxIDUyNy41MTJMOTUwLjk5MyA1MjIuNDMzQzk0NS42MjIgNTIzLjIwNCA5MzIuMjg1IDUyMi4yMzMgOTIxLjkwNSA1MTIuMThDOTExLjUyNSA1MDIuMTI3IDg5MC4xNzIgNTA5LjE1MyA4ODAuNzkzIDUxMy45MjNDODMwLjczOCA0OTAuNzYxIDgxNC4zNCA1MjMuMDkgODA0LjM2MyA1MTAuNjUyQzc5NC4zODYgNDk4LjIxNCA3ODIuOTgyIDQ5NS43MjQgNzY4LjkzIDQ5Ni42MjRDNzU3LjY4OSA0OTcuMzQ0IDczOS45MTIgNTA0LjIyMyA3MzIuNDI5IDUwNy41NzNMNzMzLjc5NyA0NzUuNjAyTDEwMDUuNCAzOTcuMTQ1WiIgZmlsbD0id2hpdGUiIHN0cm9rZT0iIzQ3NDc0NyIgc3Ryb2tlLXdpZHRoPSIzIi8+CjxwYXRoIGQ9Ik05OTUuNTIyIDY0MS45NjdMNzI0LjE2IDU0NC40MDZMNzE4LjE5NSA1ODcuMDcyTDk5NS41MjIgNjQxLjk2N1oiIGZpbGw9IndoaXRlIiBzdHJva2U9IiM0NzQ3NDciIHN0cm9rZS13aWR0aD0iMyIvPgo8cGF0aCBkPSJNODg4LjI1OCA4MzQuNjA0TDY3My43OTkgNjQxLjgyNkw2NDguODA1IDY3N0w4ODguMjU4IDgzNC42MDRaIiBmaWxsPSJ3aGl0ZSIgc3Ryb2tlPSIjNDc0NzQ3IiBzdHJva2Utd2lkdGg9IjMiLz4KPHBhdGggZD0iTTE0NS4wMDcgMTI3LjgxOUwzMjMuNTk1IDM1NC4yM0wzNTEuMjQgMzIxLjE4OEwxNDUuMDA3IDEyNy44MTlaIiBmaWxsPSJ3aGl0ZSIgc3Ryb2tlPSIjNDc0NzQ3IiBzdHJva2Utd2lkdGg9IjMiLz4KPHBhdGggZD0iTTE1NS45ODMgODg0Ljc4NEwzNzAuMzcgNjkxLjkyNkwzMzUuNjA5IDY2Ni40NzZMMTU1Ljk4MyA4ODQuNzg0WiIgZmlsbD0id2hpdGUiIHN0cm9rZT0iIzQ3NDc0NyIgc3Ryb2tlLXdpZHRoPSIzIi8+CjxwYXRoIGQ9Ik04NjAuMjI1IDEzOEw2NDcuMDYgMzMyLjIwN0w2MjAgMzk5LjczMkw3MjIuODI3IDQzMUw3MTcuMDU4IDQxNy40ODhDNzIwLjE0MSA0MTYuMTI3IDcyOC4wMDkgNDEwLjY3IDczNC44MTIgMzk5LjczMkM3NDMuMzE2IDM4Ni4wNTkgNzYxLjk1OCAzODMuNzIxIDc3Ny4wNTIgMzcyLjk3N0M3ODkuMTI3IDM2NC4zODIgODAyLjI1NCAzNDUuMTc2IDgwNy4zMDggMzM2LjY0OEM4MjkuMTk0IDMzMC44MzQgODQ3LjEwMyAzMTEuNjM5IDg1My4zMjEgMzAyLjc2OEM4NzAuOTk1IDMwMS41MTcgOTA1LjI2MiAyNzAuNDYgOTIwLjE4NiAyNTUuMDg5TDg4Ny4wNTYgMjcxLjkzMUM4ODMuMDg1IDI3NS42MjkgODcxLjU3OSAyODIuNDQ0IDg1Ny4zMTkgMjgwLjExM0M4NDMuMDU4IDI3Ny43ODIgODI5LjUzNCAyOTUuNzM5IDgyNC41NTUgMzA1LjAwOUM3NzAuMjM0IDMxNC41NTggNzc1LjIyIDM1MC40NjMgNzU5LjkyOSAzNDUuOTQ0Qzc0NC42MzcgMzQxLjQyNSA3MzMuODUyIDM0NS44ODkgNzIyLjgyNyAzNTQuNjQ3QzcxNC4wMDggMzYxLjY1NCA3MDMuMzM3IDM3Ny40NDkgNjk5LjEwNCAzODQuNDcxTDY4MS45ODEgMzU3LjQzN0w4NjAuMjI1IDEzOFoiIGZpbGw9IndoaXRlIiBzdHJva2U9IiM0NzQ3NDciIHN0cm9rZS13aWR0aD0iMyIvPgo8cGF0aCBkPSJNMjAuNjM3NSA2ODEuMTI3TDI5Ni41NjggNTk3LjM1TDM0MSA1MzYuNDUxTDI3MC4wMDIgNDc4TDI3MC4wMDIgNDkwLjI2N0MyNjYuNjMzIDQ5MC4xNzEgMjU3LjE4NCA0OTEuNzE5IDI0Ni4zNDEgNDk4LjY3MkMyMzIuNzg4IDUwNy4zNjUgMjE0Ljk0OSA1MDEuNDY2IDE5Ni43MDQgNTA0LjY4M0MxODIuMTA3IDUwNy4yNTYgMTYyLjAwMSA1MTguOTU4IDE1My43NzMgNTI0LjQ4N0MxMzEuNTEyIDUyMC4zMzMgMTA3LjA5NCA1MjkuOTcyIDk3LjY2NzQgNTM1LjMxQzgxLjE3MDcgNTI4Ljg0NiAzNi44ODQxIDU0Mi4xNjcgMTYuODAyOSA1NDkuNjM1TDUzLjk1NTQgNTQ4LjY2MkM1OS4xMjk4IDU0Ny4wMjggNzIuNDQ3NiA1NDUuODE4IDg0LjMyMzMgNTU0LjA1Qzk2LjE5OSA1NjIuMjgyIDExNi4xMjYgNTUxLjg3OCAxMjQuNjA1IDU0NS42NDdDMTc3Ljc2IDU2MC4zNjQgMTg4LjY4NCA1MjUuOCAyMDAuNTUxIDUzNi40NTFDMjEyLjQxNyA1NDcuMTAyIDIyNC4wNzQgNTQ3LjcwNSAyMzcuNzkyIDU0NC41MzNDMjQ4Ljc2NyA1NDEuOTk1IDI2NS4xODkgNTMyLjMxNyAyNzIuMDI4IDUyNy43OTZMMjc1Ljg3NSA1NTkuNTY0TDIwLjYzNzUgNjgxLjEyN1oiIGZpbGw9IndoaXRlIiBzdHJva2U9IiM0NzQ3NDciIHN0cm9rZS13aWR0aD0iMyIvPgo8cGF0aCBkPSJNNjYxLjE1IDk5MC45NDRMNjA1LjU0MyA3MDcuOTg5TDU0Ny4wODMgNjM4TDQ5Ni4zMzIgNzIzLjY1MkM0OTUuODk4IDcyNi45OTQgNDk2LjQ4NyA3MzYuNTUxIDUwMi4zMTUgNzQ4LjAzOEM1MDkuNjAxIDc2Mi4zOTcgNTAxLjkzOCA3NzkuNTUyIDUwMy4zMDQgNzk4LjAyOEM1MDQuMzk3IDgxMi44MSA1MTQuMDE3IDgzMy45OSA1MTguNjkxIDg0Mi43MzNDNTEyLjMyIDg2NC40NjMgNTE5LjQ1NCA4ODkuNzI3IDUyMy44MTggODk5LjY0M0M1MTUuNzI4IDkxNS40MDYgNTI0LjUyNyA5NjAuODA3IDUyOS45MzggOTgxLjUzOEw1MzIuNzA2IDk0NC40NzZDNTMxLjYwMSA5MzkuMTYzIDUzMS43MzYgOTI1Ljc5MSA1NDEuMTIxIDkxNC44MDNDNTUwLjUwNSA5MDMuODE2IDU0Mi4xNTggODgyLjk0MyA1MzYuODExIDg3My44ODFDNTU2Ljc5OCA4MjIuNDc1IDUyMy41MDggODA4LjEzMSA1MzUuMjk4IDc5Ny4zOTZDNTQ3LjA4OCA3ODYuNjYgNTQ4Ljg2IDc3NS4xMjMgNTQ3LjA4MyA3NjEuMTU1QzU0NS42NjIgNzQ5Ljk4MSA1MzcuNjg1IDczMi42NjkgNTMzLjg3NCA3MjUuNDFMNTY1Ljg2OCA3MjQuNzc3TDY2MS4xNSA5OTAuOTQ0WiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTQ5Ni4zMzIgNzIzLjY1MkM0OTUuODk4IDcyNi45OTQgNDk2LjQ4NyA3MzYuNTUxIDUwMi4zMTUgNzQ4LjAzOEM1MDkuNjAxIDc2Mi4zOTcgNTAxLjkzOCA3NzkuNTUyIDUwMy4zMDQgNzk4LjAyOEM1MDQuMzk3IDgxMi44MSA1MTQuMDE3IDgzMy45OSA1MTguNjkxIDg0Mi43MzNDNTEyLjMyIDg2NC40NjMgNTE5LjQ1NCA4ODkuNzI3IDUyMy44MTggODk5LjY0M0M1MTUuNzI4IDkxNS40MDYgNTI0LjUyNyA5NjAuODA3IDUyOS45MzggOTgxLjUzOEw1MzIuNzA2IDk0NC40NzZDNTMxLjYwMSA5MzkuMTYzIDUzMS43MzYgOTI1Ljc5MSA1NDEuMTIxIDkxNC44MDNDNTUwLjUwNSA5MDMuODE2IDU0Mi4xNTggODgyLjk0MyA1MzYuODExIDg3My44ODFDNTU2Ljc5OCA4MjIuNDc1IDUyMy41MDggODA4LjEzMSA1MzUuMjk4IDc5Ny4zOTZDNTQ3LjA4OCA3ODYuNjYgNTQ4Ljg2IDc3NS4xMjMgNTQ3LjA4MyA3NjEuMTU1QzU0NS42NjIgNzQ5Ljk4MSA1MzcuNjg1IDczMi42NjkgNTMzLjg3NCA3MjUuNDFMNTY1Ljg2OCA3MjQuNzc3TDY2MS4xNSA5OTAuOTQ0TDYwNS41NDMgNzA3Ljk4OUw1NDcuMDgzIDYzOEw0OTYuMzMyIDcyMy42NTJaTTQ5Ni4zMzIgNzIzLjY1Mkw0ODMuNTY3IDcyMy42NTIiIHN0cm9rZT0iIzQ3NDc0NyIgc3Ryb2tlLXdpZHRoPSIzIi8+CjxwYXRoIGQ9Ik03MTYuOSA2NTkuMjg2QzcwNy45ODQgNjUyLjI2OSA2OTcuMTQyIDYzNi40NDcgNjkyLjgzNiA2MjkuNDE0TDcxMC42NDcgNTk2LjMxN0M3MTMuNzU2IDU5Ny42NzkgNzIxLjcwNSA2MDMuMTQzIDcyOC42MjMgNjE0LjFDNzM3LjI3IDYyNy43OTYgNzU2LjAyNyA2MzAuMTI5IDc3MS4yNzcgNjQwLjg4N0M3ODMuNDc4IDY0OS40OTMgNzk2LjgxMyA2NjguNzMxIDgwMS45NTUgNjc3LjI3NEM4MjMuOTk5IDY4My4wODggODQyLjE0IDcwMi4zMTMgODQ4LjQ1NSA3MTEuMTk5Qzg2Ni4yMyA3MTIuNDQyIDkwMC45MDIgNzQzLjU0NCA5MTYuMDE1IDc1OC45NEw4ODIuNTg5IDc0Mi4wODFDODc4LjU3MSA3MzguMzc3IDg2Ni45NTYgNzMxLjU1NSA4NTIuNjM3IDczMy44OTlDODM4LjMxOCA3MzYuMjQzIDgyNC41OTMgNzE4LjI1NiA4MTkuNTIxIDcwOC45N0M3NjQuODQ1IDY5OS40MzIgNzY5LjU5OSA2NjMuNDQ5IDc1NC4yNTkgNjY3Ljk4NkM3MzguOTIgNjcyLjUyMyA3MjguMDQ2IDY2OC4wNTYgNzE2LjkgNjU5LjI4NloiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik03MTAuNjQ3IDU5Ni4zMTdDNzEzLjc1NiA1OTcuNjc5IDcyMS43MDUgNjAzLjE0MyA3MjguNjIzIDYxNC4xQzczNy4yNyA2MjcuNzk2IDc1Ni4wMjcgNjMwLjEyOSA3NzEuMjc3IDY0MC44ODdDNzgzLjQ3OCA2NDkuNDkzIDc5Ni44MTMgNjY4LjczMSA4MDEuOTU1IDY3Ny4yNzRDODIzLjk5OSA2ODMuMDg4IDg0Mi4xNCA3MDIuMzEzIDg0OC40NTUgNzExLjE5OUM4NjYuMjMgNzEyLjQ0MiA5MDAuOTAyIDc0My41NDQgOTE2LjAxNSA3NTguOTRMODgyLjU4OSA3NDIuMDgxQzg3OC41NzEgNzM4LjM3NyA4NjYuOTU2IDczMS41NTUgODUyLjYzNyA3MzMuODk5QzgzOC4zMTggNzM2LjI0MyA4MjQuNTkzIDcxOC4yNTYgODE5LjUyMSA3MDguOTdDNzY0Ljg0NSA2OTkuNDMyIDc2OS41OTkgNjYzLjQ0OSA3NTQuMjU5IDY2Ny45ODZDNzM4LjkyIDY3Mi41MjMgNzI4LjA0NiA2NjguMDU2IDcxNi45IDY1OS4yODZDNzA3Ljk4NCA2NTIuMjY5IDY5Ny4xNDIgNjM2LjQ0NyA2OTIuODM2IDYyOS40MTRMNzEwLjY0NyA1OTYuMzE3Wk03MTAuNjQ3IDU5Ni4zMTdMNzE5LjQyNyA1ODcuMDcxIiBzdHJva2U9IiM0NzQ3NDciIHN0cm9rZS13aWR0aD0iMyIvPgo8cGF0aCBkPSJNNjMyLjI4OCA3MzguMTM3QzYyNS40MDEgNzI5LjEyIDYxOC44NDQgNzExLjA5NiA2MTYuNDI2IDcwMy4yMTFMNjQxLjkyMSA2NzUuNTk2QzY0NC41OTMgNjc3LjY5IDY1MC45MyA2ODQuOTYyIDY1NC44OTkgNjk3LjI5N0M2NTkuODYxIDcxMi43MTUgNjc3LjQ0NiA3MTkuNjQ4IDY4OS41MzUgNzMzLjg2NkM2OTkuMjA2IDc0NS4yNDEgNzA3LjMyOCA3NjcuMTk1IDcxMC4xNzkgNzc2Ljc1QzczMC4wNzkgNzg3Ljg3MiA3NDIuODU4IDgxMS4wMSA3NDYuNzYgODIxLjE5Qzc2My42NjUgODI2LjgyMyA3ODkuNDk0IDg2NS41ODIgODAwLjI5NSA4ODQuMjU4TDc3Mi4xMjQgODU5LjYwM0M3NjkuMTU1IDg1NS4wMTUgNzU5LjYwNiA4NDUuNTE0IDc0NS4xNTQgODQ0LjIxNkM3MzAuNzAzIDg0Mi45MTkgNzIxLjg5MyA4MjIuMDggNzE5LjI5NCA4MTEuODIyQzY2OC43MTkgNzg4Ljk2MiA2ODIuMjg4IDc1NS4yOTkgNjY2LjMwMiA3NTUuODcxQzY1MC4zMTYgNzU2LjQ0MyA2NDAuODk3IDc0OS40MDggNjMyLjI4OCA3MzguMTM3WiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTY0MS45MjEgNjc1LjU5NkM2NDQuNTkzIDY3Ny42OSA2NTAuOTMgNjg0Ljk2MiA2NTQuODk5IDY5Ny4yOTdDNjU5Ljg2MSA3MTIuNzE1IDY3Ny40NDYgNzE5LjY0OCA2ODkuNTM1IDczMy44NjZDNjk5LjIwNiA3NDUuMjQxIDcwNy4zMjggNzY3LjE5NSA3MTAuMTc5IDc3Ni43NUM3MzAuMDc5IDc4Ny44NzIgNzQyLjg1OCA4MTEuMDEgNzQ2Ljc2IDgyMS4xOUM3NjMuNjY1IDgyNi44MjMgNzg5LjQ5NCA4NjUuNTgyIDgwMC4yOTUgODg0LjI1OEw3NzIuMTI0IDg1OS42MDNDNzY5LjE1NSA4NTUuMDE1IDc1OS42MDYgODQ1LjUxNCA3NDUuMTU0IDg0NC4yMTZDNzMwLjcwMyA4NDIuOTE5IDcyMS44OTMgODIyLjA4IDcxOS4yOTQgODExLjgyMkM2NjguNzE5IDc4OC45NjIgNjgyLjI4OCA3NTUuMjk5IDY2Ni4zMDIgNzU1Ljg3MUM2NTAuMzE2IDc1Ni40NDMgNjQwLjg5NyA3NDkuNDA4IDYzMi4yODggNzM4LjEzN0M2MjUuNDAxIDcyOS4xMiA2MTguODQ0IDcxMS4wOTYgNjE2LjQyNiA3MDMuMjExTDY0MS45MjEgNjc1LjU5NlpNNjQxLjkyMSA2NzUuNTk2TDY1Mi43MjggNjY4LjgyOCIgc3Ryb2tlPSIjNDc0NzQ3IiBzdHJva2Utd2lkdGg9IjMiLz4KPHBhdGggZD0iTTI3MC4wODEgNjI2LjU3MkMyODAuMTgzIDYyMS40MDcgMjk5LjA4OSA2MTguMTc0IDMwNy4yNzkgNjE3LjIwNEwzMjkuODk2IDY0Ny4yMjJDMzI3LjM1OCA2NDkuNDc3IDMxOS4wNzEgNjU0LjQxMiAzMDYuMjI1IDY1Ni4xMTVDMjkwLjE2OCA2NTguMjQzIDI4MC4yMDYgNjc0LjMwNiAyNjQuMDU3IDY4My42NjFDMjUxLjEzOCA2OTEuMTQ1IDIyOC4wODcgNjk1LjIxNSAyMTguMTc2IDY5Ni4zMTRDMjAzLjY3OCA3MTMuOTA3IDE3OC42MjkgNzIyLjM0NyAxNjcuOTE3IDcyNC4zNjhDMTU5LjM1NCA3MzkuOTk1IDExNi42MDQgNzU4LjQ4NSA5Ni4yOTk4IDc2NS43NzdMMTI1LjU5IDc0Mi40NjJDMTMwLjYzNSA3NDAuMzYxIDE0MS42ODkgNzMyLjY2MiAxNDUuNTQ3IDcxOC42NzVDMTQ5LjQwNSA3MDQuNjg4IDE3MS40ODMgNjk5Ljc0MiAxODIuMDM5IDY5OS4wMTdDMjEzLjU2NiA2NTMuMzM4IDI0NC4yNjQgNjcyLjcwMiAyNDYuNTU2IDY1Ni44NzFDMjQ4Ljg0OSA2NDEuMDQgMjU3LjQ1NCA2MzMuMDMgMjcwLjA4MSA2MjYuNTcyWiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTMyOS44OTYgNjQ3LjIyMkMzMjcuMzU4IDY0OS40NzcgMzE5LjA3MSA2NTQuNDEyIDMwNi4yMjUgNjU2LjExNUMyOTAuMTY4IDY1OC4yNDMgMjgwLjIwNiA2NzQuMzA2IDI2NC4wNTcgNjgzLjY2MUMyNTEuMTM4IDY5MS4xNDUgMjI4LjA4NyA2OTUuMjE1IDIxOC4xNzYgNjk2LjMxNEMyMDMuNjc4IDcxMy45MDcgMTc4LjYyOSA3MjIuMzQ3IDE2Ny45MTcgNzI0LjM2OEMxNTkuMzU0IDczOS45OTUgMTE2LjYwNCA3NTguNDg1IDk2LjI5OTggNzY1Ljc3N0wxMjUuNTkgNzQyLjQ2MkMxMzAuNjM1IDc0MC4zNjEgMTQxLjY4OSA3MzIuNjYyIDE0NS41NDcgNzE4LjY3NUMxNDkuNDA1IDcwNC42ODggMTcxLjQ4MyA2OTkuNzQyIDE4Mi4wMzkgNjk5LjAxN0MyMTMuNTY2IDY1My4zMzggMjQ0LjI2NCA2NzIuNzAyIDI0Ni41NTYgNjU2Ljg3MUMyNDguODQ5IDY0MS4wNCAyNTcuNDU0IDYzMy4wMyAyNzAuMDgxIDYyNi41NzJDMjgwLjE4MyA2MjEuNDA3IDI5OS4wODkgNjE4LjE3NCAzMDcuMjc5IDYxNy4yMDRMMzI5Ljg5NiA2NDcuMjIyWk0zMjkuODk2IDY0Ny4yMjJMMzM0LjYyNCA2NTkuMDY0IiBzdHJva2U9IiM0NzQ3NDciIHN0cm9rZS13aWR0aD0iMyIvPgo8cGF0aCBkPSJNMzkxLjcwNiAyNTQuMjA2QzM5Ni42NjUgMjY0LjQxMSAzOTkuNTEgMjgzLjM3OSA0MDAuMzEzIDI5MS41ODdMMzY5LjgzOSAzMTMuNTg2QzM2Ny42MzcgMzExLjAwMyAzNjIuODcxIDMwMi42MTcgMzYxLjQzMiAyODkuNzM5QzM1OS42MzIgMjczLjY0MiAzNDMuNzc2IDI2My4zNTQgMzM0Ljc1MiAyNDcuMDE3QzMyNy41MzQgMjMzLjk0OCAzMjMuOTM2IDIxMC44MTggMzIzLjA0IDIwMC44ODdDMzA1Ljc0NyAxODYuMDMzIDI5Ny44MiAxNjAuODE2IDI5Ni4wMTggMTUwLjA2NUMyODAuNTY5IDE0MS4xODUgMjYyLjk1NiA5OC4wNjY0IDI1Ni4wODEgNzcuNjE3MUwyNzguNzkyIDEwNy4zNzhDMjgwLjc5IDExMi40NjQgMjg4LjI2MiAxMjMuNjczIDMwMi4xNjcgMTI3LjgxNkMzMTYuMDcyIDEzMS45NTkgMzIwLjU2NiAxNTQuMTMzIDMyMS4wNzUgMTY0LjcwMkMzNjYuMSAxOTcuMTU2IDM0Ni4xMTQgMjI3LjQ1MiAzNjEuODk1IDIzMC4wNjdDMzc3LjY3NiAyMzIuNjgzIDM4NS41MDggMjQxLjQ0OSAzOTEuNzA2IDI1NC4yMDZaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMzY5LjgzOSAzMTMuNTg2QzM2Ny42MzcgMzExLjAwMyAzNjIuODcxIDMwMi42MTcgMzYxLjQzMiAyODkuNzM5QzM1OS42MzIgMjczLjY0MiAzNDMuNzc2IDI2My4zNTQgMzM0Ljc1MiAyNDcuMDE3QzMyNy41MzQgMjMzLjk0OCAzMjMuOTM2IDIxMC44MTggMzIzLjA0IDIwMC44ODdDMzA1Ljc0NyAxODYuMDMzIDI5Ny44MiAxNjAuODE2IDI5Ni4wMTggMTUwLjA2NUMyODAuNTY5IDE0MS4xODUgMjYyLjk1NiA5OC4wNjY0IDI1Ni4wODEgNzcuNjE3MUwyNzguNzkyIDEwNy4zNzhDMjgwLjc5IDExMi40NjQgMjg4LjI2MiAxMjMuNjczIDMwMi4xNjcgMTI3LjgxNkMzMTYuMDcyIDEzMS45NTkgMzIwLjU2NiAxNTQuMTMzIDMyMS4wNzUgMTY0LjcwMkMzNjYuMSAxOTcuMTU2IDM0Ni4xMTQgMjI3LjQ1MiAzNjEuODk1IDIzMC4wNjdDMzc3LjY3NiAyMzIuNjgzIDM4NS41MDggMjQxLjQ0OSAzOTEuNzA2IDI1NC4yMDZDMzk2LjY2NSAyNjQuNDExIDM5OS41MSAyODMuMzc5IDQwMC4zMTMgMjkxLjU4N0wzNjkuODM5IDMxMy41ODZaTTM2OS44MzkgMzEzLjU4NkwzNTcuOTAzIDMxOC4wNzEiIHN0cm9rZT0iIzQ3NDc0NyIgc3Ryb2tlLXdpZHRoPSIzIi8+CjxwYXRoIGQ9Ik00MTYuNzM4IDEwMDIuMjRMNDg1LjA0IDcyMi4wNzhMNDY2IDY1MUwzNzkuMzQxIDY5MC40NTJDMzc3LjU0NCA2OTMuMzA0IDM3NC4wNjcgNzAyLjIyNSAzNzQuNTM2IDcxNS4wOThDMzc1LjEyMSA3MzEuMTg4IDM2MC45NjYgNzQzLjU0MyAzNTQuNDQ5IDc2MC44ODZDMzQ5LjIzNiA3NzQuNzYgMzQ5LjA3OCA3OTguMDIzIDM0OS42NSA4MDcuOTJDMzM0Ljc0NiA4MjQuOTY5IDMzMC42MTcgODUwLjg5NCAzMzAuNDE1IDg2MS43MjVDMzE2LjQ1NiA4NzIuNjM3IDMwNS4zODUgOTE3LjUzOCAzMDEuNTk0IDkzOC42MjVMMzE5LjY2MyA5MDYuMTQ4QzMyMC44OSA5MDAuODYzIDMyNi42MjYgODg4Ljc4MyAzMzkuNzU2IDg4Mi43NDlDMzUyLjg4NiA4NzYuNzE1IDM1NC4wNzEgODU0LjI2NyAzNTMuMDIyIDg0My43OTdDMzkyLjc0MSA4MDUuNTI5IDM2OC41NDYgNzc4LjUzNiAzODMuNzU0IDc3My43NDFDMzk4Ljk2MSA3NjguOTQ2IDQwNS40MTIgNzU5LjIxOCA0MDkuNjYzIDc0NS43OTVDNDEzLjA2MyA3MzUuMDU3IDQxMy4wOSA3MTUuOTk1IDQxMi42NzggNzA3LjgwNkw0NDEuOTgyIDcyMC42NjFMNDE2LjczOCAxMDAyLjI0WiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTM3OS4zNDEgNjkwLjQ1MkMzNzcuNTQ0IDY5My4zMDQgMzc0LjA2NyA3MDIuMjI1IDM3NC41MzYgNzE1LjA5OEMzNzUuMTIxIDczMS4xODggMzYwLjk2NiA3NDMuNTQzIDM1NC40NDkgNzYwLjg4NkMzNDkuMjM2IDc3NC43NiAzNDkuMDc4IDc5OC4wMjMgMzQ5LjY1IDgwNy45MkMzMzQuNzQ2IDgyNC45NjkgMzMwLjYxNyA4NTAuODk0IDMzMC40MTUgODYxLjcyNUMzMTYuNDU2IDg3Mi42MzcgMzA1LjM4NSA5MTcuNTM4IDMwMS41OTQgOTM4LjYyNUwzMTkuNjYzIDkwNi4xNDhDMzIwLjg5IDkwMC44NjMgMzI2LjYyNiA4ODguNzgzIDMzOS43NTYgODgyLjc0OUMzNTIuODg2IDg3Ni43MTUgMzU0LjA3MSA4NTQuMjY3IDM1My4wMjIgODQzLjc5N0MzOTIuNzQxIDgwNS41MjkgMzY4LjU0NiA3NzguNTM2IDM4My43NTQgNzczLjc0MUMzOTguOTYxIDc2OC45NDYgNDA1LjQxMiA3NTkuMjE4IDQwOS42NjMgNzQ1Ljc5NUM0MTMuMDYzIDczNS4wNTcgNDEzLjA5IDcxNS45OTUgNDEyLjY3OCA3MDcuODA2TDQ0MS45ODIgNzIwLjY2MUw0MTYuNzM4IDEwMDIuMjRMNDg1LjA0IDcyMi4wNzhMNDY2IDY1MUwzNzkuMzQxIDY5MC40NTJaTTM3OS4zNDEgNjkwLjQ1MkwzNjYuODkgNjg3LjcyIiBzdHJva2U9IiM0NzQ3NDciIHN0cm9rZS13aWR0aD0iMyIvPgo8cGF0aCBkPSJNOC4zMDUxMSAzNjYuNzAyTDI3OC4yMiA0NjguMjAxTDMzMSA0MzJMMzIyLjMyOCAzNjcuMDczQzMxOS43MTMgMzY0Ljk0NiAzMTEuMjc1IDM2MC40MjEgMjk4LjQzOSAzNTkuMzM4QzI4Mi4zOTUgMzU3Ljk4NCAyNzEuODMzIDM0Mi40NDYgMjU1LjM5OSAzMzMuODkxQzI0Mi4yNTIgMzI3LjA0OCAyMTkuMTc3IDMyNC4wOTMgMjA5LjI4MyAzMjMuNDcxQzE5NC4xNTEgMzA2LjYyNCAxNjguOTExIDI5OS40MDcgMTU4LjE4MiAyOTcuOTA0QzE0OS4wMjggMjgyLjczNCAxMDUuNzg0IDI2Ni4zNDQgODUuMzA1OSAyNjAuMDQ1TDExNS4zNzQgMjgxLjg4OEMxMjAuNDc0IDI4My43NDIgMTMxLjc3NyAyOTAuODg5IDEzNi4xODcgMzA0LjY0OUMxNDAuNTk4IDMxOC40MDkgMTYyLjc0MSAzMjIuMjg1IDE3My4yNjIgMzIyLjUwM0MyMDYuNDc1IDM2Ni41MzYgMjM2LjE4MiAzNDUuNzYzIDIzOS4xMTMgMzYxLjQzN0MyNDIuMDQ0IDM3Ny4xMSAyNTAuOTI1IDM4NC42ODUgMjYzLjc0IDM5MC41MTlDMjczLjk5MiAzOTUuMTg2IDI5Mi45MTIgMzk3LjUwNSAzMDEuMDkxIDM5OC4wODFMMjg0LjgwNSA0MjUuNjI2TDguMzA1MTEgMzY2LjcwMloiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0zMjIuMzI4IDM2Ny4wNzNDMzE5LjcxMyAzNjQuOTQ2IDMxMS4yNzUgMzYwLjQyMSAyOTguNDM5IDM1OS4zMzhDMjgyLjM5NSAzNTcuOTg0IDI3MS44MzMgMzQyLjQ0NiAyNTUuMzk5IDMzMy44OTFDMjQyLjI1MiAzMjcuMDQ4IDIxOS4xNzcgMzI0LjA5MyAyMDkuMjgzIDMyMy40NzFDMTk0LjE1MSAzMDYuNjI0IDE2OC45MTEgMjk5LjQwNyAxNTguMTgyIDI5Ny45MDRDMTQ5LjAyOCAyODIuNzM0IDEwNS43ODQgMjY2LjM0NCA4NS4zMDU5IDI2MC4wNDVMMTE1LjM3NCAyODEuODg4QzEyMC40NzQgMjgzLjc0MiAxMzEuNzc3IDI5MC44ODkgMTM2LjE4NyAzMDQuNjQ5QzE0MC41OTggMzE4LjQwOSAxNjIuNzQxIDMyMi4yODUgMTczLjI2MiAzMjIuNTAzQzIwNi40NzUgMzY2LjUzNiAyMzYuMTgyIDM0NS43NjMgMjM5LjExMyAzNjEuNDM3QzI0Mi4wNDQgMzc3LjExIDI1MC45MjUgMzg0LjY4NSAyNjMuNzQgMzkwLjUxOUMyNzMuOTkyIDM5NS4xODYgMjkyLjkxMiAzOTcuNTA1IDMwMS4wOTEgMzk4LjA4MUwyODQuODA1IDQyNS42MjZMOC4zMDUxMSAzNjYuNzAyTDI3OC4yMiA0NjguMjAxTDMzMSA0MzJMMzIyLjMyOCAzNjcuMDczWk0zMjIuMzI4IDM2Ny4wNzNMMzI2LjUzOCAzNTUuMDQiIHN0cm9rZT0iIzQ3NDc0NyIgc3Ryb2tlLXdpZHRoPSIzIi8+CjxwYXRoIGQ9Ik02NTguNTAyIDI3LjkzODVMNTU0LjQzNCAyNzUuNjA2TDU4OS4xNzkgMjkyLjA2OEw2NTguNTAyIDI3LjkzODVaIiBmaWxsPSJ3aGl0ZSIgc3Ryb2tlPSIjNDc0NzQ3IiBzdHJva2Utd2lkdGg9IjMiLz4KPC9nPgo8ZyBmaWx0ZXI9InVybCgjZmlsdGVyMV9kXzBfMSkiPgo8Y2lyY2xlIGN4PSI1MDMiIGN5PSI1MTEiIHI9IjM5MCIgZmlsbD0iI0RFQjczQSIvPgo8Y2lyY2xlIGN4PSI1MDMiIGN5PSI1MTEiIHI9IjM4NCIgc3Ryb2tlPSIjNDc0NzQ3IiBzdHJva2Utd2lkdGg9IjEyIi8+CjwvZz4KPHBhdGggZD0iTTI2MyA0NDUuODQ3QzI5Ni4zMzMgNDE2LjQwMyAzNzIuNjY3IDM3Mi4xOCA0MTEuMzMzIDQzMC44NDciIHN0cm9rZT0iIzQ3NDc0NyIgc3Ryb2tlLXdpZHRoPSIxOCIvPgo8cGF0aCBkPSJNMzY2LjMzMyA0NDQuNjY3QzM0My42NjcgNDYzLjMzMyAzMjQuNjY3IDQzNi44ODkgMzE4IDQyMS4zMzNMMzc4IDQxM0MzODMuNTU2IDQxNS43NzggMzg5IDQyNiAzNjYuMzMzIDQ0NC42NjdaIiBmaWxsPSIjNDc0NzQ3IiBzdHJva2U9IiM0NzQ3NDciIHN0cm9rZS13aWR0aD0iMTgiLz4KPHBhdGggZD0iTTI4Ny4zMzMgNDcwLjMzM0MzMTcuMzMzIDUwNS44ODkgMzg1IDU1MyA0MTUuNjY3IDQ1NyIgc3Ryb2tlPSIjNDc0NzQ3IiBzdHJva2Utd2lkdGg9IjE4Ii8+CjxwYXRoIGQ9Ik00NjggNDEzLjVDNDkyLjE2NyA0MzAuMTY3IDQ4My44MTIgNTM3LjE3OSA0MDguODMzIDYwMSIgc3Ryb2tlPSIjNDc0NzQ3IiBzdHJva2Utd2lkdGg9IjEyIi8+CjxwYXRoIGQ9Ik01MzcuOTY3IDQwNi4wNTNDNTEzLjggNDIyLjcyIDUxMC41IDU0NS4xNjcgNTk3LjEzNCA1OTMuNTUzIiBzdHJva2U9IiM0NzQ3NDciIHN0cm9rZS13aWR0aD0iMTIiLz4KPHBhdGggZD0iTTQwNi4zMzMgNjE3LjY2N0M0MzEuMzMzIDY1MC4xNjcgNTU5LjY2NyA2NTAuMTY3IDU5NC42NjcgNjE0LjMzM000NjguODMzIDU5NS4xNjdDNDkwLjUgNjE3LjY2NyA1MTMuODMzIDYxNy42NjcgNTM1LjUgNTk1LjE2NyIgc3Ryb2tlPSIjNDc0NzQ3IiBzdHJva2Utd2lkdGg9IjEyIi8+CjxwYXRoIGQ9Ik0zOTkuNjY3IDMzMy45NjVDNDI1LjI5MSAzMzcuMjQ1IDQ2NS41IDM3Ny4yOTggNDYxLjA1NiAzODMuOTAzQzQ1NS41IDM2Ni40NjUgNDA3LjE2NyAzNTkuNzk4IDM5NS41IDM1NS42MzFDMzc2Ljg0NiAzNDguOTY5IDM4MC42MzIgMzM0Ljg2MyAyOTMgMzYzLjEzMUMzNDAuNSAzMjcuODA0IDM3MS40NTQgMzMwLjM1MyAzOTkuNjY3IDMzMy45NjVaIiBmaWxsPSIjNDc0NzQ3IiBzdHJva2U9IiM0NzQ3NDciLz4KPHBhdGggZD0iTTczOC4yMjIgNDQ1Ljg0N0M3MDQuODg4IDQxNi40MDMgNjI4LjU1NSAzNzIuMTggNTg5Ljg4OCA0MzAuODQ3IiBzdHJva2U9IiM0NzQ3NDciIHN0cm9rZS13aWR0aD0iMTgiLz4KPHBhdGggZD0iTTYzNi41NSA0NDQuNjY3QzY1OS4yMTcgNDYzLjMzMyA2NzguMjE3IDQzNi44ODkgNjg0Ljg4NCA0MjEuMzMzTDYyNC44ODQgNDEzQzYxOS4zMjggNDE1Ljc3OCA2MTMuODg0IDQyNiA2MzYuNTUgNDQ0LjY2N1oiIGZpbGw9IiM0NzQ3NDciIHN0cm9rZT0iIzQ3NDc0NyIgc3Ryb2tlLXdpZHRoPSIxOCIvPgo8cGF0aCBkPSJNNzE1Ljg4OCA0NzAuMzMzQzY4NS44ODggNTA1Ljg4OSA2MTguMjIyIDU1MyA1ODcuNTU1IDQ1NyIgc3Ryb2tlPSIjNDc0NzQ3IiBzdHJva2Utd2lkdGg9IjE4Ii8+CjxwYXRoIGQ9Ik02MDEuNTU1IDMzMy45NjVDNTc1LjkzMSAzMzcuMjQ1IDUzNS43MjIgMzc3LjI5OCA1NDAuMTY2IDM4My45MDNDNTQ1LjcyMiAzNjYuNDY1IDU5NC4wNTUgMzU5Ljc5OCA2MDUuNzIyIDM1NS42MzFDNjI0LjM3NiAzNDguOTY5IDYyMC41ODkgMzM0Ljg2MyA3MDguMjIyIDM2My4xMzFDNjYwLjcyMiAzMjcuODA0IDYyOS43NjggMzMwLjM1MyA2MDEuNTU1IDMzMy45NjVaIiBmaWxsPSIjNDc0NzQ3IiBzdHJva2U9IiM0NzQ3NDciLz4KPHBhdGggZD0iTTYzOCA3NTFIMzg5LjY2N0MzOTUuMjIyIDczNS40NDQgNDEzIDcwNC4zMzMgNDM5LjY2NyA3MDQuMzMzQzQ2Ni4zMzMgNzA0LjMzMyA0OTEuODg5IDcxNi41NTYgNTAxLjMzMyA3MjIuNjY3QzUxMC4yMjIgNzE2LjU1NiA1MzYgNzA0LjMzMyA1NjggNzA0LjMzM0M2MDAgNzA0LjMzMyA2MjggNzM1LjQ0NCA2MzggNzUxWiIgc3Ryb2tlPSIjNDc0NzQ3IiBzdHJva2Utd2lkdGg9IjEyIi8+CjxkZWZzPgo8ZmlsdGVyIGlkPSJmaWx0ZXIwX2RfMF8xIiB4PSI0Ljc3NzE2IiB5PSIwLjUzMTE4OSIgd2lkdGg9IjEwMDguMDQiIGhlaWdodD0iMTAxMi4wNiIgZmlsdGVyVW5pdHM9InVzZXJTcGFjZU9uVXNlIiBjb2xvci1pbnRlcnBvbGF0aW9uLWZpbHRlcnM9InNSR0IiPgo8ZmVGbG9vZCBmbG9vZC1vcGFjaXR5PSIwIiByZXN1bHQ9IkJhY2tncm91bmRJbWFnZUZpeCIvPgo8ZmVDb2xvck1hdHJpeCBpbj0iU291cmNlQWxwaGEiIHR5cGU9Im1hdHJpeCIgdmFsdWVzPSIwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAxMjcgMCIgcmVzdWx0PSJoYXJkQWxwaGEiLz4KPGZlT2Zmc2V0IGR4PSIyIiBkeT0iNSIvPgo8ZmVHYXVzc2lhbkJsdXIgc3RkRGV2aWF0aW9uPSIyLjUiLz4KPGZlQ29tcG9zaXRlIGluMj0iaGFyZEFscGhhIiBvcGVyYXRvcj0ib3V0Ii8+CjxmZUNvbG9yTWF0cml4IHR5cGU9Im1hdHJpeCIgdmFsdWVzPSIwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwLjI1IDAiLz4KPGZlQmxlbmQgbW9kZT0ibm9ybWFsIiBpbjI9IkJhY2tncm91bmRJbWFnZUZpeCIgcmVzdWx0PSJlZmZlY3QxX2Ryb3BTaGFkb3dfMF8xIi8+CjxmZUJsZW5kIG1vZGU9Im5vcm1hbCIgaW49IlNvdXJjZUdyYXBoaWMiIGluMj0iZWZmZWN0MV9kcm9wU2hhZG93XzBfMSIgcmVzdWx0PSJzaGFwZSIvPgo8L2ZpbHRlcj4KPGZpbHRlciBpZD0iZmlsdGVyMV9kXzBfMSIgeD0iMTEzIiB5PSIxMjEiIHdpZHRoPSI3ODQiIGhlaWdodD0iNzg0IiBmaWx0ZXJVbml0cz0idXNlclNwYWNlT25Vc2UiIGNvbG9yLWludGVycG9sYXRpb24tZmlsdGVycz0ic1JHQiI+CjxmZUZsb29kIGZsb29kLW9wYWNpdHk9IjAiIHJlc3VsdD0iQmFja2dyb3VuZEltYWdlRml4Ii8+CjxmZUNvbG9yTWF0cml4IGluPSJTb3VyY2VBbHBoYSIgdHlwZT0ibWF0cml4IiB2YWx1ZXM9IjAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDEyNyAwIiByZXN1bHQ9ImhhcmRBbHBoYSIvPgo8ZmVPZmZzZXQgZHg9IjIiIGR5PSIyIi8+CjxmZUdhdXNzaWFuQmx1ciBzdGREZXZpYXRpb249IjEiLz4KPGZlQ29tcG9zaXRlIGluMj0iaGFyZEFscGhhIiBvcGVyYXRvcj0ib3V0Ii8+CjxmZUNvbG9yTWF0cml4IHR5cGU9Im1hdHJpeCIgdmFsdWVzPSIwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwLjI1IDAiLz4KPGZlQmxlbmQgbW9kZT0ibm9ybWFsIiBpbjI9IkJhY2tncm91bmRJbWFnZUZpeCIgcmVzdWx0PSJlZmZlY3QxX2Ryb3BTaGFkb3dfMF8xIi8+CjxmZUJsZW5kIG1vZGU9Im5vcm1hbCIgaW49IlNvdXJjZUdyYXBoaWMiIGluMj0iZWZmZWN0MV9kcm9wU2hhZG93XzBfMSIgcmVzdWx0PSJzaGFwZSIvPgo8L2ZpbHRlcj4KPC9kZWZzPgo8L3N2Zz4K';

  private _wallet: ElectronAppStorageWallet | null;

  private _keyPair: sol.Keypair | null = null;

  private _publicKey: sol.PublicKey | null;

  private _connecting: boolean;

  private _readyState: WalletReadyState = WalletReadyState.Installed;

  private _config: ElectronAppStorageWalletAdapterConfig;

  constructor(config: ElectronAppStorageWalletAdapterConfig) {
    super();
    this._connecting = false;
    this._wallet = null;
    this._publicKey = null;
    this._config = config;

    this._readyState = WalletReadyState.Installed;
    this.emit('readyStateChange', this._readyState);

    if (this._config.account) {
      this._wallet = new ElectronAppStorageWalletProvider(this._config);
      this._wallet.isConnected = true;
    }
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
      this._keyPair = await this._config.accountFn();
      this._config.account = this._keyPair;
      this._publicKey = this._keyPair.publicKey;
    }
    // TODO: i think really, this provider gets moved out to our code...
    this._wallet = new ElectronAppStorageWalletProvider(this._config);
    this._wallet.isConnected = true;

    // set this._PublicKey...
    this.emit('connect', this._publicKey);
    this._connecting = false;
  }

  async disconnect(): Promise<void> {
    if (this._wallet) {
      this._wallet.off('disconnect', this._disconnected);

      const wallet = this._wallet;
      this._wallet = null;
      this._publicKey = null;

      try {
        await wallet.disconnect();
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
      // ElectronAppStorage doesn't handle partial signers, so if they are provided, don't use `signAndSendTransaction`
      if (wallet && 'signAndSendTransaction' in wallet && !options?.signers) {
        // HACK: ElectronAppStorage's `signAndSendTransaction` should always set these, but doesn't yet
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
