import type {CSSProperties, ReactNode} from 'react';
import {Img, interpolate, staticFile} from 'remotion';
import {useTrailerConfig} from '../lib/trailer-config';
import {trackeepTheme} from '../theme/trackeep';

interface MotionRange {
  from: number;
  to: number;
}

interface DemoSurfaceProps {
  frame: number;
  src: string;
  width?: number;
  height?: number;
  style?: CSSProperties;
  children?: ReactNode;
  rotateX?: MotionRange;
  rotateY?: MotionRange;
  rotateZ?: MotionRange;
  scale?: MotionRange;
  translateX?: MotionRange;
  translateY?: MotionRange;
  imageScale?: MotionRange;
  imageX?: MotionRange;
  imageY?: MotionRange;
}

const resolveMotion = (frame: number, motion: MotionRange | undefined, fallback: number) => {
  if (!motion) {
    return fallback;
  }

  return interpolate(frame, [0, 120], [motion.from, motion.to], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });
};

export const DemoSurface = ({
  frame,
  src,
  width = 1520,
  height = 855,
  style,
  children,
  rotateX,
  rotateY,
  rotateZ,
  scale,
  translateX,
  translateY,
  imageScale,
  imageX,
  imageY
}: DemoSurfaceProps) => {
  const {effects} = useTrailerConfig();
  const isLite = effects === 'lite';
  const resolvedRotateX = resolveMotion(frame, rotateX, 0);
  const resolvedRotateY = resolveMotion(frame, rotateY, 0);
  const resolvedRotateZ = resolveMotion(frame, rotateZ, 0);
  const resolvedScale = resolveMotion(frame, scale, 1);
  const resolvedTranslateX = resolveMotion(frame, translateX, 0);
  const resolvedTranslateY = resolveMotion(frame, translateY, 0);
  const resolvedImageScale = resolveMotion(frame, imageScale, 1);
  const resolvedImageX = resolveMotion(frame, imageX, 0);
  const resolvedImageY = resolveMotion(frame, imageY, 0);

  return (
    <div
      style={{
        position: 'absolute',
        width,
        height,
        borderRadius: 32,
        overflow: 'hidden',
        border: `1px solid ${trackeepTheme.colors.borderStrong}`,
        background: trackeepTheme.colors.backgroundDeep,
        boxShadow: isLite
          ? '0 24px 70px rgba(0, 0, 0, 0.34), 0 0 0 1px rgba(255,255,255,0.03)'
          : '0 46px 140px rgba(0, 0, 0, 0.58), 0 22px 62px rgba(0, 0, 0, 0.42), 0 0 0 1px rgba(255,255,255,0.04)',
        transform: `perspective(2200px) rotateX(${resolvedRotateX}deg) rotateY(${resolvedRotateY}deg) rotateZ(${resolvedRotateZ}deg) translate3d(${resolvedTranslateX}px, ${resolvedTranslateY}px, 0) scale(${resolvedScale})`,
        transformOrigin: 'center center',
        ...style
      }}
    >
      <Img
        src={staticFile(src)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `translate3d(${resolvedImageX}px, ${resolvedImageY}px, 0) scale(${resolvedImageScale})`
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(5,7,10,0.14) 0%, rgba(5,7,10,0) 28%, rgba(5,7,10,0.3) 100%)'
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, rgba(4,6,9,0.34) 0%, rgba(4,6,9,0) 22%, rgba(4,6,9,0) 78%, rgba(4,6,9,0.38) 100%)'
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04), inset 0 -64px 82px rgba(0,0,0,0.2)',
          pointerEvents: 'none'
        }}
      />
      {children}
    </div>
  );
};
