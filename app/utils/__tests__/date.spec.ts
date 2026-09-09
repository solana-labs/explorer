import { describe, expect, it } from 'vitest';

import { displayTimestampAbsolute, displayTimestampRelative, formatDuration, formatRelativeTime } from '../date';

const NOW = new Date('2026-05-25T12:00:00Z').getTime();
const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const PAST_CASES: Array<[label: string, offsetMs: number, expected: string]> = [
    ['1s', 1 * SECOND, '1 second ago'],
    ['3s', 3 * SECOND, '5 seconds ago'],
    ['5s', 5 * SECOND, '10 seconds ago'],
    ['10s', 10 * SECOND, '20 seconds ago'],
    ['20s', 20 * SECOND, 'half a minute ago'],
    ['30s', 30 * SECOND, 'half a minute ago'],
    ['40s', 40 * SECOND, '1 minute ago'],
    ['60s', 60 * SECOND, '1 minute ago'],
    ['89s', 89 * SECOND, '1 minute ago'],
    ['90s', 90 * SECOND, '2 minutes ago'],
    ['5min', 5 * MINUTE, '5 minutes ago'],
    ['44min', 44 * MINUTE, '44 minutes ago'],
    ['45min', 45 * MINUTE, 'about 1 hour ago'],
    ['90min', 90 * MINUTE, 'about 2 hours ago'],
    ['22h', 22 * HOUR, 'about 22 hours ago'],
    ['36h', 36 * HOUR, '1 day ago'],
    ['25d', 25 * DAY, '25 days ago'],
    ['45d', 45 * DAY, 'about 2 months ago'],
    ['11mo', 11 * 30 * DAY, '11 months ago'],
    ['13mo', 13 * 30 * DAY, 'about 1 year ago'],
    ['18mo', 18 * 30 * DAY, 'over 1 year ago'],
    ['3y', 3 * 12 * 30 * DAY, 'almost 3 years ago'],
];

const FUTURE_CASES: Array<[label: string, offsetMs: number, expected: string]> = [
    ['1s', 1 * SECOND, 'in 1 second'],
    ['3s', 3 * SECOND, 'in 5 seconds'],
    ['30s', 30 * SECOND, 'in half a minute'],
    ['60s', 60 * SECOND, 'in 1 minute'],
    ['90s', 90 * SECOND, 'in 2 minutes'],
    ['5min', 5 * MINUTE, 'in 5 minutes'],
    ['45min', 45 * MINUTE, 'in about 1 hour'],
    ['22h', 22 * HOUR, 'in about 22 hours'],
    ['36h', 36 * HOUR, 'in 1 day'],
    ['25d', 25 * DAY, 'in 25 days'],
    ['45d', 45 * DAY, 'in about 2 months'],
    ['18mo', 18 * 30 * DAY, 'in over 1 year'],
];

describe('formatRelativeTime', () => {
    it.each(PAST_CASES)('should render past %s as %s', (_label, offset, expected) => {
        expect(formatRelativeTime(NOW - offset, NOW)).toBe(expected);
    });

    it.each(FUTURE_CASES)('should render future %s as %s', (_label, offset, expected) => {
        expect(formatRelativeTime(NOW + offset, NOW)).toBe(expected);
    });
});

const DURATION_CASES: Array<[seconds: number, expected: string]> = [
    [0, '1 second'],
    [1, '1 second'],
    [3, '5 seconds'],
    [30, 'half a minute'],
    [60, '1 minute'],
    [90, '2 minutes'],
    [5 * 60, '5 minutes'],
    [60 * 60, 'about 1 hour'],
    [5 * 60 * 60, 'about 5 hours'],
    [24 * 60 * 60, '1 day'],
    [5 * 24 * 60 * 60, '5 days'],
    [30 * 24 * 60 * 60, 'about 1 month'],
    [365 * 24 * 60 * 60, 'about 1 year'],
    [-1, '1 second'],
    [-60, '1 minute'],
    [-86400, '1 day'],
];

describe('formatDuration', () => {
    it.each(DURATION_CASES)('should render %i seconds as %s', (seconds, expected) => {
        expect(formatDuration(seconds, 'seconds')).toBe(expected);
    });
});

// One representative case per granularity band, plus its future ("in …") counterpart. Calendar-based
// bands (months/years) are asymmetric by design: the same day count spans a different number of
// whole months/years depending on the direction from NOW.
const RELATIVE_PAST_CASES: Array<[label: string, offsetMs: number, expected: string]> = [
    ['25s', 25 * SECOND, '25 seconds ago'],
    ['3m20s', 3 * MINUTE + 20 * SECOND, '3 minutes 20 seconds ago'],
    ['9m59s', 9 * MINUTE + 59 * SECOND, '9 minutes 59 seconds ago'],
    ['25m', 25 * MINUTE, '25 minutes ago'],
    ['59m', 59 * MINUTE, '59 minutes ago'],
    ['3h15m', 3 * HOUR + 15 * MINUTE, '3 hours 15 minutes ago'],
    ['7h59m', 7 * HOUR + 59 * MINUTE, '7 hours 59 minutes ago'],
    ['20h', 20 * HOUR, '20 hours ago'],
    ['47h', 47 * HOUR, '47 hours ago'],
    ['5d4h', 5 * DAY + 4 * HOUR, '5 days 4 hours ago'],
    ['11d', 11 * DAY, '11 days ago'],
    ['20d', 20 * DAY, '20 days ago'],
    ['29d', 29 * DAY, '29 days ago'],
    ['100d', 100 * DAY, '3 months 11 days ago'],
    ['400d', 400 * DAY, '1 year 1 month ago'],
    ['4y', 4 * 365 * DAY, '3 years ago'],
];

const RELATIVE_FUTURE_CASES: Array<[label: string, offsetMs: number, expected: string]> = [
    ['25s', 25 * SECOND, 'in 25 seconds'],
    ['3m20s', 3 * MINUTE + 20 * SECOND, 'in 3 minutes 20 seconds'],
    ['25m', 25 * MINUTE, 'in 25 minutes'],
    ['3h15m', 3 * HOUR + 15 * MINUTE, 'in 3 hours 15 minutes'],
    ['20h', 20 * HOUR, 'in 20 hours'],
    ['5d4h', 5 * DAY + 4 * HOUR, 'in 5 days 4 hours'],
    ['20d', 20 * DAY, 'in 20 days'],
    ['100d', 100 * DAY, 'in 3 months 8 days'],
    ['400d', 400 * DAY, 'in 1 year 1 month'],
    ['4y', 4 * 365 * DAY, 'in 3 years'],
];

describe('displayTimestampRelative', () => {
    it.each(RELATIVE_PAST_CASES)('should render past %s as %s', (_label, offset, expected) => {
        expect(displayTimestampRelative(NOW - offset, NOW)).toBe(expected);
    });

    it.each(RELATIVE_FUTURE_CASES)('should render future %s as %s', (_label, offset, expected) => {
        expect(displayTimestampRelative(NOW + offset, NOW)).toBe(expected);
    });

    it('should render a sub-second difference as "just now"', () => {
        expect(displayTimestampRelative(NOW, NOW)).toBe('just now');
        expect(displayTimestampRelative(NOW - 200, NOW)).toBe('just now');
    });

    it('should return an empty string for non-finite inputs', () => {
        expect(displayTimestampRelative(NaN, NOW)).toBe('');
        expect(displayTimestampRelative(NOW, Infinity)).toBe('');
        expect(displayTimestampRelative(-Infinity, NOW)).toBe('');
    });
});

describe('displayTimestampAbsolute', () => {
    it('should render a UTC instant in date-first order with a short zone name', () => {
        expect(displayTimestampAbsolute(NOW, true)).toBe('May 25, 2026 at 12:00:00 UTC');
    });
});
