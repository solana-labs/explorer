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
