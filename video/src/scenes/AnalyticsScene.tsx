import {useCurrentFrame} from 'remotion';
import {Backdrop} from '../components/Backdrop';
import {DemoSurface} from '../components/DemoSurface';
import {HighlightBox} from '../components/HighlightBox';
import {KineticHeadline} from '../components/KineticHeadline';
import {SignalBadge} from '../components/SignalBadge';
import {analyticsHeadline, analyticsSummary, routeScreens} from '../data/trailerData';
import {formatAnalyticsHours, formatMetricValue} from '../lib/format';
import {easedProgress} from '../lib/motion';

const SCALE = 1520 / 1280;
const s = (value: number) => value * SCALE;

export const AnalyticsScene = () => {
  const frame = useCurrentFrame();
  const hoursProgress = easedProgress(frame, 8, 28);
  const tasksProgress = easedProgress(frame, 16, 28);
  const bookmarksProgress = easedProgress(frame, 24, 28);
  const commitsProgress = easedProgress(frame, 32, 28);
  const summaryBox = easedProgress(frame, 14, 18);
  const habitBox = easedProgress(frame, 38, 18);
  const learningBox = easedProgress(frame, 58, 18);

  return (
    <Backdrop>
      <KineticHeadline frame={frame} beat={analyticsHeadline} titleSize={66} subtitleSize={22} style={{left: 120, top: 92, width: 680}} />
      <SignalBadge x={1050} y={112} progress={hoursProgress} label="Hours" value={formatAnalyticsHours(analyticsSummary[0].target * hoursProgress)} icon="time" />
      <SignalBadge x={1260} y={112} progress={tasksProgress} label="Tasks" value={formatMetricValue(analyticsSummary[1], analyticsSummary[1].target * tasksProgress)} icon="tasks" />
      <SignalBadge x={1470} y={112} progress={bookmarksProgress} label="Bookmarks" value={formatMetricValue(analyticsSummary[2], analyticsSummary[2].target * bookmarksProgress)} icon="bookmarks" />
      <SignalBadge x={1680} y={112} progress={commitsProgress} label="Commits" value={formatMetricValue(analyticsSummary[3], analyticsSummary[3].target * commitsProgress)} icon="github" />
      <DemoSurface
        frame={frame}
        src={routeScreens.analytics}
        style={{left: 260, top: 186}}
        rotateX={{from: 4.5, to: 1.25}}
        rotateY={{from: -4, to: 1.75}}
        scale={{from: 1.035, to: 1.005}}
        translateX={{from: 40, to: -12}}
        translateY={{from: 18, to: -4}}
        imageScale={{from: 1.03, to: 1.01}}
      >
        <HighlightBox x={s(310)} y={s(184)} width={s(938)} height={s(100)} progress={summaryBox} label="Top-line metrics" />
        <HighlightBox x={s(790)} y={s(310)} width={s(458)} height={s(190)} progress={habitBox} label="Habit tracking" align="top-right" />
        <HighlightBox x={s(311)} y={s(526)} width={s(936)} height={s(182)} progress={learningBox} label="Learning progress" />
      </DemoSurface>
    </Backdrop>
  );
};
