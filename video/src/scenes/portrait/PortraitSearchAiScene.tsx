import {useCurrentFrame} from 'remotion';
import {AppChrome} from '../../components/AppChrome';
import {TypingMessage} from '../../components/TypingMessage';
import {searchBeat, searchHeadline} from '../../data/trailerData';
import {easedProgress} from '../../lib/motion';
import {trackeepTheme} from '../../theme/trackeep';
import {PortraitSceneShell} from './PortraitSceneShell';

export const PortraitSearchAiScene = () => {
  const frame = useCurrentFrame();
  const resultProgress = easedProgress(frame, 44, 54);

  return (
    <PortraitSceneShell frame={frame} beat={searchHeadline}>
      <div style={{position: 'absolute', left: 90, top: 470}}>
        <AppChrome
          frame={frame}
          activeNav="AI Assistant"
          sidebarItems={[]}
          showSidebar={false}
          searchText={searchBeat.query}
          searchDelay={18}
          width={900}
          height={980}
        >
          <div style={{display: 'flex', flexDirection: 'column', gap: 18}}>
            <div style={{borderRadius: 22, border: `1px solid ${trackeepTheme.colors.border}`, background: 'rgba(255,255,255,0.02)', padding: '22px 24px'}}>
              <div style={{fontSize: 28, fontWeight: 700, color: trackeepTheme.colors.text, marginBottom: 14}}>Priority results</div>
              {['API Documentation', 'Review pull requests', 'Fix responsive issues'].map((item, index) => (
                <div
                  key={item}
                  style={{
                    borderRadius: 16,
                    border: `1px solid ${trackeepTheme.colors.border}`,
                    padding: '16px 18px',
                    marginTop: index === 0 ? 0 : 12,
                    opacity: resultProgress
                  }}
                >
                  <div style={{fontSize: 24, fontWeight: 600, color: trackeepTheme.colors.text}}>{item}</div>
                  <div style={{fontSize: 18, color: trackeepTheme.colors.textMuted, marginTop: 6}}>{['Closest deadline', 'Needs review', 'Shipping blocker'][index]}</div>
                </div>
              ))}
            </div>
            <div style={{borderRadius: 22, border: `1px solid ${trackeepTheme.colors.border}`, background: 'rgba(255,255,255,0.02)', padding: '22px 24px'}}>
              <div style={{fontSize: 28, fontWeight: 700, color: trackeepTheme.colors.text, marginBottom: 8}}>AI Assistant</div>
              <div style={{fontSize: 18, color: trackeepTheme.colors.textMuted, marginBottom: 18}}>Your intelligent workspace companion</div>
              <TypingMessage frame={frame} delay={72} text={searchBeat.reply} />
            </div>
          </div>
        </AppChrome>
      </div>
    </PortraitSceneShell>
  );
};
