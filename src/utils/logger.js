import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';

const logger = isProd
  ? pino({ level: 'info' })
  : pino({ level: 'debug', transport: { target: 'pino-pretty' } });

export const logInfo = (msg, meta = {}) => logger.info(msg, meta);
export const logError = (msg, meta = {}) => logger.error(msg, meta);
export const logDebug = (msg, meta = {}) => logger.debug(msg, meta);
