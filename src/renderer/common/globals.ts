// eslint-disable-next-line import/prefer-default-export
export const logger = (() => {
  return window.electron?.log;
})();
