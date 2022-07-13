import { BrowserWindow, dialog } from 'electron';
import { FetchAnchorIDLRequest } from '../types/types';
import { execAsync, RESOURCES_PATH } from './const';
import { logger } from './logger';

const fetchAnchorIdl = async (msg: FetchAnchorIDLRequest) => {
  // Anchor doesn't seem to accept a flag for where Anchor.toml is (???)
  // so we do this for now
  try {
    const cwd = process.cwd();
    process.chdir(RESOURCES_PATH);
    const { stdout } = await execAsync(`anchor idl fetch ${msg.programID}`);
    process.chdir(cwd);
    return JSON.parse(stdout);
  } catch (error) {
    logger.error(error);
    return {
      error,
    };
  }
  return {
    error: 'Error getting Anchor IDL',
  };
};

const selectAnchorDir = async (msg: any, mainWindow: BrowserWindow | null) => {
  if (mainWindow) {
    const res = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
    });
    return { res };
  }
  return { error: 'No Electron window found' };
};

export { fetchAnchorIdl, selectAnchorDir };
