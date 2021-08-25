const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

/**
 * Map of stringified `DateTimeFormatOptions` to cached `DateTimeFormat` instances.
 *
 * @type {Record<string, Intl.DateTimeFormat>}
 */
let formatters = {};

/**
 * Clears the cache of formatters.
 */
export function clearFormatters() {
  formatters = {};
}

/**
 * Calculate time delta in milliseconds between two `Date` objects
 *
 * @param {Date} date
 * @param {Date} now
 */
function delta(date, now) {
  // @ts-ignore
  return now - date;
}

/**
 * Return date string formatted with `options`.
 *
 * This is a caching wrapper for `Intl.DateTimeFormat.format`, useful because
 * constructing a `DateTimeFormat` is expensive.
 *
 * @param {Date} date
 * @param {Intl.DateTimeFormatOptions} options
 * @param {Intl} Intl - Test seam. JS `Intl` API implementation.
 * @returns {string}
 */
function format(date, options, Intl = window.Intl) {
  const key = JSON.stringify(options);
  let formatter = formatters[key];
  if (!formatter) {
    formatter = formatters[key] = new Intl.DateTimeFormat(undefined, options);
  }
  return formatter.format(date);
}

/**
 * @callback DateFormatter
 * @param {Date} date
 * @param {Date} now
 * @param {Intl} [intl]
 * @return {string} formatted date
 */

/** @type {DateFormatter} */
function nSec(date, now) {
  const n = Math.floor(delta(date, now) / SECOND);
  return `${n} secs ago`;
}

/** @type {DateFormatter} */
function nMin(date, now) {
  const n = Math.floor(delta(date, now) / MINUTE);
  const plural = n > 1 ? 's' : '';
  return `${n} min${plural} ago`;
}

/** @type {DateFormatter} */
function nHr(date, now) {
  const n = Math.floor(delta(date, now) / HOUR);
  const plural = n > 1 ? 's' : '';
  return `${n} hr${plural} ago`;
}

/** @type {DateFormatter} */
function dayAndMonth(date, now, Intl) {
  return format(date, { month: 'short', day: 'numeric' }, Intl);
}

/** @type {DateFormatter} */
function dayAndMonthAndYear(date, now, Intl) {
  return format(
    date,
    { day: 'numeric', month: 'short', year: 'numeric' },
    Intl
  );
}

/**
 * @typedef Breakpoint
 * @prop {(date: Date, now: Date) => boolean} test
 * @prop {(date: Date, now: Date, Intl?: typeof window.Intl) => string} formatter
 * @prop {number|null} nextUpdate
 */

/** @type {Breakpoint[]} */
const BREAKPOINTS = [
  {
    // Less than 30 seconds
    test: (date, now) => delta(date, now) < 30 * SECOND,
    formatter: () => 'Just now',
    nextUpdate: 1 * SECOND,
  },
  {
    // Less than 1 minute
    test: (date, now) => delta(date, now) < 1 * MINUTE,
    formatter: nSec,
    nextUpdate: 1 * SECOND,
  },
  {
    // Less than one hour
    test: (date, now) => delta(date, now) < 1 * HOUR,
    formatter: nMin,
    nextUpdate: 1 * MINUTE,
  },
  {
    // Less than one day
    test: (date, now) => delta(date, now) < 24 * HOUR,
    formatter: nHr,
    nextUpdate: 1 * HOUR,
  },
  {
    // This year
    test: (date, now) => date.getFullYear() === now.getFullYear(),
    formatter: dayAndMonth,
    nextUpdate: null,
  },
];

/** @type {Breakpoint} */
const DEFAULT_BREAKPOINT = {
  test: /* istanbul ignore next */ () => true,
  formatter: dayAndMonthAndYear,
  nextUpdate: null,
};

/**
 * Returns a dict that describes how to format the date based on the delta
 * between date and now.
 *
 * @param {Date} date - The date to consider as the timestamp to format.
 * @param {Date} now - The date to consider as the current time.
 * @return {Breakpoint} An object that describes how to format the date.
 */
function getBreakpoint(date, now) {
  for (let breakpoint of BREAKPOINTS) {
    if (breakpoint.test(date, now)) {
      return breakpoint;
    }
  }
  return DEFAULT_BREAKPOINT;
}

/**
 * See https://262.ecma-international.org/6.0/#sec-time-values-and-time-range
 *
 * @param {Date} date
 */
function isDateValid(date) {
  return !isNaN(date.valueOf());
}

/**
 * Return the number of milliseconds until the next update for a given date
 * should be handled, based on the delta between `date` and `now`.
 *
 * @param {Date|null} date
 * @param {Date} now
 * @return {Number|null} - ms until next update or `null` if no update
 *                         should occur
 */
export function nextFuzzyUpdate(date, now) {
  if (!date || !isDateValid(date) || !isDateValid(now)) {
    return null;
  }

  let nextUpdate = getBreakpoint(date, now).nextUpdate;

  if (nextUpdate === null) {
    return null;
  }

  // We don't want to refresh anything more often than 5 seconds
  nextUpdate = Math.max(nextUpdate, 5 * SECOND);

  // setTimeout limit is MAX_INT32=(2^31-1) (in ms),
  // which is about 24.8 days. So we don't set up any timeouts
  // longer than 24 days, that is, 2073600 seconds.
  nextUpdate = Math.min(nextUpdate, 2073600 * SECOND);

  return nextUpdate;
}

/**
 * Start an interval whose frequency depends on the age of a timestamp.
 *
 * This is useful for refreshing UI components displaying timestamps generated
 * by `formatRelativeDate`, since the output changes less often for older timestamps.
 *
 * @param {string} date - Date string to use to determine the interval frequency
 * @param {() => void} callback - Interval callback
 * @return {() => void} A function that cancels the interval
 */
export function decayingInterval(date, callback) {
  let timer;
  const timestamp = new Date(date);

  const update = () => {
    const fuzzyUpdate = nextFuzzyUpdate(timestamp, new Date());
    if (fuzzyUpdate === null) {
      return;
    }
    const nextUpdate = fuzzyUpdate + 500;
    timer = setTimeout(() => {
      callback();
      update();
    }, nextUpdate);
  };

  update();

  return () => clearTimeout(timer);
}

/**
 * Formats a date as a short approximate string relative to the current date.
 *
 * The level of precision is proportional to how recent the date is.
 *
 * For example:
 *
 *  - "Just now"
 *  - "5 minutes ago"
 *  - "25 Oct 2018"
 *
 * @param {Date|null} date - The date to consider as the timestamp to format.
 * @param {Date} now - The date to consider as the current time.
 * @param {Intl} [Intl] - Test seam. JS `Intl` API implementation.
 * @return {string} A 'fuzzy' string describing the relative age of the date.
 */
export function formatRelativeDate(date, now, Intl) {
  if (!date) {
    return '';
  }
  return getBreakpoint(date, now).formatter(date, now, Intl);
}

/**
 * Formats a date as an absolute string in a human readable format.
 *
 * The exact format will vary depending on the locale, but the verbosity will
 * be consistent across locales. In en-US for example this will look like:
 *
 *  "Sunday, Dec 17, 2017, 10:00 AM"
 *
 * @param {Date} date
 * @param {Intl} [Intl] - Test seam. JS `Intl` API implementation.
 * @return {string}
 */
export function formatDate(date, Intl) {
  return format(
    date,
    {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
    },
    Intl
  );
}
