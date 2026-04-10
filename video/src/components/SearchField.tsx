import {interpolate, useVideoConfig} from 'remotion';
import {IconSearch} from '@tabler/icons-react';
import {easedProgress, springIn} from '../lib/motion';
import {useTrailerConfig} from '../lib/trailer-config';
import {trackeepTheme} from '../theme/trackeep';

interface SearchFieldProps {
  frame: number;
  query?: string;
  delay?: number;
  placeholder?: string;
  width?: number;
}

export const SearchField = ({
  frame,
  query,
  delay = 0,
  placeholder = 'Quick search',
  width = 320
}: SearchFieldProps) => {
  const {fps} = useVideoConfig();
  const {effects} = useTrailerConfig();
  const isLite = effects === 'lite';
  const entrance = springIn(frame, fps, delay, 24);
  const typing = easedProgress(frame, delay + 10, 54);
  const typedLength = query ? Math.max(0, Math.floor(query.length * typing)) : 0;
  const typedQuery = query ? query.slice(0, typedLength) : '';
  const displayText = typedQuery || placeholder;
  const isPlaceholder = typedLength === 0;
  const cursorOpacity = Math.sin(frame / 3) > 0 ? 1 : 0.2;

  return (
    <div
      style={{
        width,
        height: 44,
        borderRadius: 10,
        border: `1px solid ${trackeepTheme.colors.border}`,
        background: 'rgba(10,12,16,0.66)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 14px',
        opacity: entrance,
        transform: `translate3d(0, ${interpolate(entrance, [0, 1], [14, 0])}px, 0) scale(${interpolate(entrance, [0, 1], [0.97, 1])})`,
        boxShadow: isLite ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.03)'
      }}
    >
      <IconSearch size={16} stroke={1.9} color={trackeepTheme.colors.textMuted} />
      <div
        style={{
          color: isPlaceholder ? trackeepTheme.colors.textMuted : trackeepTheme.colors.text,
          fontSize: 18,
          fontWeight: 500,
          letterSpacing: '-0.02em',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        {displayText}
        {query ? <span style={{opacity: cursorOpacity, color: trackeepTheme.colors.primary, marginLeft: 2}}>|</span> : null}
      </div>
    </div>
  );
};
