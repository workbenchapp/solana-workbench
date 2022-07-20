import * as sol from '@solana/web3.js';
import { useEffect } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import { NavLink } from 'react-router-dom';
import { GetValidatorConnection, logger } from '../../common/globals';
import { useAppDispatch, useAppSelector, useInterval } from '../../hooks';
import {
  Net,
  NetStatus,
  selectValidatorNetworkState,
  setNet,
  setState,
} from './validatorNetworkState';

const validatorState = async (net: Net): Promise<NetStatus> => {
  let solConn: sol.Connection;

  // Connect to cluster
  try {
    solConn = GetValidatorConnection(net);
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
  }, 11111);

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
    <>
      <IconMdiCircle className={`mx-1 inline-block ${statusClass}`} />
      <span className="mr-2">{statusText}</span>
    </>
  );

  const netDropdownTitle = (
    <>
      <IconMdiVectorTriangle className="inline-block" /> {net}
      {statusDisplay}
    </>
  );

  function GetLocalnetManageText() {
    if (
      validator.net === Net.Localhost &&
      validator.status !== NetStatus.Running
    ) {
      // TODO: consider using icons and having STOP, START, MANAGE...
      return <NavLink to="/validator">Manage {Net.Localhost}</NavLink>;
    }
    return <>{Net.Localhost}</>;
  }

  return (
    <DropdownButton
      size="sm"
      title={netDropdownTitle}
      onSelect={netDropdownSelect}
      align="end"
    >
      <Dropdown.Item eventKey={Net.Localhost} href="#">
        <GetLocalnetManageText />
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
