import amplitude from 'amplitude-js';

const AMPLITUDE_KEY = 'f1cde3642f7e0f483afbb7ac15ae8277';
const AMPLITUDE_HEARTBEAT_INTERVAL = 3600000;

amplitude.getInstance().init(AMPLITUDE_KEY);

const analytics = (event: string, metadata: any) => {
  if (process.env.NODE_ENV !== 'development' /* and user has not opted out */) {
    amplitude.getInstance().logEvent(event, metadata);
  }
};

analytics('openApp', {});
setInterval(() => {
  analytics('heartbeat', {});
}, AMPLITUDE_HEARTBEAT_INTERVAL);

export default analytics;
