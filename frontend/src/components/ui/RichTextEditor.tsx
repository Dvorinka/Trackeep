import { createSignal, For, Show } from 'solid-js';
import { 
  IconBold, 
  IconItalic, 
  IconUnderline, 
  IconStrikethrough,
  IconHeading,
  IconList,
  IconListNumbers,
  IconQuote,
  IconCode,
  IconLink,
  IconPhoto,
  IconPaperclip,
  IconEye,
  IconCheckbox
} from '@tabler/icons-solidjs';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  mode?: 'wysiwyg' | 'markdown' | 'html';
  class?: string;
}

export const RichTextEditor = (props: RichTextEditorProps) => {
  const [mode, setMode] = createSignal<'wysiwyg' | 'markdown' | 'html'>(props.mode || 'wysiwyg');
  const [isPreviewMode, setIsPreviewMode] = createSignal(false);

  const insertText = (before: string, after: string = '') => {
    const textarea = document.querySelector('textarea');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const newText = before + selectedText + after;
    
    const newValue = textarea.value.substring(0, start) + newText + textarea.value.substring(end);
    props.onChange(newValue);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  const insertMarkdown = (markdown: string) => {
    insertText(markdown);
  };

  const insertHtml = (html: string) => {
    insertText(html);
  };

  const handleFileUpload = (type: 'image' | 'file') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'image' ? 'image/*' : '*/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // In a real app, this would upload the file and return a URL
        const mockUrl = `/uploads/${file.name}`;
        if (type === 'image') {
          if (mode() === 'markdown') {
            insertMarkdown(`![${file.name}](${mockUrl})`);
          } else if (mode() === 'html') {
            insertHtml(`<img src="${mockUrl}" alt="${file.name}" />`);
          } else {
            insertText(`![${file.name}](${mockUrl})`);
          }
        } else {
          if (mode() === 'markdown') {
            insertMarkdown(`[${file.name}](${mockUrl})`);
          } else if (mode() === 'html') {
            insertHtml(`<a href="${mockUrl}">${file.name}</a>`);
          } else {
            insertText(`[${file.name}](${mockUrl})`);
          }
        }
      }
    };
    input.click();
  };

  const renderPreview = () => {
    if (mode() === 'markdown') {
      // Simple markdown to HTML conversion (in real app, use a proper markdown parser)
      return props.value
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*)\*/gim, '<em>$1</em>')
        .replace(/`(.*)`/gim, '<code>$1</code>')
        .replace(/^- \[ \] (.*)$/gim, '<div class="flex items-center gap-2"><input type="checkbox" class="rounded" readonly><span>$1</span></div>')
        .replace(/^- \[x\] (.*)$/gim, '<div class="flex items-center gap-2"><input type="checkbox" checked class="rounded" readonly><span>$1</span></div>')
        .replace(/\n/gim, '<br>');
    }
    
    if (mode() === 'html') {
      return props.value;
    }
    
    // WYSIWYG mode - treat as plain text with basic formatting
    return props.value
      .replace(/\n/gim, '<br>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/^- \[ \] (.*)$/gim, '<div class="flex items-center gap-2"><input type="checkbox" class="rounded" readonly><span>$1</span></div>')
      .replace(/^- \[x\] (.*)$/gim, '<div class="flex items-center gap-2"><input type="checkbox" checked class="rounded" readonly><span>$1</span></div>');
  };

  const toolbarButtons = [
    { icon: IconBold, action: () => insertText('**', '**'), title: 'Bold' },
    { icon: IconItalic, action: () => insertText('*', '*'), title: 'Italic' },
    { icon: IconUnderline, action: () => insertText('<u>', '</u>'), title: 'Underline' },
    { icon: IconStrikethrough, action: () => insertText('~~', '~~'), title: 'Strikethrough' },
    { icon: IconHeading, action: () => insertText('## ', ''), title: 'Heading' },
    { icon: IconList, action: () => insertText('- '), title: 'Bullet List' },
    { icon: IconListNumbers, action: () => insertText('1. '), title: 'Numbered List' },
    { icon: IconCheckbox, action: () => insertText('- [ ] '), title: 'Checkbox' },
    { icon: IconQuote, action: () => insertText('> '), title: 'Quote' },
    { icon: IconCode, action: () => insertText('`', '`'), title: 'Code' },
    { icon: IconLink, action: () => insertText('[', '](url)'), title: 'Link' },
    { icon: IconPhoto, action: () => handleFileUpload('image'), title: 'Insert Image' },
    { icon: IconPaperclip, action: () => handleFileUpload('file'), title: 'Attach File' },
  ];

  return (
    <div class={`border border-border rounded-lg overflow-hidden ${props.class || ''}`}>
      {/* Toolbar */}
      <div class="bg-muted border-b border-border p-2">
        <div class="flex items-center justify-between">
          <div class="flex flex-wrap gap-1">
            <For each={toolbarButtons}>
              {(button) => (
                <button
                  type="button"
                  onClick={button.action}
                  class="p-2 hover:bg-accent rounded transition-colors"
                  title={button.title}
                >
                  <button.icon class="size-4" />
                </button>
              )}
            </For>
          </div>
          
          <div class="flex items-center gap-2">
            {/* Mode Selector */}
            <select
              value={mode()}
              onChange={(e: any) => setMode(e.target.value)}
              class="text-xs px-2 py-1 border border-border rounded bg-background"
            >
              <option value="wysiwyg">WYSIWYG</option>
              <option value="markdown">Markdown</option>
              <option value="html">HTML</option>
            </select>
            
            {/* Preview Toggle */}
            <button
              type="button"
              onClick={() => setIsPreviewMode(!isPreviewMode())}
              class={`p-2 rounded transition-colors ${
                isPreviewMode() ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              }`}
              title="Toggle Preview"
            >
              <IconEye class="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Editor/Preview Area */}
      <div class="min-h-[300px]">
        <Show when={!isPreviewMode()}>
          <textarea
            value={props.value}
            onInput={(e: any) => props.onChange(e.target.value)}
            placeholder={props.placeholder || 'Start writing...'}
            class="w-full h-full min-h-[300px] p-4 resize-none focus:outline-none bg-background"
            style="font-family: inherit;"
          />
        </Show>
        
        <Show when={isPreviewMode()}>
          <div 
            class="p-4 min-h-[300px] prose prose-invert max-w-none"
            innerHTML={renderPreview()}
          />
        </Show>
      </div>
      
      {/* Status Bar */}
      <div class="bg-muted border-t border-border px-4 py-2 text-xs text-muted-foreground">
        <div class="flex justify-between">
          <span>Mode: {mode().toUpperCase()}</span>
          <span>{props.value.length} characters</span>
        </div>
      </div>
    </div>
  );
};
