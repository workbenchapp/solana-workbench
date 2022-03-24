import path from 'path';
import winston from 'winston';
import fs from 'fs';
import logfmt from 'logfmt';
import { RESOURCES_PATH, WORKBENCH_DIR_PATH, WORKBENCH_VERSION } from './const';

const MAX_LOG_FILE_BYTES = 5 * 1028 * 1028;

let logger = winston.createLogger({
  transports: [new winston.transports.Console()],
});

const LOG_DIR_PATH = path.join(WORKBENCH_DIR_PATH, 'logs');
const LOG_FILE_PATH = path.join(LOG_DIR_PATH, 'latest.log');
const LOG_KV_PAD = 50;

if (!fs.existsSync(LOG_DIR_PATH)) {
  fs.mkdirSync(LOG_DIR_PATH);
}

const initLogging = async () => {
  // todo: could do better log rotation,
  // but this will do for now to avoid infinite growth
  try {
    const stat = await fs.promises.stat(LOG_FILE_PATH);
    if (stat.size > MAX_LOG_FILE_BYTES) {
      await fs.promises.rm(LOG_FILE_PATH);
    }
    // might get exception if file does not exist,
    // but it's expected.
    //
    // eslint-disable-next-line no-empty
  } catch (error) {}

  const logfmtFormat = winston.format.printf((info) => {
    const { timestamp } = info.metadata;
    delete info.metadata.timestamp;
    return `${timestamp} ${info.level.toUpperCase()} ${info.message.padEnd(
      LOG_KV_PAD,
      ' '
    )}${typeof info.metadata === 'object' && logfmt.stringify(info.metadata)}`;
  });
  const loggerConfig: winston.LoggerOptions = {
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.metadata(),
      logfmtFormat
    ),
    transports: [
      new winston.transports.File({
        filename: LOG_FILE_PATH,
        handleExceptions: true,
      }),
    ],
  };
  if (process.env.NODE_ENV === 'development') {
    loggerConfig.transports = [new winston.transports.Console()];
  }
  logger = winston.createLogger(loggerConfig);
  logger.info('Workbench session begin', {
    WORKBENCH_VERSION,
    RESOURCES_PATH,
  });
};

export { logger, initLogging };
