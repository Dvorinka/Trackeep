import trackeepLogo from '../../../frontend/public/trackeep.svg';
import {Img, interpolate, useCurrentFrame} from 'remotion';
import {Backdrop} from '../components/Backdrop';
import {DemoSurface} from '../components/DemoSurface';
import {KineticHeadline} from '../components/KineticHeadline';
import {routeScreens} from '../data/trailerData';
import {trackeepTheme} from '../theme/trackeep';

export const ColdOpenScene = () => {
  const frame = useCurrentFrame();
  const logoOpacity = interpolate(frame, [0, 10, 24], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });
  const sweepWidth = interpolate(frame, [10, 30], [0, 260], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  return (
    <Backdrop>
      <div style={{position: 'absolute', inset: 0, padding: '118px 140px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 16, opacity: logoOpacity}}>
          <Img src={trackeepLogo} style={{width: 36, height: 36}} />
          <div style={{fontSize: 32, fontWeight: 700, letterSpacing: '-0.05em', color: trackeepTheme.colors.text}}>Trackeep</div>
        </div>
        <KineticHeadline
          frame={frame}
          beat={{
            kicker: 'Real Product Capture',
            title: 'Trackeep, in motion.',
            subtitle: 'Fast-cut walkthrough of the live interface.',
            align: 'left'
          }}
          titleSize={78}
          subtitleSize={22}
          style={{left: 140, top: 288, width: 680}}
        />
        <div
          style={{
            position: 'absolute',
            left: 140,
            top: 610,
            width: sweepWidth,
            height: 5,
            borderRadius: trackeepTheme.radius.pill,
            background: `linear-gradient(90deg, ${trackeepTheme.colors.primary} 0%, rgba(57,185,255,0) 100%)`,
            boxShadow: `0 0 36px ${trackeepTheme.colors.primaryGlow}`
          }}
        />
      </div>
      <DemoSurface
        frame={frame}
        src={routeScreens.dashboard}
        width={720}
        height={405}
        style={{left: 1080, top: 238, opacity: 0.52, filter: 'blur(0.3px)'}}
        rotateX={{from: 9, to: 4}}
        rotateY={{from: -14, to: -8}}
        scale={{from: 1.06, to: 1.02}}
        translateX={{from: 42, to: 0}}
        imageScale={{from: 1.08, to: 1.04}}
      />
    </Backdrop>
  );
};
