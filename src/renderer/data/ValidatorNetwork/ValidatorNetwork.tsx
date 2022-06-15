import * as sol from '@solana/web3.js';
import { useEffect } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import { useAppDispatch, useAppSelector, useInterval } from '../../hooks';
import {
  Net,
  NetStatus,
  netToURL,
  selectValidatorNetworkState,
  setNet,
  setState,
} from './validatorNetworkState';

const logger = window.electron.log;

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
      .catch(logger.info);
  }, [dispatch, net, validator]);

  const effect = () => {};
  useEffect(effect, []);

  useInterval(() => {
    validatorState(net)
      .then((state) => {
        return dispatch(setState(state));
      })
      .catch((err) => {
        logger.debug(err);
      });
  }, 5000);

  const netDropdownSelect = (eventKey: string | null) => {
    // TODO: analytics('selectNet', { prevNet: net, newNet: eventKey });
    if (eventKey) {
      dispatch(setState(NetStatus.Unknown));
      dispatch(setNet(eventKey as Net));
    }
  };

  let statusText = validator.status as string;
  let statusClass = 'text-red-500';
  if (validator.status === NetStatus.Running) {
    statusText = 'Available';
    statusClass = 'text-green-500';
  }
  const statusDisplay = (
    <span className="badge p-2">
      <IconMdiCircle className={`mr-2 ${statusClass}`} />
      {statusText}
    </span>
  );

  const netDropdownTitle = (
    <>
      <IconMdiVectorTriangle /> {net}
      {statusDisplay}
    </>
  );

  return (
    <DropdownButton
      size="sm"
      title={netDropdownTitle}
      onSelect={netDropdownSelect}
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
