import { FetchAnchorIDLRequest } from '../types/types';
import { execAsync, RESOURCES_PATH } from './const';

const fetchAnchorIdl = async (msg: FetchAnchorIDLRequest) => {
  // Anchor doesn't seem to accept a flag for where Anchor.toml is (???)
  // so we do this for now
  const cwd = process.cwd();
  process.chdir(RESOURCES_PATH);
  const { stdout } = await execAsync(`anchor idl fetch ${msg.programID}`);
  process.chdir(cwd);
  return JSON.parse(stdout);
};

export default fetchAnchorIdl;
