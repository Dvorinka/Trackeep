import type {ComponentType} from 'react';
import {
  IconActivity,
  IconBookmark,
  IconBrandGithub,
  IconChecklist,
  IconClock,
  IconDatabase,
  IconFileText,
  IconFlame,
  IconFolder,
  IconHome,
  IconMessageCircle,
  IconNotes,
  IconSchool,
  IconSearch,
  IconSparkles,
  IconVideo
} from '@tabler/icons-react';
import type {ShowcaseIcon} from '../data/types';
import {useTrailerConfig} from '../lib/trailer-config';
import {trackeepTheme} from '../theme/trackeep';

const iconMap: Record<ShowcaseIcon, ComponentType<{size?: number; stroke?: number; color?: string}>> = {
  home: IconHome,
  documents: IconFileText,
  bookmarks: IconBookmark,
  tasks: IconChecklist,
  notes: IconNotes,
  videos: IconVideo,
  learning: IconSchool,
  time: IconClock,
  productivity: IconActivity,
  storage: IconDatabase,
  analytics: IconActivity,
  github: IconBrandGithub,
  search: IconSearch,
  ai: IconSparkles,
  messages: IconMessageCircle,
  files: IconFolder,
  habit: IconFlame
};

interface IconBadgeProps {
  icon: ShowcaseIcon;
  size?: number;
  accent?: string;
}

export const IconBadge = ({icon, size = 16, accent = trackeepTheme.colors.primary}: IconBadgeProps) => {
  const {effects} = useTrailerConfig();
  const isLite = effects === 'lite';
  const Icon = iconMap[icon];

  return (
    <div
      style={{
        width: size + 14,
        height: size + 14,
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${trackeepTheme.colors.borderStrong}`,
        boxShadow: isLite ? '0 0 0 1px rgba(255,255,255,0.02)' : `0 0 0 1px rgba(255,255,255,0.02), 0 0 18px ${trackeepTheme.colors.primarySoft}`
      }}
    >
      <Icon size={size} stroke={1.8} color={accent} />
    </div>
  );
};
