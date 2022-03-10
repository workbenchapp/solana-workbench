import amplitude from 'amplitude-js';
import { ConfigKey } from 'types/types';

// TODO(nathanleclaire): Not the largest fan of this spaghetti-ish import
// renderer is really supposed to import common not vice versa
import store from '../renderer/store';

const AMPLITUDE_KEY = 'f1cde3642f7e0f483afbb7ac15ae8277';
const AMPLITUDE_HEARTBEAT_INTERVAL = 3600000;

amplitude.getInstance().init(AMPLITUDE_KEY);

const analytics = (event: string, metadata: any) => {
  if (
    process.env.NODE_ENV !== 'development' &&
    store.getState().config.values[ConfigKey.AnalyticsEnabled]
  ) {
    amplitude.getInstance().logEvent(event, metadata);
  }
};

analytics('openApp', {});
setInterval(() => {
  analytics('heartbeat', {});
}, AMPLITUDE_HEARTBEAT_INTERVAL);

export default analytics;
