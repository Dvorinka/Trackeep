import type {MetricCard} from '../data/types';

export const formatMetricValue = (metric: MetricCard, value: number): string => {
  const prefix = metric.prefix ?? '';
  const suffix = metric.suffix ?? '';

  if (metric.decimals !== undefined) {
    return `${prefix}${value.toFixed(metric.decimals)}${suffix}`;
  }

  return `${prefix}${Math.round(value).toLocaleString('en-US')}${suffix}`;
};

export const formatStopwatch = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
};

export const formatAnalyticsHours = (hours: number): string => {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}h ${String(minutes).padStart(2, '0')}m`;
};

export const clamp = (value: number, min = 0, max = 1): number => {
  return Math.min(max, Math.max(min, value));
};
