import {
    differenceInDays,
    differenceInHours,
    differenceInMinutes,
    differenceInSeconds,
    type Duration,
    formatDistance,
    formatDuration as formatDurationParts,
    intervalToDuration,
    type Locale,
} from 'date-fns';
import { enUS } from 'date-fns/locale';

export function unixTimestampToMs(seconds: number): number {
    return seconds * 1000;
}

export function displayTimestamp(unixTimestamp: number, shortTimeZoneName = false): string {
    const expireDate = new Date(unixTimestamp);
    const dateString = new Intl.DateTimeFormat('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(expireDate);
    const timeString = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        hourCycle: 'h23',
        minute: 'numeric',
        second: 'numeric',
        timeZoneName: shortTimeZoneName ? 'short' : 'long',
    }).format(expireDate);
    return `${dateString} at ${timeString}`;
}

export function displayTimestampUtc(unixTimestamp: number, shortTimeZoneName = false): string {
    const expireDate = new Date(unixTimestamp);
    const dateString = new Intl.DateTimeFormat('en-US', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
        year: 'numeric',
    }).format(expireDate);
    const timeString = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        hourCycle: 'h23',
        minute: 'numeric',
        second: 'numeric',
        timeZone: 'UTC',
        timeZoneName: shortTimeZoneName ? 'short' : 'long',
    }).format(expireDate);
    return `${dateString} at ${timeString}`;
}

export function displayTimestampWithoutDate(unixTimestamp: number, shortTimeZoneName = true) {
    const expireDate = new Date(unixTimestamp);
    const timeString = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        hourCycle: 'h23',
        minute: 'numeric',
        second: 'numeric',
        timeZoneName: shortTimeZoneName ? 'short' : 'long',
    }).format(expireDate);
    return timeString;
}

// "Aug 6, 2026 at 06:41:51 UTC" — native en-US (CLDR) order: date, "at", 24h padded time, short
// zone name (UTC / GMT+3). `unixTimestampMs` is milliseconds, matching the other display* helpers.
export function displayTimestampAbsolute(unixTimestampMs: number, utc = false): string {
    const date = new Date(unixTimestampMs);
    const timeZone = utc ? 'UTC' : undefined;
    const dateString = new Intl.DateTimeFormat('en-US', {
        day: 'numeric',
        month: 'short',
        timeZone,
        year: 'numeric',
    }).format(date);
    const timeString = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        hourCycle: 'h23',
        minute: '2-digit',
        second: '2-digit',
        timeZone,
        timeZoneName: 'short',
    }).format(date);
    return `${dateString} at ${timeString}`;
}

const MINUTE_S = 60;
const HOUR_S = 3600;
const DAY_S = 86400;

// Human "time since" with granularity that coarsens as the event recedes, per these bands:
//   <10m  minutes + seconds   |  10m–1h  minutes         |  1h–8h   hours + minutes
//   8h–48h hours              |  48h–12d days + hours     |  12d–30d days
//   30d–365d months + days    |  1y–3y   years + months   |  >3y     years
// Built on date-fns difference/duration helpers so months and years are calendar-accurate (not a
// flat 30/365 days). date-fns' formatDuration drops a zero secondary unit ("3 hours 0 minutes" →
// "3 hours") and pluralizes for us. Both args are milliseconds.
export function displayTimestampRelative(unixTimestampMs: number, nowMs: number): string {
    // Guard against NaN/±Infinity: the date-fns helpers would otherwise yield an "Invalid Date"
    // duration and a nonsensical string. Callers pass a valid instant; this is pure defense.
    if (!Number.isFinite(unixTimestampMs) || !Number.isFinite(nowMs)) return '';

    const past = unixTimestampMs <= nowMs;
    const [from, to] = past ? [unixTimestampMs, nowMs] : [nowMs, unixTimestampMs];
    const seconds = differenceInSeconds(to, from);

    let duration: Duration;
    if (seconds < 10 * MINUTE_S) {
        duration = { minutes: differenceInMinutes(to, from), seconds: seconds % MINUTE_S };
    } else if (seconds < HOUR_S) {
        duration = { minutes: differenceInMinutes(to, from) };
    } else if (seconds < 8 * HOUR_S) {
        duration = { hours: differenceInHours(to, from), minutes: differenceInMinutes(to, from) % 60 };
    } else if (seconds < 48 * HOUR_S) {
        duration = { hours: differenceInHours(to, from) };
    } else if (seconds < 12 * DAY_S) {
        duration = { days: differenceInDays(to, from), hours: differenceInHours(to, from) % 24 };
    } else if (seconds < 30 * DAY_S) {
        duration = { days: differenceInDays(to, from) };
    } else {
        const calendar = intervalToDuration({ end: to, start: from });
        if (!calendar.years) {
            duration = { days: calendar.days, months: calendar.months };
        } else if (calendar.years < 3) {
            duration = { months: calendar.months, years: calendar.years };
        } else {
            duration = { years: calendar.years };
        }
    }

    const text = formatDurationParts(duration);
    if (text === '') return 'just now';
    return past ? `${text} ago` : `in ${text}`;
}

// Drops date-fns' "less than" prefixes on sub-minute buckets; everything else
// inherits stock en-US phrasing (about/almost/over/half a).
const relativeLocale: Locale = {
    ...enUS,
    formatDistance: (token, count, options) => {
        const noLessThan: Record<string, { one: string; other: string }> = {
            lessThanXMinutes: { one: '1 minute', other: '{{count}} minutes' },
            lessThanXSeconds: { one: '1 second', other: '{{count}} seconds' },
        };
        const override = noLessThan[token];
        if (!override) return enUS.formatDistance(token, count, options);
        const tpl = count === 1 ? override.one : override.other.replace('{{count}}', String(count));
        if (!options?.addSuffix) return tpl;
        return options.comparison && options.comparison > 0 ? `in ${tpl}` : `${tpl} ago`;
    },
};

export function formatDuration(value: number, _unit: 'seconds'): string {
    const abs = Math.abs(value);
    if (abs < 2) return '1 second';
    return formatDistance(0, abs * 1000, { includeSeconds: true, locale: relativeLocale });
}

export function formatRelativeTime(unixTimestamp: number, now: number = Date.now()): string {
    const diffMs = unixTimestamp - now;
    if (Math.abs(diffMs) < 2000) return diffMs > 0 ? 'in 1 second' : '1 second ago';
    return formatDistance(unixTimestamp, now, {
        addSuffix: true,
        includeSeconds: true,
        locale: relativeLocale,
    });
}
