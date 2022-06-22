import amplitude from 'amplitude-js';
import store from '@/store';
import { ConfigKey } from '../data/Config/configState';

const AMPLITUDE_KEY = 'f1cde3642f7e0f483afbb7ac15ae8277';
const AMPLITUDE_HEARTBEAT_INTERVAL = 3600000;
const logger = window.electron.log;

amplitude.getInstance().init(AMPLITUDE_KEY);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const analytics = (event: string, metadata: any) => {
  const storedConfig = store.getState().config.values;
  if (storedConfig) {
    if (process.env.NODE_ENV !== 'development') {
      if (
        ConfigKey.AnalyticsEnabled in storedConfig &&
        storedConfig[ConfigKey.AnalyticsEnabled] === 'true'
      ) {
        amplitude.getInstance().logEvent(event, metadata);
      }
    } else {
      logger.info('analytics event', event);
    }
  }
};

analytics('openApp', {});
setInterval(() => {
  analytics('heartbeat', {});
}, AMPLITUDE_HEARTBEAT_INTERVAL);

export default analytics;
