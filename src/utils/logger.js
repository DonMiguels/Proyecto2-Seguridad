const DEFAULT_GMT_OFFSET = '-4'; // -4 else 0

const parseOffsetMinutes = (rawOffset) => {
  const value = (rawOffset || DEFAULT_GMT_OFFSET).toString().trim();

  const hourOnlyMatch = value.match(/^([+-]?\d{1,2})$/);
  if (hourOnlyMatch) {
    const hours = Number.parseInt(hourOnlyMatch[1], 10);
    if (!Number.isNaN(hours)) {
      return hours * 60;
    }
  }

  const hourMinuteMatch = value.match(/^([+-])(\d{1,2}):(\d{2})$/);
  if (hourMinuteMatch) {
    const sign = hourMinuteMatch[1] === '-' ? -1 : 1;
    const hours = Number.parseInt(hourMinuteMatch[2], 10);
    const minutes = Number.parseInt(hourMinuteMatch[3], 10);

    if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
      return sign * (hours * 60 + minutes);
    }
  }

  return 0;
};

const formatOffset = (offsetMinutes) => {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absMinutes = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absMinutes / 60)).padStart(2, '0');
  const minutes = String(absMinutes % 60).padStart(2, '0');
  return `${sign}${hours}:${minutes}`;
};

const getTimestampByOffset = () => {
  const offsetMinutes = parseOffsetMinutes(process.env.LOG_GMT_OFFSET);
  const shiftedDate = new Date(Date.now() + offsetMinutes * 60 * 1000);
  const isoWithoutZ = shiftedDate.toISOString().replace('Z', '');
  return `${isoWithoutZ}${formatOffset(offsetMinutes)}`;
};

const buildPrefix = (level) => {
  return `[${getTimestampByOffset()}] [${level}]`;
};

const logger = {
  info: (message, ...args) => {
    console.log(`${buildPrefix('INFO')} ${message}`, ...args);
  },
  warn: (message, ...args) => {
    console.warn(`${buildPrefix('WARN')} ${message}`, ...args);
  },
  error: (message, ...args) => {
    console.error(`${buildPrefix('ERROR')} ${message}`, ...args);
  },
};

export default logger;
