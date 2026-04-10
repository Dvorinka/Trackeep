import hljs from 'highlight.js/lib/common';
import { For, Show, createMemo, createSignal, type JSX } from 'solid-js';

import './NoteContentRenderer.css';

type NoteKind = 'markdown' | 'plain' | 'html';

type NoteBlock =
  | { type: 'heading'; level: 1 | 2 | 3 | 4; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'bullet-list'; items: string[] }
  | { type: 'ordered-list'; items: string[] }
  | { type: 'task-list'; items: Array<{ text: string; checked: boolean; taskIndex: number }> }
  | { type: 'quote'; text: string }
  | { type: 'code'; code: string; language?: string };

interface NoteContentRendererProps {
  content: string;
  kind: NoteKind;
  preview?: boolean;
  maxBlocks?: number;
  onToggleTask?: (taskIndex: number, nextChecked: boolean) => void;
}

type SupportedCodeLanguage =
  | 'auto'
  | 'bash'
  | 'go'
  | 'html'
  | 'javascript'
  | 'json'
  | 'markdown'
  | 'plaintext'
  | 'typescript'
  | 'xml';

const CODE_LANGUAGE_OPTIONS: Array<{ value: SupportedCodeLanguage; label: string }> = [
  { value: 'auto', label: 'Auto detect' },
  { value: 'json', label: 'JSON' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'go', label: 'Go' },
  { value: 'bash', label: 'Bash / Shell' },
  { value: 'html', label: 'HTML' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'plaintext', label: 'Plain text' },
];

const LANGUAGE_ALIASES: Record<string, SupportedCodeLanguage> = {
  auto: 'auto',
  bash: 'bash',
  console: 'bash',
  go: 'go',
  golang: 'go',
  html: 'html',
  javascript: 'javascript',
  js: 'javascript',
  json: 'json',
  markdown: 'markdown',
  md: 'markdown',
  plaintext: 'plaintext',
  shell: 'bash',
  sh: 'bash',
  text: 'plaintext',
  ts: 'typescript',
  typescript: 'typescript',
  xml: 'xml',
};

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const normalizeCodeLanguage = (value?: string): SupportedCodeLanguage => {
  if (!value) return 'auto';
  return LANGUAGE_ALIASES[value.trim().toLowerCase()] || 'auto';
};

const inferCodeLanguage = (code: string, explicitLanguage?: string): SupportedCodeLanguage => {
  const normalizedExplicit = normalizeCodeLanguage(explicitLanguage);
  if (normalizedExplicit !== 'auto') {
    return normalizedExplicit;
  }

  const trimmed = code.trim();
  if (!trimmed) {
    return 'plaintext';
  }

  try {
    JSON.parse(trimmed);
    return 'json';
  } catch {
    // not JSON
  }

  if (/^\s*</.test(trimmed) && /<\/?[a-z][\s\S]*>/i.test(trimmed)) {
    return 'html';
  }

  if (/\bfunc\s+\w+\s*\(|\bfmt\.\w+\(/.test(trimmed)) {
    return 'go';
  }

  if (/^\s*[$#]/m.test(trimmed) || /\b(curl|npm|pnpm|yarn|git)\b/.test(trimmed)) {
    return 'bash';
  }

  if (/\b(interface|type|readonly|as const)\b|:\s*[A-Z][A-Za-z0-9_<>,[\]?| ]*/.test(trimmed)) {
    return 'typescript';
  }

  if (/\b(const|let|var|function|=>|import|export)\b/.test(trimmed)) {
    return 'javascript';
  }

  if (/^#{1,6}\s/m.test(trimmed) || /\[[^\]]+\]\(([^)]+)\)/.test(trimmed)) {
    return 'markdown';
  }

  const autoDetected = hljs.highlightAuto(trimmed, ['json', 'typescript', 'javascript', 'go', 'bash', 'xml']).language;
  return normalizeCodeLanguage(autoDetected || 'plaintext');
};

const renderInlineText = (text: string) => {
  const normalized = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1 ($2)');
  const nodes: Array<string | JSX.Element> = [];
  const pattern = /(\[[^\]]+\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*|(https?:\/\/[^\s]+))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(normalized)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(normalized.slice(lastIndex, match.index));
    }

    const token = match[0];
    const markdownLink = match[1];
    const linkHref = match[2];
    const inlineCode = match[3];
    const strongText = match[4];
    const emphasisText = match[5];
    const directUrl = match[6];

    if (markdownLink && linkHref) {
      const linkMatch = markdownLink.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      const label = linkMatch?.[1] || markdownLink;
      const href = linkMatch?.[2] || linkHref;
      nodes.push(
        <a href={href} target="_blank" rel="noopener noreferrer" class="text-primary hover:underline break-all">
          {label}
        </a>
      );
    } else if (inlineCode) {
      nodes.push(
        <code class="rounded-md border border-border/60 bg-muted/80 px-1.5 py-0.5 font-mono text-[0.92em] text-primary">
          {inlineCode}
        </code>
      );
    } else if (strongText) {
      nodes.push(<strong class="font-semibold text-foreground">{strongText}</strong>);
    } else if (emphasisText) {
      nodes.push(<em class="italic">{emphasisText}</em>);
    } else {
      nodes.push(
        <a href={directUrl || token} target="_blank" rel="noopener noreferrer" class="text-primary hover:underline break-all">
          {directUrl || token}
        </a>
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < normalized.length) {
    nodes.push(normalized.slice(lastIndex));
  }

  return nodes;
};

const parseTextBlocks = (content: string, kind: Exclude<NoteKind, 'html'>): NoteBlock[] => {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: NoteBlock[] = [];
  let index = 0;
  let taskIndex = 0;

  const isMarkdown = kind === 'markdown';

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const codeFenceMatch = isMarkdown ? trimmed.match(/^```([\w-]+)?\s*$/) : null;
    if (codeFenceMatch) {
      const codeLines: string[] = [];
      const language = codeFenceMatch[1];
      index += 1;
      while (index < lines.length && !lines[index].trim().match(/^```$/)) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) {
        index += 1;
      }
      blocks.push({ type: 'code', code: codeLines.join('\n'), language });
      continue;
    }

    const headingMatch = isMarkdown ? line.match(/^(#{1,4})\s+(.*)$/) : null;
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length as 1 | 2 | 3 | 4,
        text: headingMatch[2].trim(),
      });
      index += 1;
      continue;
    }

    if (/^- \[( |x|X)\]\s+/.test(trimmed)) {
      const items: Array<{ text: string; checked: boolean; taskIndex: number }> = [];
      while (index < lines.length) {
        const taskMatch = lines[index].trim().match(/^- \[( |x|X)\]\s+(.*)$/);
        if (!taskMatch) break;
        items.push({
          text: taskMatch[2],
          checked: taskMatch[1].toLowerCase() === 'x',
          taskIndex,
        });
        taskIndex += 1;
        index += 1;
      }
      blocks.push({ type: 'task-list', items });
      continue;
    }

    if (/^- /.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length) {
        const listMatch = lines[index].trim().match(/^- (.*)$/);
        if (!listMatch || /^- \[( |x|X)\]\s+/.test(lines[index].trim())) break;
        items.push(listMatch[1]);
        index += 1;
      }
      blocks.push({ type: 'bullet-list', items });
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length) {
        const listMatch = lines[index].trim().match(/^\d+\.\s+(.*)$/);
        if (!listMatch) break;
        items.push(listMatch[1]);
        index += 1;
      }
      blocks.push({ type: 'ordered-list', items });
      continue;
    }

    if (/^>\s+/.test(trimmed)) {
      const quoteLines: string[] = [];
      while (index < lines.length) {
        const quoteMatch = lines[index].trim().match(/^>\s+(.*)$/);
        if (!quoteMatch) break;
        quoteLines.push(quoteMatch[1]);
        index += 1;
      }
      blocks.push({ type: 'quote', text: quoteLines.join(' ') });
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const paragraphLine = lines[index];
      const paragraphTrimmed = paragraphLine.trim();
      if (!paragraphTrimmed) break;
      if (isMarkdown && /^(#{1,4})\s+/.test(paragraphLine)) break;
      if (isMarkdown && /^```/.test(paragraphTrimmed)) break;
      if (/^- \[( |x|X)\]\s+/.test(paragraphTrimmed)) break;
      if (/^- /.test(paragraphTrimmed)) break;
      if (/^\d+\.\s+/.test(paragraphTrimmed)) break;
      if (/^>\s+/.test(paragraphTrimmed)) break;
      paragraphLines.push(paragraphTrimmed);
      index += 1;
    }

    if (paragraphLines.length > 0) {
      blocks.push({ type: 'paragraph', text: paragraphLines.join(' ') });
      continue;
    }

    index += 1;
  }

  return blocks;
};

const CodeBlock = (props: {
  code: string;
  initialLanguage?: string;
  preview?: boolean;
}) => {
  const autoDetectedLanguage = createMemo(() => inferCodeLanguage(props.code, props.initialLanguage));
  const [selectedLanguage, setSelectedLanguage] = createSignal<SupportedCodeLanguage>(
    normalizeCodeLanguage(props.initialLanguage)
  );

  const effectiveLanguage = createMemo<SupportedCodeLanguage>(() => {
    const selected = selectedLanguage();
    if (selected === 'auto') {
      return autoDetectedLanguage();
    }
    return selected;
  });

  const highlightedHtml = createMemo(() => {
    const activeLanguage = effectiveLanguage();
    if (activeLanguage === 'plaintext') {
      return escapeHtml(props.code);
    }

    try {
      const languageForHighlight = activeLanguage === 'html' ? 'xml' : activeLanguage;
      return hljs.highlight(props.code, { language: languageForHighlight }).value;
    } catch {
      return escapeHtml(props.code);
    }
  });

  const displayLanguageLabel = createMemo(() => {
    const activeLanguage = effectiveLanguage();
    const match = CODE_LANGUAGE_OPTIONS.find((option) => option.value === activeLanguage);
    return match?.label || activeLanguage;
  });

  return (
    <div
      class="overflow-hidden rounded-2xl border border-border/70 bg-[#0f1724] shadow-[0_20px_40px_-28px_rgba(15,23,36,0.9)]"
      onClick={(event) => event.stopPropagation()}
    >
      <div class="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.04] px-4 py-3">
        <div class="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-300">
          <span class="rounded-full border border-white/12 bg-white/8 px-2.5 py-1">{displayLanguageLabel()}</span>
          <Show when={selectedLanguage() === 'auto'}>
            <span class="text-[11px] tracking-[0.14em] text-slate-500">Auto</span>
          </Show>
        </div>
        <Show when={!props.preview}>
          <select
            value={selectedLanguage()}
            class="rounded-lg border border-white/12 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => setSelectedLanguage(event.currentTarget.value as SupportedCodeLanguage)}
          >
            <For each={CODE_LANGUAGE_OPTIONS}>
              {(option) => <option value={option.value}>{option.label}</option>}
            </For>
          </select>
        </Show>
      </div>
      <pre class={`overflow-x-auto px-4 py-4 text-sm leading-6 text-slate-100 ${props.preview ? 'max-h-72' : ''}`}>
        <code class={`hljs language-${effectiveLanguage()}`} innerHTML={highlightedHtml()} />
      </pre>
    </div>
  );
};

export const NoteContentRenderer = (props: NoteContentRendererProps) => {
  const blocks = createMemo(() => {
    if (props.kind === 'html') {
      return [] as NoteBlock[];
    }
    return parseTextBlocks(props.content, props.kind);
  });

  const visibleBlocks = createMemo(() => {
    if (!props.preview) {
      return blocks();
    }
    return blocks().slice(0, props.maxBlocks ?? 4);
  });

  return (
    <Show
      when={props.kind !== 'html'}
      fallback={
        <div
          class="note-renderer prose prose-invert max-w-none text-sm leading-6 text-foreground"
          onClick={(event) => event.stopPropagation()}
          innerHTML={props.content}
        />
      }
    >
      <div class={`note-renderer space-y-4 ${props.preview ? 'overflow-hidden' : ''}`}>
        <For each={visibleBlocks()}>
          {(block) => (
            <Show
              when={block.type === 'heading'}
              fallback={
                <Show
                  when={block.type === 'paragraph'}
                  fallback={
                    <Show
                      when={block.type === 'bullet-list'}
                      fallback={
                        <Show
                          when={block.type === 'ordered-list'}
                          fallback={
                            <Show
                              when={block.type === 'task-list'}
                              fallback={
                                <Show
                                  when={block.type === 'quote'}
                                  fallback={
                                    <CodeBlock
                                      code={(block as Extract<NoteBlock, { type: 'code' }>).code}
                                      initialLanguage={(block as Extract<NoteBlock, { type: 'code' }>).language}
                                      preview={props.preview}
                                    />
                                  }
                                >
                                  <blockquote class="rounded-r-xl border-l-4 border-primary/60 bg-muted/40 px-4 py-3 text-sm italic text-muted-foreground">
                                    {renderInlineText((block as Extract<NoteBlock, { type: 'quote' }>).text)}
                                  </blockquote>
                                </Show>
                              }
                            >
                              <div class="space-y-2" onClick={(event) => event.stopPropagation()}>
                                <For each={(block as Extract<NoteBlock, { type: 'task-list' }>).items}>
                                  {(item) => (
                                    <label class="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
                                      <input
                                        type="checkbox"
                                        checked={item.checked}
                                        class="mt-0.5 h-4 w-4 cursor-pointer accent-[hsl(var(--primary))]"
                                        disabled={!props.onToggleTask}
                                        onClick={(event) => event.stopPropagation()}
                                        onChange={(event) => props.onToggleTask?.(item.taskIndex, event.currentTarget.checked)}
                                      />
                                      <span class={`text-sm leading-6 ${item.checked ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                        {renderInlineText(item.text)}
                                      </span>
                                    </label>
                                  )}
                                </For>
                              </div>
                            </Show>
                          }
                        >
                          <ol class="list-decimal space-y-2 pl-5 text-sm leading-6 text-foreground">
                            <For each={(block as Extract<NoteBlock, { type: 'ordered-list' }>).items}>
                              {(item) => <li>{renderInlineText(item)}</li>}
                            </For>
                          </ol>
                        </Show>
                      }
                    >
                      <ul class="list-disc space-y-2 pl-5 text-sm leading-6 text-foreground">
                        <For each={(block as Extract<NoteBlock, { type: 'bullet-list' }>).items}>
                          {(item) => <li>{renderInlineText(item)}</li>}
                        </For>
                      </ul>
                    </Show>
                  }
                >
                  <p class="text-sm leading-7 text-muted-foreground">{renderInlineText((block as Extract<NoteBlock, { type: 'paragraph' }>).text)}</p>
                </Show>
              }
            >
              {(() => {
                const heading = block as Extract<NoteBlock, { type: 'heading' }>;
                const className = {
                  1: 'text-xl font-semibold tracking-tight text-foreground',
                  2: 'text-lg font-semibold tracking-tight text-foreground',
                  3: 'text-base font-semibold text-foreground',
                  4: 'text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground',
                }[heading.level];

                return <div class={className}>{renderInlineText(heading.text)}</div>;
              })()}
            </Show>
          )}
        </For>
      </div>
    </Show>
  );
};
