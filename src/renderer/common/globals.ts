export const logger = (() => {
  return window.electron?.log;
})();
