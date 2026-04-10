import type {ReactNode} from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {useTrailerConfig} from '../lib/trailer-config';
import {trackeepTheme} from '../theme/trackeep';

interface BackdropProps {
  children: ReactNode;
}

export const Backdrop = ({children}: BackdropProps) => {
  const {effects, layout} = useTrailerConfig();
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const isLite = effects === 'lite';
  const introFade = interpolate(frame, [0, 5, 14], [0.92, 0.52, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });
  const outroFade = interpolate(frame, [durationInFrames - 18, durationInFrames - 7, durationInFrames - 1], [0, 0.4, 0.86], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  return (
    <AbsoluteFill
      style={{
        background: layout === 'portrait'
          ? `radial-gradient(circle at 50% 9%, rgba(57,185,255,0.2) 0%, rgba(57,185,255,0) 30%), radial-gradient(circle at 14% 88%, rgba(57,185,255,0.08) 0%, rgba(57,185,255,0) 30%), linear-gradient(180deg, #07090d 0%, ${trackeepTheme.colors.backgroundDeep} 34%, #06080d 100%)`
          : `radial-gradient(circle at 78% 9%, rgba(57,185,255,0.18) 0%, rgba(57,185,255,0) 30%), radial-gradient(circle at 16% 86%, rgba(57,185,255,0.08) 0%, rgba(57,185,255,0) 30%), linear-gradient(180deg, #07090d 0%, ${trackeepTheme.colors.backgroundDeep} 36%, #06080d 100%)`
      }}
    >
      <AbsoluteFill
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.028) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.028) 1px, transparent 1px)',
          backgroundSize: isLite ? '92px 92px' : '72px 72px',
          opacity: isLite ? 0.14 : 0.22,
          maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.92), rgba(0,0,0,0.36))'
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.05) 0, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          opacity: isLite ? 0.02 : 0.08,
          mixBlendMode: 'screen'
        }}
      />
      {children}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(circle at 50% 44%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.54) 100%)',
          opacity: isLite ? 0.58 : 0.72,
          pointerEvents: 'none'
        }}
      />
      <AbsoluteFill
        style={{
          background: 'linear-gradient(180deg, rgba(2,4,7,0.56) 0%, rgba(2,4,7,0.1) 25%, rgba(2,4,7,0.08) 65%, rgba(2,4,7,0.72) 100%)',
          pointerEvents: 'none'
        }}
      />
      <AbsoluteFill
        style={{
          background: '#020305',
          opacity: introFade + outroFade,
          pointerEvents: 'none'
        }}
      />
    </AbsoluteFill>
  );
};
