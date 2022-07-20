// eslint-disable-next-line import/prefer-default-export
export const logger = (() => {
  return window.electron?.log;
})();

// TODO: make this selectable - Return information at the selected commitment level
//      [possible values: processed, confirmed, finalized]
//      cli default seems to be finalized
// The _get_ data commitment level - can cause mutation API calls to fail (i think due to wallet-adapter things)
export const commitmentLevel = 'processed';
