import amplitude from 'amplitude-js';

import { useAppSelector } from '../hooks';
import { selectConfigState, ConfigKey } from '../data/Config/configState';

const AMPLITUDE_KEY = 'f1cde3642f7e0f483afbb7ac15ae8277';
const AMPLITUDE_HEARTBEAT_INTERVAL = 3600000;

amplitude.getInstance().init(AMPLITUDE_KEY);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Analytics = (event: string, metadata: any) => {
  const storedConfig = useAppSelector(selectConfigState);
  if (storedConfig) {
    if (
      process.env.NODE_ENV !== 'development' &&
      ConfigKey.AnalyticsEnabled in storedConfig &&
      storedConfig[ConfigKey.AnalyticsEnabled] === 'true'
    ) {
      amplitude.getInstance().logEvent(event, metadata);
    }
  }
};

// Analytics('openApp', {});  // TODO: disabled this one as it crashes sometimes
setInterval(() => {
  Analytics('heartbeat', {});
}, AMPLITUDE_HEARTBEAT_INTERVAL);

export default Analytics;
