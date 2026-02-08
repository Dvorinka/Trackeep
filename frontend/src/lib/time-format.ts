// Utility functions for formatting time durations

export interface TimeDuration {
  years: number;
  months: number;
  weeks: number;
  days: number;
  hours: number;
  minutes: number;
}

export function formatDuration(totalHours: number): string {
  if (totalHours < 1) {
    const minutes = Math.round(totalHours * 60);
    return `${minutes}m`;
  }

  const duration = breakDownDuration(totalHours);
  const parts: string[] = [];

  if (duration.years > 0) {
    parts.push(`${duration.years}y`);
  }
  if (duration.months > 0) {
    parts.push(`${duration.months}mo`);
  }
  if (duration.weeks > 0) {
    parts.push(`${duration.weeks}w`);
  }
  if (duration.days > 0) {
    parts.push(`${duration.days}d`);
  }
  if (duration.hours > 0) {
    parts.push(`${duration.hours}h`);
  }

  // If we have multiple parts, show the most significant 2-3
  if (parts.length > 3) {
    return parts.slice(0, 3).join(' ');
  }
  
  // If we have just hours and it's less than 24, show just hours
  if (parts.length === 1 && parts[0].includes('h')) {
    return parts[0];
  }

  return parts.join(' ');
}

export function formatDurationShort(totalHours: number): string {
  if (totalHours < 24) {
    return `${Math.round(totalHours)}h`;
  }

  const duration = breakDownDuration(totalHours);
  
  if (duration.years > 0) {
    return `${duration.years}y ${duration.months}mo`;
  }
  if (duration.months > 0) {
    return `${duration.months}mo ${duration.weeks}w`;
  }
  if (duration.weeks > 0) {
    return `${duration.weeks}w ${duration.days}d`;
  }
  if (duration.days > 0) {
    return `${duration.days}d ${duration.hours}h`;
  }
  
  return `${duration.hours}h`;
}

export function formatDurationDetailed(totalHours: number): string {
  const duration = breakDownDuration(totalHours);
  const parts: string[] = [];

  if (duration.years > 0) parts.push(`${duration.years} year${duration.years !== 1 ? 's' : ''}`);
  if (duration.months > 0) parts.push(`${duration.months} month${duration.months !== 1 ? 's' : ''}`);
  if (duration.weeks > 0) parts.push(`${duration.weeks} week${duration.weeks !== 1 ? 's' : ''}`);
  if (duration.days > 0) parts.push(`${duration.days} day${duration.days !== 1 ? 's' : ''}`);
  if (duration.hours > 0) parts.push(`${duration.hours} hour${duration.hours !== 1 ? 's' : ''}`);

  if (parts.length === 0) {
    const minutes = Math.round(totalHours * 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  if (parts.length === 1) {
    return parts[0];
  }

  if (parts.length === 2) {
    return parts.join(' and ');
  }

  return parts.slice(0, -1).join(', ') + ', and ' + parts[parts.length - 1];
}

function breakDownDuration(totalHours: number): TimeDuration {
  const hoursInDay = 24;
  const hoursInWeek = hoursInDay * 7;
  const hoursInMonth = hoursInDay * 30.44; // Average month length
  const hoursInYear = hoursInDay * 365.25; // Account for leap years

  let remaining = totalHours;

  const years = Math.floor(remaining / hoursInYear);
  remaining -= years * hoursInYear;

  const months = Math.floor(remaining / hoursInMonth);
  remaining -= months * hoursInMonth;

  const weeks = Math.floor(remaining / hoursInWeek);
  remaining -= weeks * hoursInWeek;

  const days = Math.floor(remaining / hoursInDay);
  remaining -= days * hoursInDay;

  const hours = Math.floor(remaining);
  remaining -= hours;

  const minutes = Math.round(remaining * 60);

  return {
    years,
    months,
    weeks,
    days,
    hours,
    minutes
  };
}

export function getLargestTimeUnit(totalHours: number): { value: number; unit: string } {
  const duration = breakDownDuration(totalHours);
  
  if (duration.years > 0) return { value: duration.years, unit: 'years' };
  if (duration.months > 0) return { value: duration.months, unit: 'months' };
  if (duration.weeks > 0) return { value: duration.weeks, unit: 'weeks' };
  if (duration.days > 0) return { value: duration.days, unit: 'days' };
  if (duration.hours > 0) return { value: duration.hours, unit: 'hours' };
  
  return { value: Math.round(totalHours * 60), unit: 'minutes' };
}
