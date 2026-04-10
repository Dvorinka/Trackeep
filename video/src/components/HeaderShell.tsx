import {IconChevronDown, IconLink, IconMenu2, IconUpload} from '@tabler/icons-react';
import {interpolate, useVideoConfig} from 'remotion';
import {springIn} from '../lib/motion';
import {trackeepTheme} from '../theme/trackeep';
import {SearchField} from './SearchField';

interface HeaderShellProps {
  frame: number;
  searchText?: string;
  searchDelay?: number;
}

const controlButtonStyle = {
  width: 40,
  height: 40,
  borderRadius: 10,
  border: `1px solid ${trackeepTheme.colors.border}`,
  background: 'rgba(255,255,255,0.02)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
} as const;

export const HeaderShell = ({frame, searchText, searchDelay = 0}: HeaderShellProps) => {
  const {fps} = useVideoConfig();
  const entrance = springIn(frame, fps, 6, 22);

  return (
    <div
      style={{
        height: 78,
        borderBottom: `1px solid ${trackeepTheme.colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 18px 14px 22px',
        opacity: entrance,
        transform: `translate3d(0, ${interpolate(entrance, [0, 1], [-14, 0])}px, 0)`
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
        <div style={{width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <IconMenu2 size={22} stroke={1.9} color={trackeepTheme.colors.text} />
        </div>
        <SearchField frame={frame} delay={searchDelay} query={searchText} />
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
        <div
          style={{
            height: 44,
            padding: '0 18px',
            borderRadius: 10,
            background: trackeepTheme.colors.primary,
            color: '#03131d',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 18,
            fontWeight: 700,
            boxShadow: `0 0 28px ${trackeepTheme.colors.primarySoft}`
          }}
        >
          <IconUpload size={16} stroke={2} />
          Import a document
        </div>
        <div style={controlButtonStyle}>
          <IconLink size={16} stroke={1.9} color={trackeepTheme.colors.textMuted} />
        </div>
        <div style={controlButtonStyle}>
          <IconChevronDown size={16} stroke={1.9} color={trackeepTheme.colors.textMuted} />
        </div>
        <div
          style={{
            height: 40,
            padding: '0 12px',
            borderRadius: 10,
            border: `1px solid ${trackeepTheme.colors.border}`,
            background: 'rgba(255,255,255,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              background: trackeepTheme.colors.primary,
              color: '#03131d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '-0.03em'
            }}
          >
            DU
          </div>
          <IconChevronDown size={14} stroke={1.9} color={trackeepTheme.colors.textMuted} />
        </div>
      </div>
    </div>
  );
};
