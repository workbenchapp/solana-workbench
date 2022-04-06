export const loadState = (stateName: string) => {
  try {
    const serializedState = localStorage.getItem(stateName);
    if (serializedState === null) {
      return undefined;
    }
    return JSON.parse(serializedState);
  } catch (err) {
    return undefined;
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const saveState = (stateName: string, state: any) => {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem(stateName, serializedState);
  } catch (err) {
    throw new Error(`Can't save changes in local storage: ${err}`);
  }
};
