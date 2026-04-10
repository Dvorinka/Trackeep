import {interpolate, useCurrentFrame} from 'remotion';
import {Backdrop} from '../components/Backdrop';
import {IconBadge} from '../components/IconBadge';
import {KineticHeadline} from '../components/KineticHeadline';
import {RoutePreviewCard} from '../components/RoutePreviewCard';
import {montageHeadline, montageModules, routePreviews} from '../data/trailerData';
import {springIn} from '../lib/motion';
import {trackeepTheme} from '../theme/trackeep';

export const MontageScene = () => {
  const frame = useCurrentFrame();
  const centerGlow = springIn(frame, 30, 8, 22);

  return (
    <Backdrop>
      <KineticHeadline
        frame={frame}
        beat={montageHeadline}
        titleSize={70}
        subtitleSize={22}
        maxWidth={1120}
        style={{left: 300, top: 84, width: 1320, alignItems: 'center'}}
      />
      <div
        style={{
          position: 'absolute',
          left: 430,
          top: 232,
          width: 1060,
          height: 560,
          borderRadius: 999,
          background: 'radial-gradient(circle, rgba(57,185,255,0.2) 0%, rgba(57,185,255,0.05) 38%, rgba(57,185,255,0) 72%)',
          opacity: centerGlow,
          transform: `scale(${interpolate(centerGlow, [0, 1], [0.9, 1.08])})`
        }}
      />
      <RoutePreviewCard beat={routePreviews[0]} progress={springIn(frame, 30, 10, 22)} x={520} y={244} width={880} height={500} emphasis />
      <RoutePreviewCard beat={routePreviews[1]} progress={springIn(frame, 30, 18, 22)} x={140} y={300} width={330} height={222} />
      <RoutePreviewCard beat={routePreviews[3]} progress={springIn(frame, 30, 24, 22)} x={1450} y={300} width={330} height={222} />
      <RoutePreviewCard beat={routePreviews[2]} progress={springIn(frame, 30, 30, 22)} x={220} y={610} width={360} height={236} />
      <RoutePreviewCard beat={routePreviews[4]} progress={springIn(frame, 30, 36, 22)} x={1340} y={610} width={360} height={236} />
      <div style={{position: 'absolute', left: 380, top: 866, width: 1160, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16}}>
        {montageModules.map((module, index) => {
          const progress = springIn(frame, 30, 44 + index * 4, 20);
          const floatingY = Math.sin((frame + index * 5) / 12) * 3;
          return (
            <div
              key={module.label}
              style={{
                height: 62,
                padding: '0 18px',
                borderRadius: 18,
                border: `1px solid ${trackeepTheme.colors.borderStrong}`,
                background: 'rgba(8, 12, 18, 0.82)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                opacity: progress,
                transform: `translate3d(0, ${interpolate(progress, [0, 1], [14 - floatingY, floatingY])}px, 0) scale(${interpolate(progress, [0, 1], [0.94, 1])})`,
                boxShadow: '0 18px 44px rgba(0, 0, 0, 0.34)'
              }}
            >
              <IconBadge icon={module.icon} size={16} />
              <div style={{fontSize: 18, fontWeight: 700, letterSpacing: '-0.03em', color: trackeepTheme.colors.text}}>{module.label}</div>
            </div>
          );
        })}
      </div>
    </Backdrop>
  );
};
