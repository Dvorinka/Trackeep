import trackeepLogo from '../../../frontend/public/trackeep.svg';
import {
  IconBookmark,
  IconBrandGithub,
  IconCalendar,
  IconChartLine,
  IconChecklist,
  IconClock,
  IconFolder,
  IconHome,
  IconMessageCircle,
  IconNotes,
  IconSchool,
  IconSparkles,
  IconUsers,
  IconVideo
} from '@tabler/icons-react';
import {Img, interpolate, useVideoConfig} from 'remotion';
import {springIn} from '../lib/motion';
import {trackeepTheme} from '../theme/trackeep';

interface SidebarShellProps {
  frame: number;
  items: string[];
  active: string;
}

const navIconMap = {
  Home: IconHome,
  Bookmarks: IconBookmark,
  Tasks: IconChecklist,
  'Time Tracking': IconClock,
  Calendar: IconCalendar,
  Files: IconFolder,
  Notes: IconNotes,
  Messages: IconMessageCircle,
  YouTube: IconVideo,
  Members: IconUsers,
  Learning: IconSchool,
  Stats: IconChartLine,
  GitHub: IconBrandGithub,
  'AI Assistant': IconSparkles
} as const;

export const SidebarShell = ({frame, items, active}: SidebarShellProps) => {
  const {fps} = useVideoConfig();
  const entrance = springIn(frame, fps, 0, 28);

  return (
    <div
      style={{
        width: 278,
        borderRight: `1px solid ${trackeepTheme.colors.border}`,
        background: 'rgba(7,8,12,0.76)',
        padding: '18px 14px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        opacity: entrance,
        transform: `translate3d(${interpolate(entrance, [0, 1], [-24, 0])}px, 0, 0)`
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: 12, padding: '4px 8px 10px'}}>
        <Img src={trackeepLogo} style={{width: 22, height: 22}} />
        <div style={{fontSize: 18, fontWeight: 700, letterSpacing: '-0.03em', color: trackeepTheme.colors.text}}>Trackeep</div>
      </div>
      <div
        style={{
          height: 48,
          borderRadius: 12,
          border: `1px solid ${trackeepTheme.colors.borderStrong}`,
          background: 'rgba(255,255,255,0.02)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
          color: trackeepTheme.colors.text,
          fontSize: 17,
          fontWeight: 600
        }}
      >
        <span>Trackeep Workspace</span>
        <span style={{color: trackeepTheme.colors.textMuted}}>⌄</span>
      </div>
      <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
        {items.map((item, index) => {
          const isActive = item === active;
          const Icon = navIconMap[item as keyof typeof navIconMap] ?? IconFolder;
          return (
            <div
              key={item}
              style={{
                height: 40,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '0 12px',
                fontSize: 16,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? trackeepTheme.colors.text : trackeepTheme.colors.textMuted,
                background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                border: isActive ? `1px solid rgba(255,255,255,0.04)` : '1px solid transparent',
                opacity: springIn(frame, fps, 8 + index * 2, 18)
              }}
            >
              <Icon size={16} stroke={1.9} color={isActive ? trackeepTheme.colors.primary : trackeepTheme.colors.textMuted} />
              <span>{item}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
