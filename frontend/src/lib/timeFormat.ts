// Utility functions for formatting time durations in human-readable format

/**
 * Formats a duration in hours to human-readable format
 * @param totalHours Total duration in hours
 * @returns Formatted string (e.g., "2.5 days", "1 month", "3.2 years")
 */
export const formatDuration = (totalHours: number): string => {
  if (totalHours < 1) {
    const minutes = Math.round(totalHours * 60);
    return `${minutes}m`;
  }
  
  if (totalHours < 24) {
    return `${Math.round(totalHours * 10) / 10}h`;
  }
  
  const days = totalHours / 24;
  if (days < 7) {
    return `${Math.round(days * 10) / 10} days`;
  }
  
  const weeks = days / 7;
  if (weeks < 4) {
    return `${Math.round(weeks * 10) / 10} weeks`;
  }
  
  const months = days / 30.44; // Average month length
  if (months < 12) {
    return `${Math.round(months * 10) / 10} months`;
  }
  
  const years = months / 12;
  return `${Math.round(years * 10) / 10} years`;
};

/**
 * Formats a duration in hours to a compact format
 * @param totalHours Total duration in hours
 * @returns Compact formatted string (e.g., "2.5d", "1mo", "3.2y")
 */
export const formatDurationCompact = (totalHours: number): string => {
  if (totalHours < 1) {
    const minutes = Math.round(totalHours * 60);
    return `${minutes}m`;
  }
  
  if (totalHours < 24) {
    return `${Math.round(totalHours * 10) / 10}h`;
  }
  
  const days = totalHours / 24;
  if (days < 7) {
    return `${Math.round(days * 10) / 10}d`;
  }
  
  const weeks = days / 7;
  if (weeks < 4) {
    return `${Math.round(weeks * 10) / 10}w`;
  }
  
  const months = days / 30.44; // Average month length
  if (months < 12) {
    return `${Math.round(months * 10) / 10}mo`;
  }
  
  const years = months / 12;
  return `${Math.round(years * 10) / 10}y`;
};
