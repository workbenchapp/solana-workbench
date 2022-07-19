import { useEffect, useState } from 'react';
import Split from 'react-split';

import Stack from 'react-bootstrap/Stack';
import { Row, Col, Form, Accordion } from 'react-bootstrap';

import * as sol from '@solana/web3.js';
import * as spltoken from '@solana/spl-token';

import { useWallet } from '@solana/wallet-adapter-react';

import { MetaplexMintMetaDataView } from '../components/tokens/MetaplexMintMetaDataView';
import {
  NetStatus,
  selectValidatorNetworkState,
} from '../data/ValidatorNetwork/validatorNetworkState';
import { getTokenAccounts } from '../data/accounts/getAccount';
import { useAppSelector } from '../hooks';
import AccountView from '../components/AccountView';
import { MintInfoView } from '../components/tokens/MintInfoView';

import { logger } from '../common/globals';

function NotAbleToShowBanner({ children }) {
  return (
    <div className="h-full w-full justify-center items-center flex flex-col">
      <div className="relative z-0 flex flex-col items-center">
        <svg
          viewBox="0 0 200 200"
          className="absolute transform -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 w-80 h-80 -z-1"
        >
          <path
            fill="rgb(var(--surface-300))"
            d="M41.7,-52.4C52.9,-40.3,60.2,-26.1,67,-8.7C73.8,8.7,80.2,29.4,72.9,42.1C65.6,54.9,44.5,59.8,25.6,63.7C6.7,67.7,-10.1,70.7,-25.1,66.3C-40.1,62,-53.3,50.2,-61.3,35.7C-69.4,21.2,-72.4,3.9,-70.2,-13.1C-68.1,-30.1,-60.8,-47,-48.3,-58.9C-35.7,-70.9,-17.9,-77.9,-1.3,-76.3C15.2,-74.8,30.5,-64.6,41.7,-52.4Z"
            transform="translate(100 100)"
          />
        </svg>
        <IconMdiWarning className="text-6xl z-1" />
        <span className="z-2">{children}</span>
      </div>
    </div>
  );
}
function MintAccordians({ mintKey }) {
  if (!mintKey) {
    return <NotAbleToShowBanner>No Mint selected</NotAbleToShowBanner>;
  }
  return (
    <>
      <AccountView pubKey={mintKey?.toString()} />

      <Accordion>
        <MintInfoView mintKey={mintKey ? mintKey.toString() : ''} />
      </Accordion>
      <Accordion>
        <MetaplexMintMetaDataView mintKey={mintKey ? mintKey.toString() : ''} />
      </Accordion>
    </>
  );
}

function TokenPage() {
  const fromKey = useWallet();
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
      updateMintList([]);
      updateMintKey(undefined);
      return;
    }
    if (!fromKey.publicKey) {
      updateMintList([]);
      updateMintKey(undefined);
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

  if (status !== NetStatus.Running) {
    return (
      <NotAbleToShowBanner>
        Unable to connect to selected Validator
      </NotAbleToShowBanner>
    );
  }

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
            Token Mint :{' '}
            <Form.Select
              hidden={mintList.length <= 0}
              aria-label="Default select example"
              onChange={(value) => setMintPubKey(value.target.value)}
              defaultValue={mintKey?.toString()}
            >
              {mintList.map((key) => {
                return (
                  <option key={key.toString()} value={key.toString()}>
                    {key.toString()}
                  </option>
                );
              })}
            </Form.Select>
            <MintAccordians mintKey={mintKey} />
          </Col>
        </Split>
      </Row>
    </Stack>
  );
}

export default TokenPage;
