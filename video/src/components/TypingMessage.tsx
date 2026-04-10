import {interpolate, useVideoConfig} from 'remotion';
import {easedProgress, springIn} from '../lib/motion';
import {trackeepTheme} from '../theme/trackeep';
import {IconBadge} from './IconBadge';

interface TypingMessageProps {
  frame: number;
  delay?: number;
  text: string;
  timestamp?: string;
}

export const TypingMessage = ({frame, delay = 0, text, timestamp = '08:25 AM'}: TypingMessageProps) => {
  const {fps} = useVideoConfig();
  const entrance = springIn(frame, fps, delay, 28);
  const typingProgress = easedProgress(frame, delay + 18, 86);
  const visibleLength = Math.max(0, Math.floor(text.length * typingProgress));
  const visibleText = text.slice(0, visibleLength);
  const cursorOpacity = Math.sin(frame / 3) > 0 ? 1 : 0.2;

  return (
    <div
      style={{
        borderRadius: 24,
        border: `1px solid ${trackeepTheme.colors.borderStrong}`,
        background: 'rgba(255,255,255,0.02)',
        padding: '22px 24px',
        display: 'flex',
        gap: 18,
        opacity: entrance,
        transform: `translate3d(0, ${interpolate(entrance, [0, 1], [24, 0])}px, 0)`
      }}
    >
      <IconBadge icon="ai" size={22} />
      <div style={{display: 'flex', flexDirection: 'column', gap: 12, flex: 1}}>
        <div style={{fontSize: 28, lineHeight: 1.3, color: trackeepTheme.colors.text, letterSpacing: '-0.03em', minHeight: 80}}>
          {visibleText}
          <span style={{opacity: cursorOpacity, color: trackeepTheme.colors.primary}}>|</span>
        </div>
        <div style={{fontSize: 18, color: trackeepTheme.colors.textMuted}}>{timestamp}</div>
      </div>
    </div>
  );
};
