import {useCurrentFrame} from 'remotion';
import {Backdrop} from '../components/Backdrop';
import {DemoSurface} from '../components/DemoSurface';
import {HighlightBox} from '../components/HighlightBox';
import {KineticHeadline} from '../components/KineticHeadline';
import {SignalBadge} from '../components/SignalBadge';
import {dashboardHeadline, routeScreens} from '../data/trailerData';
import {easedProgress} from '../lib/motion';

const SCALE = 1520 / 1280;
const s = (value: number) => value * SCALE;

export const DashboardFlybyScene = () => {
  const frame = useCurrentFrame();
  const docsProgress = easedProgress(frame, 10, 26);
  const tasksProgress = easedProgress(frame, 18, 28);
  const productivityProgress = easedProgress(frame, 26, 28);
  const metricsBox = easedProgress(frame, 12, 22);
  const achievementsBox = easedProgress(frame, 30, 20);
  const deadlinesBox = easedProgress(frame, 46, 20);
  const sidebarBox = easedProgress(frame, 56, 20);

  return (
    <Backdrop>
      <KineticHeadline frame={frame} beat={dashboardHeadline} titleSize={72} subtitleSize={22} style={{left: 120, top: 92, width: 620}} />
      <SignalBadge x={120} y={330} progress={docsProgress} label="Documents" value={`${Math.round(18 * docsProgress)}`} icon="documents" />
      <SignalBadge x={120} y={424} progress={tasksProgress} label="Active Work" value={`${Math.round(28 * tasksProgress)}`} icon="tasks" />
      <SignalBadge x={120} y={518} progress={productivityProgress} label="Productivity" value={`${Math.round(78 * productivityProgress)}%`} icon="productivity" />
      <DemoSurface
        frame={frame}
        src={routeScreens.dashboard}
        style={{left: 310, top: 166}}
        rotateX={{from: 7, to: 2}}
        rotateY={{from: -8, to: 1.5}}
        scale={{from: 1.06, to: 1.01}}
        translateX={{from: 82, to: -24}}
        translateY={{from: 24, to: -6}}
        imageScale={{from: 1.05, to: 1.015}}
        imageX={{from: -16, to: 0}}
        imageY={{from: -8, to: 0}}
      >
        <HighlightBox x={s(308)} y={s(118)} width={s(942)} height={s(244)} progress={metricsBox} label="Metric density" />
        <HighlightBox x={s(12)} y={s(78)} width={s(252)} height={s(640)} progress={sidebarBox} label="Route breadth" />
        <HighlightBox x={s(310)} y={s(392)} width={s(458)} height={s(248)} progress={achievementsBox} label="Recent wins" />
        <HighlightBox x={s(792)} y={s(392)} width={s(458)} height={s(248)} progress={deadlinesBox} label="Upcoming deadlines" align="top-right" />
      </DemoSurface>
    </Backdrop>
  );
};
