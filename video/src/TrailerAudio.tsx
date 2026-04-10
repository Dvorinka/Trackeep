import {Audio, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {TRAILER_DURATION} from './data/trailerData';

export const TrailerAudio = () => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 24], [0, 0.48], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });
  const fadeOut = interpolate(frame, [TRAILER_DURATION - 36, TRAILER_DURATION], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  return <Audio src={staticFile('audio/trailer-bed.mp3')} volume={fadeIn * fadeOut} />;
};
