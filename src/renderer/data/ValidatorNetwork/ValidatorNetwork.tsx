import * as sol from '@solana/web3.js';

import { useEffect } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import DropdownButton from 'react-bootstrap/DropdownButton';
import Dropdown from 'react-bootstrap/Dropdown';
import { faNetworkWired, faCircle } from '@fortawesome/free-solid-svg-icons';

import { useInterval, useAppSelector, useAppDispatch } from '../../hooks';
import {
  Net,
  netToURL,
  NetStatus,
  setNet,
  setState,
  selectValidatorNetworkState,
} from './validatorNetworkState';

const validatorState = async (net: Net): Promise<NetStatus> => {
  let solConn: sol.Connection;

  // Connect to cluster
  try {
    solConn = new sol.Connection(netToURL(net));
    await solConn.getEpochInfo();
  } catch (error) {
    return NetStatus.Unavailable;
  }
  return NetStatus.Running;
};

function ValidatorNetwork() {
  const validator = useAppSelector(selectValidatorNetworkState);
  const { net } = validator;
  const dispatch = useAppDispatch();

  useEffect(() => {
    validatorState(net)
      .then((state) => {
        return dispatch(setState(state));
      })
      /* eslint-disable no-console */
      .catch(console.log);
  }, [dispatch, net, validator]);

  useInterval(() => {
    validatorState(net)
      .then((state) => {
        return dispatch(setState(state));
      })
      .catch(console.log);
  }, 5000);

  const netDropdownSelect = (eventKey: string | null) => {
    // TODO: analytics('selectNet', { prevNet: net, newNet: eventKey });
    if (eventKey) {
      dispatch(setState(NetStatus.Unknown));
      dispatch(setNet(eventKey as Net));
    }
  };

  let statusText = validator.status as string;
  let statusClass = 'text-danger';
  if (validator.status === NetStatus.Running) {
    statusText = 'Available';
    statusClass = 'text-success';
  }
  const statusDisplay = (
    <span className="badge p-2">
      <FontAwesomeIcon className={statusClass} icon={faCircle} />
      {statusText}
    </span>
  );

  const netDropdownTitle = (
    <>
      <FontAwesomeIcon className="me-1" icon={faNetworkWired} />{' '}
      <span>{net}</span>
      {statusDisplay}
    </>
  );

  return (
    <DropdownButton
      size="sm"
      id="dropdown-basic-button"
      title={netDropdownTitle}
      onSelect={netDropdownSelect}
      className="ms-2 float-end"
      align="end"
    >
      <Dropdown.Item eventKey={Net.Localhost} href="#">
        {Net.Localhost}
      </Dropdown.Item>
      <Dropdown.Item eventKey={Net.Dev} href="#">
        {Net.Dev}
      </Dropdown.Item>
      <Dropdown.Item eventKey={Net.Test} href="#">
        {Net.Test}
      </Dropdown.Item>
      <Dropdown.Item eventKey={Net.MainnetBeta} href="#">
        {Net.MainnetBeta}
      </Dropdown.Item>
    </DropdownButton>
  );
}

export default ValidatorNetwork;
