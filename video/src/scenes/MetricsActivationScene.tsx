import {useCurrentFrame} from 'remotion';
import {Backdrop} from '../components/Backdrop';
import {DemoSurface} from '../components/DemoSurface';
import {HighlightBox} from '../components/HighlightBox';
import {KineticHeadline} from '../components/KineticHeadline';
import {SignalBadge} from '../components/SignalBadge';
import {routeScreens, taskWorkflowStats, tasksHeadline} from '../data/trailerData';
import {easedProgress} from '../lib/motion';

const SCALE = 1520 / 1280;
const s = (value: number) => value * SCALE;

export const MetricsActivationScene = () => {
  const frame = useCurrentFrame();
  const totalProgress = easedProgress(frame, 8, 28);
  const activeProgress = easedProgress(frame, 16, 28);
  const completedProgress = easedProgress(frame, 24, 28);
  const summaryBox = easedProgress(frame, 12, 18);
  const filterBox = easedProgress(frame, 28, 18);
  const firstTaskBox = easedProgress(frame, 46, 18);
  const secondTaskBox = easedProgress(frame, 64, 18);

  return (
    <Backdrop>
      <KineticHeadline frame={frame} beat={tasksHeadline} titleSize={68} subtitleSize={22} style={{left: 120, top: 92, width: 660}} />
      <SignalBadge x={1160} y={112} progress={totalProgress} label={taskWorkflowStats[0].label} value={`${Math.round(taskWorkflowStats[0].value * totalProgress)}`} icon="tasks" />
      <SignalBadge x={1372} y={112} progress={activeProgress} label={taskWorkflowStats[1].label} value={`${Math.round(taskWorkflowStats[1].value * activeProgress)}`} icon="productivity" />
      <SignalBadge x={1584} y={112} progress={completedProgress} label={taskWorkflowStats[2].label} value={`${Math.round(taskWorkflowStats[2].value * completedProgress)}`} icon="analytics" />
      <DemoSurface
        frame={frame}
        src={routeScreens.tasks}
        style={{left: 260, top: 186}}
        rotateX={{from: 5, to: 1.5}}
        rotateY={{from: -5, to: 2}}
        scale={{from: 1.04, to: 1.005}}
        translateX={{from: 48, to: -18}}
        translateY={{from: 18, to: -6}}
        imageScale={{from: 1.035, to: 1.01}}
        imageX={{from: -8, to: 0}}
      >
        <HighlightBox x={s(310)} y={s(170)} width={s(938)} height={s(82)} progress={summaryBox} label="Task totals" />
        <HighlightBox x={s(310)} y={s(278)} width={s(938)} height={s(104)} progress={filterBox} label="Search and filters" />
        <HighlightBox x={s(310)} y={s(406)} width={s(938)} height={s(132)} progress={firstTaskBox} label="High-priority task" />
        <HighlightBox x={s(310)} y={s(558)} width={s(938)} height={s(132)} progress={secondTaskBox} label="Responsive fix" />
      </DemoSurface>
    </Backdrop>
  );
};
