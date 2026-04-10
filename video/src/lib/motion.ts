import type {CSSProperties} from 'react';
import {Easing, interpolate, spring} from 'remotion';

export const springIn = (frame: number, fps: number, delay = 0, durationInFrames = 30): number => {
  return spring({
    frame: Math.max(0, frame - delay),
    fps,
    durationInFrames,
    config: {
      damping: 200,
      stiffness: 140,
      mass: 0.8
    }
  });
};

export const easedProgress = (frame: number, start: number, duration: number): number => {
  return interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.22, 1, 0.36, 1)
  });
};

export const fadeSlideUpStyle = (progress: number, distance = 48): CSSProperties => {
  return {
    opacity: progress,
    transform: `translate3d(0, ${interpolate(progress, [0, 1], [distance, 0])}px, 0) scale(${interpolate(progress, [0, 1], [0.96, 1])})`,
    filter: `blur(${interpolate(progress, [0, 1], [10, 0])}px)`
  };
};
