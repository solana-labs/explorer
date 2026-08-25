import { formatDistance, type Locale } from 'date-fns';
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

function pluralUnit(value: number, name: string): string {
    return `${value} ${name}${value === 1 ? '' : 's'}`;
}

const MINUTE_S = 60;
const HOUR_S = 3600;
const DAY_S = 86400;
const YEAR_S = 365 * DAY_S;
// A twelfth of the year, not a flat 30 days — otherwise 12×30 ≠ 365 and the remainder near a
// year rolls over to a nonsensical "12 months" / "2 years 12 months".
const MONTH_S = Math.floor(YEAR_S / 12);

// Human "time since" with granularity that coarsens as the event recedes, per these bands:
//   <10m  minutes + seconds   |  10m–1h  minutes         |  1h–8h   hours + minutes
//   8h–48h hours              |  48h–12d days + hours     |  12d–30d days
//   30d–365d months + days    |  1y–3y   years + months   |  >3y     years
// A zero secondary unit is dropped ("3 hours 0 minutes" → "3 hours"). Both args are milliseconds.
export function displayTimestampRelative(unixTimestampMs: number, nowMs: number): string {
    const diffSeconds = Math.round((nowMs - unixTimestampMs) / 1000);
    const abs = Math.abs(diffSeconds);

    let parts: string[];
    if (abs < 10 * MINUTE_S) {
        parts = [pluralUnit(Math.floor(abs / MINUTE_S), 'minute'), pluralUnit(abs % MINUTE_S, 'second')];
    } else if (abs < HOUR_S) {
        parts = [pluralUnit(Math.floor(abs / MINUTE_S), 'minute')];
    } else if (abs < 8 * HOUR_S) {
        parts = [
            pluralUnit(Math.floor(abs / HOUR_S), 'hour'),
            pluralUnit(Math.floor((abs % HOUR_S) / MINUTE_S), 'minute'),
        ];
    } else if (abs < 48 * HOUR_S) {
        parts = [pluralUnit(Math.floor(abs / HOUR_S), 'hour')];
    } else if (abs < 12 * DAY_S) {
        parts = [pluralUnit(Math.floor(abs / DAY_S), 'day'), pluralUnit(Math.floor((abs % DAY_S) / HOUR_S), 'hour')];
    } else if (abs < 30 * DAY_S) {
        parts = [pluralUnit(Math.floor(abs / DAY_S), 'day')];
    } else if (abs < YEAR_S) {
        parts = [
            pluralUnit(Math.floor(abs / MONTH_S), 'month'),
            pluralUnit(Math.floor((abs % MONTH_S) / DAY_S), 'day'),
        ];
    } else if (abs < 3 * YEAR_S) {
        parts = [
            pluralUnit(Math.floor(abs / YEAR_S), 'year'),
            pluralUnit(Math.floor((abs % YEAR_S) / MONTH_S), 'month'),
        ];
    } else {
        parts = [pluralUnit(Math.floor(abs / YEAR_S), 'year')];
    }

    // Drop a zero-valued unit; if everything is zero the event is right now.
    const text = parts.filter(part => !part.startsWith('0 ')).join(' ');
    if (text === '') return 'just now';
    return diffSeconds >= 0 ? `${text} ago` : `in ${text}`;
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
