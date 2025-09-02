// https://github.com/Mihai-CristianPopa/Running_App/blob/deployment/utils/helpers.js

const MINUTES_PER_HOUR = 60;
const SECONDS_PER_HOUR = MINUTES_PER_HOUR * 60;

function formatTimeWithZeroInFront(value) {
    return value < 10 ? `0${value}` : String(value);
}

export function computeStrTimeFromSeconds(seconds) {
    if (!seconds) throw new Error("Can't compute time if seconds is not defined");
    seconds = parseInt(seconds);
    const hours = Math.floor(seconds / SECONDS_PER_HOUR);
    const minutes = Math.floor((seconds % SECONDS_PER_HOUR) / 60);
    const secs = seconds % 60;

    const hoursStr = formatTimeWithZeroInFront(hours);
    const minutesStr = formatTimeWithZeroInFront(minutes);
    const secondsStr = formatTimeWithZeroInFront(secs);

    return hours === 0
        ? `00:${minutesStr}:${secondsStr}`
        : `${hoursStr}:${minutesStr}:${secondsStr}`;
}

/** Transforms distance from meters in kilometers with 2 decimals string */
export function computeKilometersFromMeters(distance) {
  return `${(parseFloat(distance) / 1000).toFixed(2)} km`;
}