import { createSignal, For, Show, onCleanup, onMount } from 'solid-js';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import {
  MessagesRealtimeClient,
  messagesApi,
  uploadChatFile,
} from '@/lib/messages';
import type {
  ConversationListItem,
  ConversationMember,
  Message,
  MessageSuggestion,
  UserFile,
} from '@/lib/messages';
import {
  IconAt,
  IconBell,
  IconBellOff,
  IconBolt,
  IconChevronLeft,
  IconCircleCheck,
  IconFile,
  IconHeart,
  IconMessageCircle,
  IconMicrophone,
  IconMicrophoneOff,
  IconPaperclip,
  IconPhone,
  IconPhoneOff,
  IconPlus,
  IconSearch,
  IconSend,
  IconSparkles,
  IconThumbUp,
  IconUpload,
  IconX,
} from '@tabler/icons-solidjs';
import './Messages.css';

interface MemberOption {
  id: number;
  username: string;
  name: string;
}

interface TeamOption {
  id: number;
  name: string;
}

interface MentionUserOption {
  type: 'user';
  id: number;
  username: string;
  label: string;
}

interface MentionFileOption {
  type: 'file';
  file: UserFile;
  label: string;
}

type MentionOption = MentionUserOption | MentionFileOption;

interface ComposerLibraryFile {
  id: number;
  original_name: string;
  mime_type: string;
}

type ReactionKey = 'thumb_up' | 'heart' | 'bolt' | 'check' | 'sparkles';

const REACTION_PRESETS: Array<{ key: ReactionKey; label: string; icon: any }> = [
  { key: 'thumb_up', label: 'Thumb up', icon: IconThumbUp },
  { key: 'heart', label: 'Heart', icon: IconHeart },
  { key: 'bolt', label: 'Bolt', icon: IconBolt },
  { key: 'check', label: 'Check', icon: IconCircleCheck },
  { key: 'sparkles', label: 'Sparkles', icon: IconSparkles },
];

const ATTACHMENT_KIND_OPTIONS = [
  'file',
  'image',
  'voice_note',
  'youtube',
  'github',
  'website',
  'bookmark',
  'task',
  'event',
  'calendar',
  'activity',
  'learning_path',
  'saved_search',
];

const REFERENCE_TYPE_OPTIONS = [
  'task',
  'bookmark',
  'calendar_event',
  'youtube_video',
  'learning_path',
  'saved_search',
  'github',
];

type TriStateFilter = 'any' | 'yes' | 'no';
type CallStatus = 'idle' | 'starting' | 'calling' | 'in_call' | 'error';

export const Messages = () => {
  const [conversations, setConversations] = createSignal<ConversationListItem[]>([]);
  const [messages, setMessages] = createSignal<Message[]>([]);
  const [selectedConversationId, setSelectedConversationId] = createSignal<number | null>(null);
  const [activeScreen, setActiveScreen] = createSignal<'list' | 'conversation'>('list');
  const [loadingConversations, setLoadingConversations] = createSignal(false);
  const [loadingMessages, setLoadingMessages] = createSignal(false);
  const [inputText, setInputText] = createSignal('');
  const [selectedFiles, setSelectedFiles] = createSignal<File[]>([]);
  const [sendingMessage, setSendingMessage] = createSignal(false);
  const [wsStatus, setWsStatus] = createSignal<'connected' | 'disconnected' | 'error'>('disconnected');
  const [searchOpen, setSearchOpen] = createSignal(false);
  const [searchQuery, setSearchQuery] = createSignal('');
  const [searchResults, setSearchResults] = createSignal<Message[]>([]);
  const [searching, setSearching] = createSignal(false);
  const [members, setMembers] = createSignal<MemberOption[]>([]);
  const [teams, setTeams] = createSignal<TeamOption[]>([]);
  const [conversationMembers, setConversationMembers] = createSignal<ConversationMember[]>([]);
  const [typingByConversation, setTypingByConversation] = createSignal<Record<number, Record<number, number>>>({});
  const [newConversationType, setNewConversationType] = createSignal<'dm' | 'group' | 'team'>('dm');
  const [newConversationName, setNewConversationName] = createSignal('');
  const [newConversationTopic, setNewConversationTopic] = createSignal('');
  const [targetUserId, setTargetUserId] = createSignal<number | null>(null);
  const [groupUserIds, setGroupUserIds] = createSignal<number[]>([]);
  const [teamId, setTeamId] = createSignal<number | null>(null);
  const [showCreateConversation, setShowCreateConversation] = createSignal(false);
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = createSignal(
    localStorage.getItem('messages_browser_notifications') === 'true'
  );
  const [searchConversationIds, setSearchConversationIds] = createSignal<number[]>([]);
  const [searchSenderId, setSearchSenderId] = createSignal('');
  const [searchDateFrom, setSearchDateFrom] = createSignal('');
  const [searchDateTo, setSearchDateTo] = createSignal('');
  const [searchAttachmentKinds, setSearchAttachmentKinds] = createSignal<string[]>([]);
  const [searchReferenceTypes, setSearchReferenceTypes] = createSignal<string[]>([]);
  const [searchHasLinks, setSearchHasLinks] = createSignal<TriStateFilter>('any');
  const [searchHasAttachments, setSearchHasAttachments] = createSignal<TriStateFilter>('any');
  const [searchHasSuggestions, setSearchHasSuggestions] = createSignal<TriStateFilter>('any');
  const [searchMentionOnly, setSearchMentionOnly] = createSignal(false);
  const [voiceTranscriptEnabled, setVoiceTranscriptEnabled] = createSignal(
    localStorage.getItem('messages_voice_transcript') !== 'false'
  );
  const [isRecordingVoice, setIsRecordingVoice] = createSignal(false);
  const [voiceRecordingMs, setVoiceRecordingMs] = createSignal(0);
  const [voiceTranscriptPreview, setVoiceTranscriptPreview] = createSignal('');
  const [callStatus, setCallStatus] = createSignal<CallStatus>('idle');
  const [callMuted, setCallMuted] = createSignal(false);
  const [activeCallConversationId, setActiveCallConversationId] = createSignal<number | null>(null);
  const [activeCallPeerIds, setActiveCallPeerIds] = createSignal<number[]>([]);
  const [callTranscriptEnabled, setCallTranscriptEnabled] = createSignal(
    localStorage.getItem('messages_call_transcript') !== 'false'
  );
  const [callTranscriptPreview, setCallTranscriptPreview] = createSignal('');
  const [attachedLibraryFiles, setAttachedLibraryFiles] = createSignal<ComposerLibraryFile[]>([]);
  const [mentionQuery, setMentionQuery] = createSignal('');
  const [mentionOpen, setMentionOpen] = createSignal(false);
  const [mentionOptions, setMentionOptions] = createSignal<MentionOption[]>([]);
  const [mentionHighlightedIndex, setMentionHighlightedIndex] = createSignal(0);
  const [mentionLoading, setMentionLoading] = createSignal(false);
  const [isDragOverComposer, setIsDragOverComposer] = createSignal(false);
  const [revealedSensitiveMessages, setRevealedSensitiveMessages] = createSignal<Record<number, string>>({});
  const [uploadProgress, setUploadProgress] = createSignal<{ done: number; total: number } | null>(null);

  const getCurrentUserId = () => {
    const raw = localStorage.getItem('trackeep_user') || localStorage.getItem('user');
    if (!raw) return 0;
    try {
      const parsed = JSON.parse(raw);
      return parsed.id || 0;
    } catch {
      return 0;
    }
  };

  const currentUserId = () => getCurrentUserId();

  let realtime: MessagesRealtimeClient | null = null;
  let pollInterval: number | null = null;
  let typingStopTimer: number | null = null;
  let typingCleanupTimer: number | null = null;
  let lastTypingStartedAt = 0;
  let voiceRecorder: MediaRecorder | null = null;
  let voiceRecordingStream: MediaStream | null = null;
  let voiceRecordingChunks: BlobPart[] = [];
  let voiceRecordingTimer: number | null = null;
  let discardVoiceRecording = false;
  let voiceRecognition: any = null;
  let voiceFinalTranscript = '';
  let voiceInterimTranscript = '';
  let callLocalStream: MediaStream | null = null;
  let callPeers = new Map<number, RTCPeerConnection>();
  let remoteAudioElements = new Map<number, HTMLAudioElement>();
  let callRecognition: any = null;
  let callFinalTranscript = '';
  let callInterimTranscript = '';
  let mentionSearchTimer: number | null = null;
  let mentionSearchToken = 0;
  let composerTextareaRef: HTMLTextAreaElement | null = null;
  let hiddenFileInputRef: HTMLInputElement | null = null;
  const sensitiveRevealTimers = new Map<number, number>();

  const sortedConversations = () =>
    [...conversations()].sort((a, b) => {
      const aDate = a.conversation.last_message_at || a.conversation.updated_at;
      const bDate = b.conversation.last_message_at || b.conversation.updated_at;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });

  const activeConversation = () =>
    conversations().find((item) => item.conversation.id === selectedConversationId()) || null;

  const openConversation = (conversationId: number) => {
    setSelectedConversationId(conversationId);
    setActiveScreen('conversation');
  };

  const closeConversation = () => {
    const conversationID = selectedConversationId();
    if (conversationID) {
      markTypingStopped(conversationID);
    }
    if (isCallActive()) {
      endVoiceCall(true);
    }
    setActiveScreen('list');
  };

  const shouldUseSensitiveReveal = () => {
    const type = activeConversation()?.conversation.type;
    return type === 'dm' || type === 'self';
  };

  const conversationNameById = (id: number) =>
    conversations().find((item) => item.conversation.id === id)?.conversation.name || 'Conversation';

  const normalizeReactionKey = (value: string): ReactionKey => {
    const raw = value.trim().toLowerCase();
    if (!raw) return 'thumb_up';
    if (raw === 'thumb_up' || raw === '👍' || raw === ':+1:') return 'thumb_up';
    if (raw === 'heart' || raw === '❤️' || raw === '❤') return 'heart';
    if (raw === 'bolt' || raw === '🔥') return 'bolt';
    if (raw === 'check' || raw === '✅') return 'check';
    if (raw === 'sparkles' || raw === '✨' || raw === '⭐' || raw === 'star') return 'sparkles';
    return 'thumb_up';
  };

  const reactionIconForKey = (key: ReactionKey) =>
    REACTION_PRESETS.find((preset) => preset.key === key)?.icon || IconThumbUp;

  const groupedReactions = (message: Message) => {
    const grouped = new Map<ReactionKey, { count: number; mine: boolean; rawMine: string[] }>();
    for (const reaction of message.reactions || []) {
      const key = normalizeReactionKey(reaction.emoji);
      const current = grouped.get(key) || { count: 0, mine: false, rawMine: [] };
      current.count += 1;
      if (reaction.user_id === currentUserId()) {
        current.mine = true;
        current.rawMine.push(reaction.emoji);
      }
      grouped.set(key, current);
    }
    return grouped;
  };

  const reactionEntries = (message: Message) => Array.from(groupedReactions(message).entries());

  const getSpeechRecognitionCtor = () => {
    if (typeof window === 'undefined') return null;
    const w = window as any;
    return w.SpeechRecognition || w.webkitSpeechRecognition || null;
  };

  const isCallActive = () =>
    callStatus() === 'starting' || callStatus() === 'calling' || callStatus() === 'in_call';

  const triStateToBool = (value: TriStateFilter): boolean | undefined => {
    if (value === 'yes') return true;
    if (value === 'no') return false;
    return undefined;
  };

  const toggleNumberFilter = (current: number[], value: number) => {
    if (current.includes(value)) {
      return current.filter((v) => v !== value);
    }
    return [...current, value];
  };

  const toggleStringFilter = (current: string[], value: string) => {
    if (current.includes(value)) {
      return current.filter((v) => v !== value);
    }
    return [...current, value];
  };

  const toISOOrUndefined = (value: string): string | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return undefined;
    return parsed.toISOString();
  };

  const clearSearchFilters = () => {
    setSearchConversationIds([]);
    setSearchSenderId('');
    setSearchDateFrom('');
    setSearchDateTo('');
    setSearchAttachmentKinds([]);
    setSearchReferenceTypes([]);
    setSearchHasLinks('any');
    setSearchHasAttachments('any');
    setSearchHasSuggestions('any');
    setSearchMentionOnly(false);
  };

  const activeTypingUserNames = () => {
    const conversationID = selectedConversationId();
    if (!conversationID) return [] as string[];

    const usersMap = typingByConversation()[conversationID] || {};
    const names = Object.keys(usersMap)
      .map((id) => Number(id))
      .filter((id) => id !== currentUserId())
      .map((id) => {
        const member = conversationMembers().find((m) => m.user_id === id);
        return member?.user?.full_name || member?.user?.username || 'Unknown user';
      });

    return names;
  };

  const activeMentionToken = (text: string, caret: number) => {
    const beforeCaret = text.slice(0, caret);
    const atIndex = beforeCaret.lastIndexOf('@');
    if (atIndex < 0) return null;
    if (atIndex > 0 && /\S/.test(beforeCaret.charAt(atIndex - 1))) {
      return null;
    }

    const token = beforeCaret.slice(atIndex + 1);
    if (/\s/.test(token)) return null;

    return {
      query: token.trim().toLowerCase(),
      start: atIndex,
      end: caret,
    };
  };

  const refreshMentionOptions = (query: string) => {
    const conversationUserOptions: MentionUserOption[] = conversationMembers()
      .map((member) => {
        const username = (member.user?.username || '').trim();
        const label = member.user?.full_name || username || 'Unknown user';
        return {
          type: 'user' as const,
          id: member.user_id,
          username: username || label.toLowerCase().replace(/\s+/g, '.'),
          label,
        };
      })
      .filter((option) => option.id !== currentUserId())
      .filter((option, index, arr) => arr.findIndex((entry) => entry.id === option.id) === index)
      .filter((option) =>
        !query ? true : `${option.label} ${option.username}`.toLowerCase().includes(query)
      )
      .slice(0, 6);

    setMentionLoading(true);
    const token = ++mentionSearchToken;
    void messagesApi
      .listUserFiles(query, 8)
      .then((files) => {
        if (token !== mentionSearchToken) return;
        const fileOptions: MentionFileOption[] = (files || []).map((file) => ({
          type: 'file',
          file,
          label: file.original_name || 'Attachment',
        }));
        const merged: MentionOption[] = [...conversationUserOptions, ...fileOptions];
        setMentionOptions(merged);
        setMentionHighlightedIndex(0);
      })
      .catch(() => {
        if (token !== mentionSearchToken) return;
        setMentionOptions(conversationUserOptions);
      })
      .finally(() => {
        if (token === mentionSearchToken) {
          setMentionLoading(false);
        }
      });
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.warning('Browser notifications unavailable', 'This browser does not support notifications.');
      return;
    }
    if (Notification.permission === 'granted') {
      setBrowserNotificationsEnabled(true);
      localStorage.setItem('messages_browser_notifications', 'true');
      return;
    }
    const permission = await Notification.requestPermission();
    const enabled = permission === 'granted';
    setBrowserNotificationsEnabled(enabled);
    localStorage.setItem('messages_browser_notifications', enabled ? 'true' : 'false');
  };

  const maybeNotify = (title: string, body: string) => {
    if (!browserNotificationsEnabled()) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    new Notification(title, { body });
  };

  const sendTypingEvent = (type: 'typing.started' | 'typing.stopped', explicitConversationId?: number) => {
    const conversationID = explicitConversationId || selectedConversationId();
    if (!conversationID) return;
    if (!realtime || wsStatus() !== 'connected') return;
    realtime.send({
      type,
      conversation_id: conversationID,
    });
  };

  const markTypingStopped = (explicitConversationId?: number) => {
    sendTypingEvent('typing.stopped', explicitConversationId);
    if (typingStopTimer) {
      window.clearTimeout(typingStopTimer);
      typingStopTimer = null;
    }
  };

  const markTypingStarted = () => {
    const conversationID = selectedConversationId();
    if (!conversationID) return;

    const now = Date.now();
    if (now-lastTypingStartedAt > 1200) {
      sendTypingEvent('typing.started', conversationID);
      lastTypingStartedAt = now;
    }

    if (typingStopTimer) {
      window.clearTimeout(typingStopTimer);
    }
    typingStopTimer = window.setTimeout(() => {
      markTypingStopped(conversationID);
    }, 2200);
  };

  const setVoiceTranscriptPreference = (enabled: boolean) => {
    setVoiceTranscriptEnabled(enabled);
    localStorage.setItem('messages_voice_transcript', enabled ? 'true' : 'false');
  };

  const setCallTranscriptPreference = (enabled: boolean) => {
    setCallTranscriptEnabled(enabled);
    localStorage.setItem('messages_call_transcript', enabled ? 'true' : 'false');
  };

  const formatMs = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const stopVoiceRecognition = () => {
    if (voiceRecognition) {
      try {
        voiceRecognition.onresult = null;
        voiceRecognition.onerror = null;
        voiceRecognition.onend = null;
        voiceRecognition.stop();
      } catch {
        // ignore
      }
      voiceRecognition = null;
    }
  };

  const startVoiceRecognition = () => {
    if (!voiceTranscriptEnabled()) return;
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    voiceFinalTranscript = '';
    voiceInterimTranscript = '';
    setVoiceTranscriptPreview('');

    const recognition = new Ctor();
    recognition.lang = navigator.language || 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) {
          voiceFinalTranscript += `${transcript} `;
        } else {
          voiceInterimTranscript = transcript;
        }
      }
      const merged = `${voiceFinalTranscript} ${voiceInterimTranscript}`.trim();
      setVoiceTranscriptPreview(merged);
    };
    recognition.onerror = () => {
      // Keep recording even if browser transcript fails.
    };
    recognition.onend = () => {
      voiceRecognition = null;
    };
    try {
      recognition.start();
      voiceRecognition = recognition;
    } catch {
      voiceRecognition = null;
    }
  };

  const stopCallRecognition = () => {
    if (callRecognition) {
      try {
        callRecognition.onresult = null;
        callRecognition.onerror = null;
        callRecognition.onend = null;
        callRecognition.stop();
      } catch {
        // ignore
      }
      callRecognition = null;
    }
    setCallTranscriptPreview('');
    callFinalTranscript = '';
    callInterimTranscript = '';
  };

  const startCallRecognition = () => {
    if (!callTranscriptEnabled()) return;
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    callFinalTranscript = '';
    callInterimTranscript = '';
    setCallTranscriptPreview('');

    const recognition = new Ctor();
    recognition.lang = navigator.language || 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) {
          callFinalTranscript += `${transcript} `;
        } else {
          callInterimTranscript = transcript;
        }
      }
      const merged = `${callFinalTranscript} ${callInterimTranscript}`.trim();
      setCallTranscriptPreview(merged);
    };
    recognition.onerror = () => {
      // keep call running when transcript fails
    };
    recognition.onend = () => {
      callRecognition = null;
    };
    try {
      recognition.start();
      callRecognition = recognition;
    } catch {
      callRecognition = null;
    }
  };

  const postMessage = async (body: string, attachments: any[], explicitConversationId?: number) => {
    const conversationID = explicitConversationId || selectedConversationId();
    if (!conversationID) return;
    const trimmedBody = body.trim();
    if (!trimmedBody && attachments.length === 0) return;

    markTypingStopped();
    setSendingMessage(true);
    try {
      const response = await messagesApi.sendMessage(conversationID, {
        body: trimmedBody,
        attachments,
      });

      const created = response.message;
      setMessages((prev) => (prev.some((m) => m.id === created.id) ? prev : [...prev, created]));

      loadConversations();
    } catch (error) {
      throw error;
    } finally {
      setSendingMessage(false);
    }
  };

  const startVoiceRecording = async () => {
    const conversationID = selectedConversationId();
    if (!conversationID) {
      toast.warning('Conversation required', 'Select a conversation before recording.');
      return;
    }
    if (isRecordingVoice()) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Microphone unavailable', 'This browser does not support microphone capture.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      voiceRecordingStream = stream;
      voiceRecorder = recorder;
      voiceRecordingChunks = [];
      setVoiceRecordingMs(0);
      setIsRecordingVoice(true);
      discardVoiceRecording = false;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          voiceRecordingChunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        try {
          if (discardVoiceRecording) {
            return;
          }
          const blob = new Blob(voiceRecordingChunks, { type: recorder.mimeType || 'audio/webm' });
          if (blob.size === 0) {
            toast.warning('Empty recording', 'No audio was captured.');
            return;
          }

          const extension = recorder.mimeType.includes('ogg') ? 'ogg' : recorder.mimeType.includes('mp4') ? 'm4a' : 'webm';
          const file = new File([blob], `voice-note-${Date.now()}.${extension}`, { type: recorder.mimeType || 'audio/webm' });
          const uploaded = await uploadChatFile(file);
          const attachments = [{
            kind: 'voice_note',
            file_id: uploaded.id,
            title: uploaded.original_name || 'Voice note',
            url: `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/files/${uploaded.id}/download`,
          }];

          const transcript = `${voiceFinalTranscript} ${voiceInterimTranscript}`.trim();
          const transcriptBody = transcript ? `Transcript (local): ${transcript}` : '';
          const composedBody = [inputText().trim(), transcriptBody].filter(Boolean).join('\n\n');

          await postMessage(composedBody, attachments, conversationID);
          setInputText('');
          if (transcriptBody) {
            toast.success('Voice note sent', 'Local transcript attached.');
          } else {
            toast.success('Voice note sent');
          }
        } catch (error) {
          toast.error('Failed to send voice note', error instanceof Error ? error.message : 'Unknown error');
        } finally {
          stopVoiceRecognition();
          voiceRecordingChunks = [];
          setVoiceTranscriptPreview('');
          voiceFinalTranscript = '';
          voiceInterimTranscript = '';
        }
      };

      recorder.start(250);
      startVoiceRecognition();
      voiceRecordingTimer = window.setInterval(() => {
        setVoiceRecordingMs((prev) => prev + 250);
      }, 250);
    } catch (error) {
      setIsRecordingVoice(false);
      toast.error('Microphone access failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const stopVoiceRecording = () => {
    if (!isRecordingVoice()) return;
    setIsRecordingVoice(false);
    if (voiceRecordingTimer) {
      window.clearInterval(voiceRecordingTimer);
      voiceRecordingTimer = null;
    }
    stopVoiceRecognition();
    if (voiceRecorder && voiceRecorder.state !== 'inactive') {
      try {
        voiceRecorder.stop();
      } catch {
        // ignore
      }
    }
    if (voiceRecordingStream) {
      voiceRecordingStream.getTracks().forEach((track) => track.stop());
      voiceRecordingStream = null;
    }
    voiceRecorder = null;
  };

  const ensureCallLocalStream = async () => {
    if (callLocalStream) return callLocalStream;
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone capture is not supported in this browser');
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    callLocalStream = stream;
    return stream;
  };

  const attachRemoteAudio = (userID: number, stream: MediaStream) => {
    let element = remoteAudioElements.get(userID);
    if (!element) {
      element = document.createElement('audio');
      element.autoplay = true;
      element.setAttribute('playsinline', 'true');
      element.style.display = 'none';
      document.body.appendChild(element);
      remoteAudioElements.set(userID, element);
    }
    element.srcObject = stream;
    setActiveCallPeerIds((prev) => (prev.includes(userID) ? prev : [...prev, userID]));
  };

  const removeRemoteAudio = (userID: number) => {
    const element = remoteAudioElements.get(userID);
    if (element) {
      element.srcObject = null;
      element.remove();
      remoteAudioElements.delete(userID);
    }
    setActiveCallPeerIds((prev) => prev.filter((id) => id !== userID));
  };

  const closePeerConnection = (userID: number) => {
    const pc = callPeers.get(userID);
    if (pc) {
      try {
        pc.onicecandidate = null;
        pc.ontrack = null;
        pc.close();
      } catch {
        // ignore
      }
      callPeers.delete(userID);
    }
    removeRemoteAudio(userID);
  };

  const buildPeerConnection = (conversationID: number, peerUserID: number) => {
    let pc = callPeers.get(peerUserID);
    if (pc) return pc;

    pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    callPeers.set(peerUserID, pc);

    if (callLocalStream) {
      callLocalStream.getTracks().forEach((track) => {
        try {
          pc!.addTrack(track, callLocalStream!);
        } catch {
          // ignore duplicate track errors
        }
      });
    }

    pc.onicecandidate = (event) => {
      if (!event.candidate || !realtime || wsStatus() !== 'connected') return;
      realtime.send({
        type: 'call.ice',
        conversation_id: conversationID,
        target_user_id: peerUserID,
        candidate: event.candidate,
      });
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (stream) {
        attachRemoteAudio(peerUserID, stream);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc?.connectionState === 'failed' || pc?.connectionState === 'disconnected' || pc?.connectionState === 'closed') {
        closePeerConnection(peerUserID);
        if (callPeers.size === 0 && callStatus() === 'in_call') {
          setCallStatus('idle');
          setActiveCallConversationId(null);
          stopCallRecognition();
        }
      }
    };

    return pc;
  };

  const handleIncomingCallOffer = async (payload: any) => {
    const senderID = Number(payload?.sender_id || 0);
    const targetID = Number(payload?.target_user_id || 0);
    const conversationID = Number(payload?.conversation_id || payload?.conversationID || 0);
    if (!senderID || !conversationID || !payload?.sdp) return;
    if (targetID && targetID !== currentUserId()) return;

    try {
      await ensureCallLocalStream();
      if (activeCallConversationId() && activeCallConversationId() !== conversationID) {
        toast.warning('Incoming call ignored', 'You already have an active call in another conversation.');
        return;
      }

      setActiveCallConversationId(conversationID);
      if (selectedConversationId() !== conversationID || activeScreen() !== 'conversation') {
        openConversation(conversationID);
      }

      const pc = buildPeerConnection(conversationID, senderID);
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      realtime?.send({
        type: 'call.answer',
        conversation_id: conversationID,
        target_user_id: senderID,
        sdp: answer,
      });
      setCallStatus('in_call');
      startCallRecognition();
      toast.info('Voice call', 'Call connected.');
    } catch (error) {
      setCallStatus('error');
      toast.error('Failed to answer call', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleIncomingCallAnswer = async (payload: any) => {
    const senderID = Number(payload?.sender_id || 0);
    const targetID = Number(payload?.target_user_id || 0);
    if (!senderID || !payload?.sdp) return;
    if (targetID && targetID !== currentUserId()) return;

    const pc = callPeers.get(senderID);
    if (!pc) return;
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      setCallStatus('in_call');
      startCallRecognition();
    } catch {
      // ignore bad/late answers
    }
  };

  const handleIncomingCallICE = async (payload: any) => {
    const senderID = Number(payload?.sender_id || 0);
    const targetID = Number(payload?.target_user_id || 0);
    if (!senderID || !payload?.candidate) return;
    if (targetID && targetID !== currentUserId()) return;

    const pc = callPeers.get(senderID);
    if (!pc) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
    } catch {
      // ignore stale ice candidates
    }
  };

  const cleanupCallResources = () => {
    for (const userID of Array.from(callPeers.keys())) {
      closePeerConnection(userID);
    }
    callPeers.clear();

    if (callLocalStream) {
      callLocalStream.getTracks().forEach((track) => track.stop());
      callLocalStream = null;
    }
    setCallMuted(false);
    setActiveCallConversationId(null);
    setActiveCallPeerIds([]);
    setCallStatus('idle');
    stopCallRecognition();
  };

  const endVoiceCall = (notifyRemote: boolean = true) => {
    const conversationID = activeCallConversationId();
    if (notifyRemote && conversationID && realtime && wsStatus() === 'connected') {
      realtime.send({
        type: 'call.hangup',
        conversation_id: conversationID,
      });
    }
    cleanupCallResources();
  };

  const startVoiceCall = async () => {
    const conversationID = selectedConversationId();
    if (!conversationID) {
      toast.warning('Conversation required', 'Select a conversation first.');
      return;
    }
    if (isCallActive()) return;

    const peers = conversationMembers()
      .map((member) => member.user_id)
      .filter((id) => id !== currentUserId());
    if (peers.length === 0) {
      toast.warning('No participants', 'Add at least one other user to call.');
      return;
    }

    try {
      setCallStatus('starting');
      await ensureCallLocalStream();
      setActiveCallConversationId(conversationID);
      setCallStatus('calling');

      for (const peerID of peers) {
        const pc = buildPeerConnection(conversationID, peerID);
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
        });
        await pc.setLocalDescription(offer);
        realtime?.send({
          type: 'call.offer',
          conversation_id: conversationID,
          target_user_id: peerID,
          sdp: offer,
        });
      }

      startCallRecognition();
    } catch (error) {
      setCallStatus('error');
      cleanupCallResources();
      toast.error('Failed to start call', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const toggleCallMute = () => {
    if (!callLocalStream) return;
    const nextMuted = !callMuted();
    callLocalStream.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setCallMuted(nextMuted);
  };

  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      const data = await messagesApi.listConversations();
      const nextConversations = data.conversations || [];
      setConversations(nextConversations);

      const selectedID = selectedConversationId();
      if (selectedID && !nextConversations.some((item) => item.conversation.id === selectedID)) {
        setSelectedConversationId(null);
        setActiveScreen('list');
      }
      if (nextConversations.length === 0) {
        setSelectedConversationId(null);
        setActiveScreen('list');
      }
    } catch (error) {
      toast.error('Failed to load conversations', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadMessages = async (conversationId: number) => {
    setLoadingMessages(true);
    try {
      const data = await messagesApi.getMessages(conversationId, undefined, 50);
      setMessages(data.messages || []);
    } catch (error) {
      toast.error('Failed to load messages', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadConversationDetails = async (conversationId: number) => {
    try {
      const data = await messagesApi.getConversation(conversationId);
      setConversationMembers(data.members || []);
    } catch {
      setConversationMembers([]);
    }
  };

  const loadMembers = async () => {
    const token = localStorage.getItem('trackeep_token') || localStorage.getItem('token') || '';
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/members?limit=200`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const data = await res.json();
      const mapped: MemberOption[] = (data.members || []).map((m: any) => ({
        id: Number(m.id),
        username: m.username || '',
        name: m.name || m.full_name || m.username || m.email || 'Member',
      }));
      setMembers(mapped);
    } catch {
      // ignore
    }
  };

  const loadTeams = async () => {
    const token = localStorage.getItem('trackeep_token') || localStorage.getItem('token') || '';
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/teams?limit=200`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const data = await res.json();
      const mapped: TeamOption[] = (data.teams || []).map((team: any) => ({
        id: Number(team.id),
        name: team.name || 'Team',
      }));
      setTeams(mapped.filter((team) => Number.isFinite(team.id) && team.id > 0));
    } catch {
      // ignore
    }
  };

  const handleWsEvent = (event: any) => {
    const eventType = event?.type || '';
    const eventConversationId = Number(event?.conversation_id || event?.data?.conversation_id || 0);

    if (eventType === 'message.created' && event?.data) {
      const incoming: Message = event.data;
      if (incoming.conversation_id === selectedConversationId()) {
        setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
      }
      setTypingByConversation((prev) => {
        const convMap = { ...(prev[incoming.conversation_id] || {}) };
        delete convMap[incoming.sender_id];
        return {
          ...prev,
          [incoming.conversation_id]: convMap,
        };
      });
      if (incoming.sender_id !== currentUserId()) {
        const conv = conversations().find((c) => c.conversation.id === incoming.conversation_id);
        const convName = conv?.conversation.name || 'New message';
        toast.info(convName, incoming.body || 'New message received');
        maybeNotify(convName, incoming.body || 'New message received');
      }
      loadConversations();
      return;
    }

    if (eventType === 'message.updated' && event?.data) {
      const updated: Message = event.data;
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
      return;
    }

    if (eventType === 'message.deleted' && event?.data) {
      const deletedId = Number(event.data.message_id);
      setMessages((prev) => prev.map((m) => (m.id === deletedId ? { ...m, body: '[deleted]', deleted_at: new Date().toISOString() } : m)));
      return;
    }

    if (eventType === 'reaction.added' && event?.data) {
      const reaction = event.data;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === reaction.message_id
            ? { ...m, reactions: [...(m.reactions || []), reaction] }
            : m
        )
      );
      return;
    }

    if (eventType === 'reaction.removed' && event?.data) {
      const payload = event.data;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === payload.message_id
            ? {
                ...m,
                reactions: (m.reactions || []).filter(
                  (r) => !(r.user_id === payload.user_id && r.emoji === payload.emoji)
                ),
              }
            : m
        )
      );
      return;
    }

    if ((eventType === 'typing.started' || eventType === 'typing.stopped') && event?.data) {
      const payload = event.data;
      const conversationID = Number(payload.conversation_id || eventConversationId);
      const userID = Number(payload.user_id || 0);
      if (!conversationID || !userID || userID === currentUserId()) return;

      if (eventType === 'typing.started') {
        setTypingByConversation((prev) => {
          const convMap = { ...(prev[conversationID] || {}) };
          convMap[userID] = Date.now();
          return {
            ...prev,
            [conversationID]: convMap,
          };
        });
      } else {
        setTypingByConversation((prev) => {
          const convMap = { ...(prev[conversationID] || {}) };
          delete convMap[userID];
          return {
            ...prev,
            [conversationID]: convMap,
          };
        });
      }
      return;
    }

    if (eventType === 'call.offer' && event?.data) {
      void handleIncomingCallOffer(event.data);
      return;
    }

    if (eventType === 'call.answer' && event?.data) {
      void handleIncomingCallAnswer(event.data);
      return;
    }

    if (eventType === 'call.ice' && event?.data) {
      void handleIncomingCallICE(event.data);
      return;
    }

    if (eventType === 'call.hangup' && event?.data) {
      const conversationID = Number(event.data.conversation_id || eventConversationId);
      if (conversationID && activeCallConversationId() === conversationID) {
        cleanupCallResources();
        toast.info('Voice call', 'Call ended.');
      }
      return;
    }

    if (eventType === 'conversation.updated' || eventConversationId > 0) {
      loadConversations();
    }
  };

  const startRealtime = () => {
    realtime = new MessagesRealtimeClient(handleWsEvent, (status) => {
      setWsStatus(status);
    });
    realtime.connect();
  };

  const startPollingFallback = () => {
    if (pollInterval) return;
    pollInterval = window.setInterval(() => {
      loadConversations();
      if (selectedConversationId()) {
        loadMessages(selectedConversationId()!);
      }
    }, 10000);
  };

  const stopPollingFallback = () => {
    if (!pollInterval) return;
    window.clearInterval(pollInterval);
    pollInterval = null;
  };

  const onFileSelect = (event: Event) => {
    const target = event.currentTarget as HTMLInputElement;
    const files = Array.from(target.files || []);
    if (files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...files]);
    }
    if (target) {
      target.value = '';
    }
  };

  const removeLocalFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
  };

  const removeAttachedLibraryFile = (id: number) => {
    setAttachedLibraryFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const selectMentionOption = (option: MentionOption, range: { start: number; end: number }) => {
    const currentText = inputText();
    let inserted = '';

    if (option.type === 'user') {
      inserted = `@${option.username} `;
    } else {
      const readableFileName = (option.file.original_name || 'file').trim() || 'file';
      inserted = `@${readableFileName.replace(/\s+/g, '_')} `;
      setAttachedLibraryFiles((prev) =>
        prev.some((entry) => entry.id === option.file.id)
          ? prev
          : [
              ...prev,
              {
                id: option.file.id,
                original_name: option.file.original_name || 'Attachment',
                mime_type: option.file.mime_type,
              },
            ]
      );
    }

    const updated = `${currentText.slice(0, range.start)}${inserted}${currentText.slice(range.end)}`;
    setInputText(updated);
    setMentionOpen(false);
    setMentionOptions([]);
    setMentionQuery('');

    window.requestAnimationFrame(() => {
      if (!composerTextareaRef) return;
      const caret = range.start + inserted.length;
      composerTextareaRef.focus();
      composerTextareaRef.setSelectionRange(caret, caret);
    });
  };

  const handleComposerInput = (event: InputEvent & { currentTarget: HTMLTextAreaElement }) => {
    const value = event.currentTarget.value;
    const caret = event.currentTarget.selectionStart || value.length;
    setInputText(value);

    if (value.trim()) {
      markTypingStarted();
    } else {
      markTypingStopped();
    }

    const mentionToken = activeMentionToken(value, caret);
    if (!mentionToken) {
      setMentionOpen(false);
      setMentionOptions([]);
      setMentionQuery('');
      return;
    }

    const nextQuery = mentionToken.query;
    setMentionOpen(true);
    setMentionQuery(nextQuery);

    if (mentionSearchTimer) {
      window.clearTimeout(mentionSearchTimer);
      mentionSearchTimer = null;
    }
    mentionSearchTimer = window.setTimeout(() => {
      refreshMentionOptions(nextQuery);
    }, 120);
  };

  const handleComposerDrop = (event: DragEvent) => {
    event.preventDefault();
    setIsDragOverComposer(false);
    const droppedFiles = Array.from(event.dataTransfer?.files || []);
    if (droppedFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...droppedFiles]);
    }
  };

  const sendMessage = async () => {
    if (!selectedConversationId()) return;
    const body = inputText().trim();
    if (!body && selectedFiles().length === 0 && attachedLibraryFiles().length === 0) return;

    try {
      const localFiles = [...selectedFiles()];
      if (localFiles.length > 0) {
        setUploadProgress({ done: 0, total: localFiles.length });
      } else {
        setUploadProgress(null);
      }

      const attachments: any[] = [];
      for (let i = 0; i < localFiles.length; i += 1) {
        const file = localFiles[i];
        const uploaded = await uploadChatFile(file);
        attachments.push({
          kind: uploaded.mime_type?.startsWith('image/') ? 'image' : 'file',
          file_id: uploaded.id,
          title: uploaded.original_name,
          url: `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/files/${uploaded.id}/download`,
        });
        setUploadProgress({ done: i + 1, total: localFiles.length });
      }

      for (const file of attachedLibraryFiles()) {
        attachments.push({
          kind: file.mime_type?.startsWith('image/') ? 'image' : 'file',
          file_id: file.id,
          title: file.original_name,
          url: `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/files/${file.id}/download`,
        });
      }

      await postMessage(body, attachments);
      setInputText('');
      setSelectedFiles([]);
      setAttachedLibraryFiles([]);
      setMentionOptions([]);
      setMentionOpen(false);
      setMentionQuery('');
    } catch (error) {
      toast.error('Failed to send message', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setUploadProgress(null);
    }
  };

  const handleSuggestionAction = async (messageId: number, suggestion: MessageSuggestion, action: 'accept' | 'dismiss') => {
    try {
      if (action === 'accept') {
        await messagesApi.acceptSuggestion(messageId, suggestion.id, {
          redact_original: suggestion.type === 'move_to_password_vault',
        });
        toast.success('Suggestion applied');
      } else {
        await messagesApi.dismissSuggestion(messageId, suggestion.id);
      }
      if (selectedConversationId()) {
        await loadMessages(selectedConversationId()!);
      }
    } catch (error) {
      toast.error('Failed to apply suggestion', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const addReaction = async (messageId: number, emoji: string) => {
    try {
      await messagesApi.addReaction(messageId, emoji);
    } catch {
      // ignore reaction errors in quick UI
    }
  };

  const removeReaction = async (messageId: number, emoji: string) => {
    try {
      await messagesApi.removeReaction(messageId, emoji);
    } catch {
      // ignore reaction errors in quick UI
    }
  };

  const toggleReaction = async (message: Message, key: ReactionKey) => {
    const grouped = groupedReactions(message);
    const group = grouped.get(key);
    if (group?.mine) {
      for (const raw of group.rawMine) {
        await removeReaction(message.id, raw);
      }
      return;
    }
    await addReaction(message.id, key);
  };

  const revealSensitiveMessage = async (messageId: number) => {
    try {
      const data = await messagesApi.revealSensitiveMessage(messageId);
      setRevealedSensitiveMessages((prev) => ({
        ...prev,
        [messageId]: data.plaintext,
      }));

      const existing = sensitiveRevealTimers.get(messageId);
      if (existing) {
        window.clearTimeout(existing);
      }

      const timer = window.setTimeout(() => {
        setRevealedSensitiveMessages((prev) => {
          const next = { ...prev };
          delete next[messageId];
          return next;
        });
        sensitiveRevealTimers.delete(messageId);
      }, 15000);
      sensitiveRevealTimers.set(messageId, timer);
    } catch (error) {
      toast.error('Reveal failed', error instanceof Error ? error.message : 'Unable to reveal message');
    }
  };

  const performSearch = async () => {
    setSearching(true);
    try {
      const data = await messagesApi.searchMessages({
        query: searchQuery(),
        conversation_ids: searchConversationIds().length ? searchConversationIds() : undefined,
        sender_id: searchSenderId().trim() ? Number(searchSenderId()) : undefined,
        date_from: toISOOrUndefined(searchDateFrom()),
        date_to: toISOOrUndefined(searchDateTo()),
        attachment_kinds: searchAttachmentKinds().length ? searchAttachmentKinds() : undefined,
        reference_types: searchReferenceTypes().length ? searchReferenceTypes() : undefined,
        has_links: triStateToBool(searchHasLinks()),
        has_attachments: triStateToBool(searchHasAttachments()),
        has_suggestions: triStateToBool(searchHasSuggestions()),
        mention_only: searchMentionOnly(),
        limit: 50,
        offset: 0,
      });
      setSearchResults(data.results || []);
    } catch (error) {
      toast.error('Search failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setSearching(false);
    }
  };

  const openSearchResult = async (result: Message) => {
    openConversation(result.conversation_id);
    setSearchOpen(false);
    await loadMessages(result.conversation_id);
  };

  const createConversation = async () => {
    try {
      const type = newConversationType();
      let payload: any = {
        type,
        name: newConversationName().trim(),
        topic: newConversationTopic().trim(),
      };

      if (type === 'dm') {
        if (!targetUserId()) {
          toast.warning('Select a member', 'Choose who to message directly.');
          return;
        }
        payload.user_ids = [targetUserId()];
      } else if (type === 'group') {
        if (groupUserIds().length === 0) {
          toast.warning('Select members', 'Choose at least one member for the group.');
          return;
        }
        payload.user_ids = groupUserIds();
      } else if (type === 'team') {
        if (!teamId()) {
          toast.warning('Select a team', 'Choose a team to create the channel.');
          return;
        }
        payload.team_id = teamId();
      }

      const data = await messagesApi.createConversation(payload);
      setShowCreateConversation(false);
      setNewConversationName('');
      setNewConversationTopic('');
      setTargetUserId(null);
      setGroupUserIds([]);
      setTeamId(null);
      await loadConversations();
      openConversation(data.conversation.id);
      await loadMessages(data.conversation.id);
    } catch (error) {
      toast.error('Failed to create conversation', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  onMount(async () => {
    await Promise.all([loadConversations(), loadMembers(), loadTeams()]);
    startRealtime();
    typingCleanupTimer = window.setInterval(() => {
      const cutoff = Date.now() - 6000;
      setTypingByConversation((prev) => {
        let changed = false;
        const next: Record<number, Record<number, number>> = {};
        for (const [convIDRaw, users] of Object.entries(prev)) {
          const convID = Number(convIDRaw);
          const filtered: Record<number, number> = {};
          for (const [userIDRaw, startedAt] of Object.entries(users)) {
            if (Number(startedAt) >= cutoff) {
              filtered[Number(userIDRaw)] = Number(startedAt);
            } else {
              changed = true;
            }
          }
          next[convID] = filtered;
        }
        return changed ? next : prev;
      });
    }, 1500);
  });

  onMount(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (searchOpen()) {
        setSearchOpen(false);
      }
      if (showCreateConversation()) {
        setShowCreateConversation(false);
      }
      if (mentionOpen()) {
        setMentionOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    onCleanup(() => {
      window.removeEventListener('keydown', handleEscape);
    });
  });

  onCleanup(() => {
    markTypingStopped();
    discardVoiceRecording = true;
    stopVoiceRecording();
    cleanupCallResources();
    if (mentionSearchTimer) {
      window.clearTimeout(mentionSearchTimer);
      mentionSearchTimer = null;
    }
    if (typingCleanupTimer) {
      window.clearInterval(typingCleanupTimer);
      typingCleanupTimer = null;
    }
    if (typingStopTimer) {
      window.clearTimeout(typingStopTimer);
      typingStopTimer = null;
    }
    for (const timer of Array.from(sensitiveRevealTimers.values())) {
      window.clearTimeout(timer);
    }
    sensitiveRevealTimers.clear();
    stopPollingFallback();
    realtime?.disconnect();
  });

  // Keep message list in sync with selected conversation
  const syncSelectedConversation = async () => {
    if (!selectedConversationId()) return;
    await Promise.all([
      loadMessages(selectedConversationId()!),
      loadConversationDetails(selectedConversationId()!),
    ]);
  };

  // Re-run loading whenever selected conversation changes
  let lastConversationId: number | null = null;
  const selectionWatcher = setInterval(() => {
    const current = selectedConversationId();
    if (current && current !== lastConversationId) {
      if (lastConversationId) {
        markTypingStopped(lastConversationId);
      }
      lastConversationId = current;
      syncSelectedConversation();
    }
  }, 250);
  onCleanup(() => clearInterval(selectionWatcher));

  // Fallback polling when websocket is disconnected.
  const wsWatcher = setInterval(() => {
    if (wsStatus() === 'connected') {
      stopPollingFallback();
    } else {
      startPollingFallback();
    }
  }, 1500);
  onCleanup(() => clearInterval(wsWatcher));

  return (
    <div class={`messages-shell ${activeScreen() === 'conversation' ? 'messages-shell-conversation' : 'messages-shell-list'}`}>
      <aside class="messages-sidebar">
        <div class="messages-sidebar-header">
          <div class="messages-title-row">
            <div class="messages-title-wrap">
              <IconMessageCircle class="size-5 text-primary" />
              <h2 class="messages-title">Messages</h2>
            </div>
            <Button size="sm" variant="outline" onClick={() => setSearchOpen(true)}>
              <IconSearch class="size-4" />
            </Button>
          </div>
          <div class="messages-sidebar-actions">
            <Button size="sm" onClick={() => setShowCreateConversation(true)} class="flex-1">
              <IconPlus class="size-4 mr-1" />
              New Chat
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (browserNotificationsEnabled()) {
                  setBrowserNotificationsEnabled(false);
                  localStorage.setItem('messages_browser_notifications', 'false');
                } else {
                  requestNotificationPermission();
                }
              }}
            >
              <Show when={browserNotificationsEnabled()} fallback={<IconBellOff class="size-4" />}>
                <IconBell class="size-4" />
              </Show>
            </Button>
          </div>
          <div class="messages-status-row">
            <span>Realtime: {wsStatus()}</span>
            <Show when={loadingConversations()}>
              <span>Refreshing…</span>
            </Show>
          </div>
        </div>

        <div class="messages-sidebar-list">
          <Show
            when={sortedConversations().length > 0}
            fallback={
              <div class="messages-list-empty">
                No chats yet. Start one with <span class="font-medium">New Chat</span>.
              </div>
            }
          >
            <For each={sortedConversations()}>
              {(item) => (
                <button
                  class={`conversation-item ${
                    selectedConversationId() === item.conversation.id ? 'conversation-item-active' : ''
                  }`}
                  onClick={() => openConversation(item.conversation.id)}
                >
                  <div class="conversation-item-main">
                    <p class="conversation-item-name">{item.conversation.name}</p>
                    <p class="conversation-item-preview">
                      {item.last_message?.body || item.conversation.topic || item.conversation.type}
                    </p>
                  </div>
                  <Show when={item.unread_count > 0}>
                    <span class="conversation-item-unread">{item.unread_count}</span>
                  </Show>
                </button>
              )}
            </For>
          </Show>
        </div>
      </aside>

      <section class="messages-main">
        <header class="messages-main-header">
          <div class="messages-header-main">
            <Button size="sm" variant="ghost" class="messages-back-button" onClick={closeConversation}>
              <IconChevronLeft class="size-4" />
            </Button>
            <div class="messages-header-meta">
              <h3 class="messages-header-title">{activeConversation()?.conversation.name || 'Conversation'}</h3>
              <p class="messages-header-subtitle">
                {activeConversation()?.conversation.topic || activeConversation()?.conversation.type || 'No topic'}
              </p>
            </div>
          </div>
          <div class="messages-header-actions">
            <Button
              size="sm"
              variant={isCallActive() ? 'outline' : 'default'}
              onClick={() => {
                if (isCallActive()) {
                  endVoiceCall(true);
                } else {
                  startVoiceCall();
                }
              }}
              disabled={!selectedConversationId()}
            >
              <Show when={isCallActive()} fallback={<IconPhone class="size-4" />}>
                <IconPhoneOff class="size-4" />
              </Show>
            </Button>
            <Show when={isCallActive()}>
              <Button size="sm" variant="outline" onClick={toggleCallMute}>
                <Show when={callMuted()} fallback={<IconMicrophone class="size-4" />}>
                  <IconMicrophoneOff class="size-4" />
                </Show>
              </Button>
            </Show>
            <Button size="sm" variant="outline" onClick={() => setSearchOpen(true)}>
              <IconSearch class="size-4" />
            </Button>
          </div>
        </header>

        <Show
          when={selectedConversationId()}
          fallback={
            <div class="messages-main-empty">
              Select a conversation from the list.
            </div>
          }
        >
        <Show when={isCallActive()}>
          <div class="messages-call-strip">
            <span>
              Call status: {callStatus()}
              <Show when={activeCallPeerIds().length > 0}>
                <span> • with {activeCallPeerIds().length} participant{activeCallPeerIds().length > 1 ? 's' : ''}</span>
              </Show>
            </span>
            <label class="messages-inline-toggle">
              <input
                type="checkbox"
                checked={callTranscriptEnabled()}
                onChange={(e) => {
                  const enabled = e.currentTarget.checked;
                  setCallTranscriptPreference(enabled);
                  if (!enabled) {
                    stopCallRecognition();
                  } else if (isCallActive()) {
                    startCallRecognition();
                  }
                }}
              />
              Local call transcript
            </label>
          </div>
        </Show>

        <Show when={callTranscriptPreview()}>
          <div class="messages-transcript-preview">
            <span class="font-medium">Call transcript:</span> {callTranscriptPreview()}
          </div>
        </Show>

        <div class="messages-timeline">
          <Show when={loadingMessages()}>
            <p class="text-sm text-muted-foreground">Loading messages…</p>
          </Show>

          <For each={messages()}>
            {(message) => (
              <div class={`message-row ${message.sender_id === currentUserId() ? 'message-row-me' : 'message-row-them'}`}>
                <div class={`message-bubble ${message.sender_id === currentUserId() ? 'message-bubble-me' : 'message-bubble-them'}`}>
                  <div class="message-meta">
                    <div class="message-avatar">
                      <Show
                        when={message.sender?.avatar_url}
                        fallback={
                          <span>
                            {(message.sender?.full_name || message.sender?.username || 'U').charAt(0).toUpperCase()}
                          </span>
                        }
                      >
                        <img
                          src={message.sender?.avatar_url}
                          alt={message.sender?.username || 'Member'}
                          class="w-full h-full object-cover"
                        />
                      </Show>
                    </div>
                    <span class="truncate">{message.sender?.full_name || message.sender?.username || 'Unknown user'}</span>
                    <span class="message-time">{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <Show when={message.edited_at}>
                      <span class="message-edited">edited</span>
                    </Show>
                  </div>

                  <p class="message-body">
                    {message.is_sensitive && shouldUseSensitiveReveal() && !revealedSensitiveMessages()[message.id]
                      ? message.body || '[sensitive content hidden]'
                      : revealedSensitiveMessages()[message.id] || message.body}
                  </p>

                  <Show when={message.is_sensitive && shouldUseSensitiveReveal()}>
                    <div class="message-sensitive-banner">
                      <span>Sensitive content hidden by default.</span>
                      <Show when={revealedSensitiveMessages()[message.id]} fallback={
                        <Button size="sm" variant="outline" onClick={() => revealSensitiveMessage(message.id)}>
                          Reveal
                        </Button>
                      }>
                        <span class="text-xs text-muted-foreground">Visible for 15 seconds</span>
                      </Show>
                    </div>
                  </Show>

                  <Show when={(message.attachments || []).length > 0}>
                    <div class="message-attachments">
                      <For each={message.attachments || []}>
                        {(att) => (
                          <Show
                            when={att.kind === 'voice_note' && att.url}
                            fallback={
                              <a href={att.url || '#'} target="_blank" rel="noreferrer" class="message-attachment-link">
                                <IconFile class="size-4" />
                                <span>{att.title || 'Attachment'}</span>
                              </a>
                            }
                          >
                            <div class="message-voice-note">
                              <span class="font-medium">{att.title || 'Voice note'}</span>
                              <audio controls src={att.url || ''} class="w-full" />
                            </div>
                          </Show>
                        )}
                      </For>
                    </div>
                  </Show>

                  <Show when={(message.references || []).length > 0}>
                    <div class="message-reference-wrap">
                      <For each={message.references || []}>
                        {(ref) => (
                          <a href={ref.deep_link} class="message-reference-pill">
                            {ref.entity_type}
                          </a>
                        )}
                      </For>
                    </div>
                  </Show>

                  <Show
                    when={(message.suggestions || []).some(
                      (suggestion) => suggestion.status === 'pending' && suggestion.type !== 'move_to_password_vault'
                    )}
                  >
                    <div class="message-suggestions">
                      <For
                        each={(message.suggestions || []).filter(
                          (suggestion) => suggestion.status === 'pending' && suggestion.type !== 'move_to_password_vault'
                        )}
                      >
                        {(suggestion) => (
                          <div class="message-suggestion-card">
                            <div class="message-suggestion-title">{suggestion.type.replace(/_/g, ' ')}</div>
                            <div class="message-suggestion-actions">
                              <Button size="sm" onClick={() => handleSuggestionAction(message.id, suggestion, 'accept')}>
                                Apply
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleSuggestionAction(message.id, suggestion, 'dismiss')}>
                                Dismiss
                              </Button>
                            </div>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>

                  <div class="message-reaction-panel">
                    <div class="message-reaction-add-row">
                      <For each={REACTION_PRESETS}>
                        {(preset) => {
                          const Icon = preset.icon;
                          return (
                            <button
                              class="reaction-add-btn"
                              onClick={() => toggleReaction(message, preset.key)}
                              title={preset.label}
                            >
                              <Icon class="size-3.5" />
                            </button>
                          );
                        }}
                      </For>
                    </div>
                    <Show when={reactionEntries(message).length > 0}>
                      <div class="message-reaction-summary">
                        <For each={reactionEntries(message)}>
                          {(entry) => {
                            const key = entry[0];
                            const data = entry[1];
                            const Icon = reactionIconForKey(key);
                            return (
                              <button
                                class={`reaction-pill ${data.mine ? 'reaction-pill-me' : ''}`}
                                onClick={() => toggleReaction(message, key)}
                              >
                                <Icon class="size-3.5" />
                                <span>{data.count}</span>
                              </button>
                            );
                          }}
                        </For>
                      </div>
                    </Show>
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>

        <div
          class={`messages-composer ${isDragOverComposer() ? 'messages-composer-drag' : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragOverComposer(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragOverComposer(false);
          }}
          onDrop={handleComposerDrop}
        >
          <Show when={activeTypingUserNames().length > 0}>
            <div class="messages-typing-line">
              <span class="typing-dots"><span /><span /><span /></span>
              <span>
                {activeTypingUserNames().length === 1
                  ? `${activeTypingUserNames()[0]} is typing`
                  : `${activeTypingUserNames().slice(0, 2).join(', ')}${activeTypingUserNames().length > 2 ? ' and others' : ''} are typing`}
              </span>
            </div>
          </Show>

          <Show when={selectedFiles().length > 0 || attachedLibraryFiles().length > 0}>
            <div class="composer-chip-wrap">
              <For each={selectedFiles()}>
                {(file, index) => (
                  <div class="composer-chip">
                    <IconUpload class="size-3.5" />
                    <span>{file.name}</span>
                    <button class="composer-chip-remove" onClick={() => removeLocalFile(index())}>
                      <IconX class="size-3.5" />
                    </button>
                  </div>
                )}
              </For>
              <For each={attachedLibraryFiles()}>
                {(file) => (
                  <div class="composer-chip">
                    <IconFile class="size-3.5" />
                    <span>{file.original_name}</span>
                    <button class="composer-chip-remove" onClick={() => removeAttachedLibraryFile(file.id)}>
                      <IconX class="size-3.5" />
                    </button>
                  </div>
                )}
              </For>
            </div>
          </Show>

          <Show when={voiceTranscriptPreview()}>
            <div class="messages-transcript-preview">
              <span class="font-medium">Voice transcript:</span> {voiceTranscriptPreview()}
            </div>
          </Show>

          <Show when={isRecordingVoice()}>
            <div class="messages-recording-line">Recording {formatMs(voiceRecordingMs())}</div>
          </Show>

          <div class="messages-composer-row">
            <input
              type="file"
              multiple
              class="hidden"
              ref={(el) => {
                hiddenFileInputRef = el;
              }}
              onChange={onFileSelect}
            />

            <Button size="sm" variant="outline" onClick={() => hiddenFileInputRef?.click()}>
              <IconPaperclip class="size-4" />
            </Button>

            <Button
              size="sm"
              variant={isRecordingVoice() ? 'default' : 'outline'}
              onClick={() => {
                if (isRecordingVoice()) {
                  stopVoiceRecording();
                } else {
                  startVoiceRecording();
                }
              }}
              disabled={sendingMessage()}
            >
              <Show when={isRecordingVoice()} fallback={<IconMicrophone class="size-4" />}>
                <IconMicrophoneOff class="size-4" />
              </Show>
            </Button>

            <div class="messages-composer-input-wrap">
              <textarea
                ref={(el) => {
                  composerTextareaRef = el;
                }}
                value={inputText()}
                class="messages-composer-textarea"
                placeholder='Type a message. Use "@" for people or files.'
                rows={1}
                onInput={(event) => handleComposerInput(event as any)}
                onKeyDown={(event) => {
                  if (mentionOpen()) {
                    if (event.key === 'ArrowDown') {
                      event.preventDefault();
                      setMentionHighlightedIndex((prev) =>
                        mentionOptions().length === 0 ? 0 : (prev + 1) % mentionOptions().length
                      );
                      return;
                    }
                    if (event.key === 'ArrowUp') {
                      event.preventDefault();
                      setMentionHighlightedIndex((prev) =>
                        mentionOptions().length === 0
                          ? 0
                          : (prev - 1 + mentionOptions().length) % mentionOptions().length
                      );
                      return;
                    }
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      const option = mentionOptions()[mentionHighlightedIndex()];
                      const caret = composerTextareaRef?.selectionStart || inputText().length;
                      const token = activeMentionToken(inputText(), caret);
                      if (option && token) {
                        selectMentionOption(option, token);
                        return;
                      }
                    }
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      setMentionOpen(false);
                      return;
                    }
                  }

                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
              />

              <Show when={mentionOpen()}>
                <div class="mention-menu">
                  <Show when={mentionLoading()}>
                    <div class="mention-menu-empty">Loading suggestions…</div>
                  </Show>
                  <Show when={!mentionLoading() && mentionOptions().length === 0}>
                    <div class="mention-menu-empty">No matches for @{mentionQuery()}</div>
                  </Show>
                  <For each={mentionOptions()}>
                    {(option, index) => (
                      <button
                        class={`mention-option ${mentionHighlightedIndex() === index() ? 'mention-option-active' : ''}`}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          const caret = composerTextareaRef?.selectionStart || inputText().length;
                          const token = activeMentionToken(inputText(), caret);
                          if (!token) return;
                          selectMentionOption(option, token);
                        }}
                      >
                        <Show when={option.type === 'user'} fallback={<IconFile class="size-4" />}>
                          <IconAt class="size-4" />
                        </Show>
                        <div class="mention-option-copy">
                          <div class="mention-option-title">{option.label}</div>
                          <Show when={option.type === 'user'} fallback={
                            <div class="mention-option-sub">Attach file to message</div>
                          }>
                            <div class="mention-option-sub">@{(option as MentionUserOption).username}</div>
                          </Show>
                        </div>
                      </button>
                    )}
                  </For>
                </div>
              </Show>
            </div>

            <Button
              onClick={() => sendMessage()}
              disabled={
                sendingMessage() ||
                (!inputText().trim() && selectedFiles().length === 0 && attachedLibraryFiles().length === 0)
              }
            >
              <IconSend class="size-4" />
            </Button>
          </div>

          <div class="messages-composer-footer">
            <label class="messages-inline-toggle">
              <input
                type="checkbox"
                checked={voiceTranscriptEnabled()}
                onChange={(e) => {
                  const enabled = e.currentTarget.checked;
                  setVoiceTranscriptPreference(enabled);
                  if (!enabled) {
                    stopVoiceRecognition();
                    setVoiceTranscriptPreview('');
                  } else if (isRecordingVoice()) {
                    startVoiceRecognition();
                  }
                }}
              />
              Voice transcript
            </label>
            <Show
              when={uploadProgress()}
              fallback={<span class="text-xs text-muted-foreground">Drop files here or use the attachment icon.</span>}
            >
              {(progress) => (
                <span class="text-xs text-muted-foreground">
                  Uploading files {progress().done}/{progress().total}
                </span>
              )}
            </Show>
          </div>
        </div>
        </Show>
      </section>

      <Show when={showCreateConversation()}>
        <div
          class="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowCreateConversation(false);
            }
          }}
        >
          <div class="bg-card border rounded-lg w-full max-w-lg p-4 space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold">Create Conversation</h3>
              <Button size="sm" variant="ghost" onClick={() => setShowCreateConversation(false)}>
                <IconX class="size-4" />
              </Button>
            </div>

            <div class="grid grid-cols-3 gap-2">
              <Button variant={newConversationType() === 'dm' ? 'default' : 'outline'} onClick={() => setNewConversationType('dm')}>
                Direct
              </Button>
              <Button variant={newConversationType() === 'group' ? 'default' : 'outline'} onClick={() => setNewConversationType('group')}>
                Group
              </Button>
              <Button variant={newConversationType() === 'team' ? 'default' : 'outline'} onClick={() => setNewConversationType('team')}>
                Team
              </Button>
            </div>

            <Show when={newConversationType() !== 'dm'}>
              <Input
                value={newConversationName()}
                onInput={(e) => setNewConversationName((e.currentTarget as HTMLInputElement).value)}
                placeholder="Conversation name"
              />
            </Show>

            <Input
              value={newConversationTopic()}
              onInput={(e) => setNewConversationTopic((e.currentTarget as HTMLInputElement).value)}
              placeholder="Topic (optional)"
            />

            <Show when={newConversationType() === 'dm'}>
              <select
                class="w-full h-10 rounded-md border bg-background px-3"
                value={targetUserId() ? String(targetUserId()) : ''}
                onChange={(event) => setTargetUserId(event.currentTarget.value ? Number(event.currentTarget.value) : null)}
              >
                <option value="">Select member</option>
                <For each={members().filter((member) => member.id !== currentUserId())}>
                  {(member) => (
                    <option value={member.id}>
                      {member.name} {member.username ? `(@${member.username})` : ''}
                    </option>
                  )}
                </For>
              </select>
            </Show>

            <Show when={newConversationType() === 'group'}>
              <div class="max-h-52 overflow-y-auto rounded-md border p-2 space-y-2">
                <For each={members().filter((member) => member.id !== currentUserId())}>
                  {(member) => (
                    <label class="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={groupUserIds().includes(member.id)}
                        onChange={(event) =>
                          setGroupUserIds((prev) =>
                            event.currentTarget.checked
                              ? [...prev, member.id]
                              : prev.filter((id) => id !== member.id)
                          )
                        }
                      />
                      <span>{member.name}</span>
                      <span class="text-xs text-muted-foreground">{member.username ? `@${member.username}` : ''}</span>
                    </label>
                  )}
                </For>
              </div>
            </Show>

            <Show when={newConversationType() === 'team'}>
              <select
                class="w-full h-10 rounded-md border bg-background px-3"
                value={teamId() ? String(teamId()) : ''}
                onChange={(event) => setTeamId(event.currentTarget.value ? Number(event.currentTarget.value) : null)}
              >
                <option value="">Select team</option>
                <For each={teams()}>
                  {(team) => (
                    <option value={team.id}>{team.name}</option>
                  )}
                </For>
              </select>
            </Show>

            <div class="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateConversation(false)}>Cancel</Button>
              <Button onClick={createConversation}>Create</Button>
            </div>
          </div>
        </div>
      </Show>

      <Show when={searchOpen()}>
        <div
          class="fixed inset-0 z-50 bg-black/45 flex items-start justify-center p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSearchOpen(false);
            }
          }}
        >
          <div class="bg-card border rounded-lg w-full max-w-2xl mt-12">
            <div class="p-4 border-b flex items-center justify-between">
              <h3 class="font-semibold">Search Messages</h3>
              <Button size="sm" variant="ghost" onClick={() => setSearchOpen(false)}>
                <IconX class="size-4" />
              </Button>
            </div>
            <div class="p-4">
              <div class="flex gap-2">
                <Input
                  value={searchQuery()}
                  onInput={(e) => setSearchQuery((e.currentTarget as HTMLInputElement).value)}
                  placeholder="Search by text, file type, URL, or mention"
                  onKeyDown={(event: KeyboardEvent) => {
                    if (event.key === 'Enter') {
                      void performSearch();
                    }
                  }}
                />
                <Button onClick={performSearch} disabled={searching()}>
                  <IconSearch class="size-4 mr-1" />
                  Search
                </Button>
              </div>

              <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs text-muted-foreground mb-1">Sender</label>
                  <select
                    class="w-full h-10 rounded-md border bg-background px-3 text-sm"
                    value={searchSenderId()}
                    onChange={(e) => setSearchSenderId(e.currentTarget.value)}
                  >
                    <option value="">Any sender</option>
                    <For each={members()}>
                      {(member) => (
                        <option value={member.id}>
                          {member.name} {member.username ? `(@${member.username})` : ''}
                        </option>
                      )}
                    </For>
                  </select>
                </div>
                <div class="flex items-end gap-2">
                  <Button size="sm" variant="outline" onClick={clearSearchFilters}>
                    Clear Filters
                  </Button>
                </div>
                <div>
                  <label class="block text-xs text-muted-foreground mb-1">Date from</label>
                  <Input
                    type="datetime-local"
                    value={searchDateFrom()}
                    onInput={(e) => setSearchDateFrom((e.currentTarget as HTMLInputElement).value)}
                  />
                </div>
                <div>
                  <label class="block text-xs text-muted-foreground mb-1">Date to</label>
                  <Input
                    type="datetime-local"
                    value={searchDateTo()}
                    onInput={(e) => setSearchDateTo((e.currentTarget as HTMLInputElement).value)}
                  />
                </div>
                <div>
                  <label class="block text-xs text-muted-foreground mb-1">Has links</label>
                  <select
                    class="w-full h-10 rounded-md border bg-background px-3 text-sm"
                    value={searchHasLinks()}
                    onChange={(e) => setSearchHasLinks(e.currentTarget.value as TriStateFilter)}
                  >
                    <option value="any">Any</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs text-muted-foreground mb-1">Has attachments</label>
                  <select
                    class="w-full h-10 rounded-md border bg-background px-3 text-sm"
                    value={searchHasAttachments()}
                    onChange={(e) => setSearchHasAttachments(e.currentTarget.value as TriStateFilter)}
                  >
                    <option value="any">Any</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs text-muted-foreground mb-1">Has suggestions</label>
                  <select
                    class="w-full h-10 rounded-md border bg-background px-3 text-sm"
                    value={searchHasSuggestions()}
                    onChange={(e) => setSearchHasSuggestions(e.currentTarget.value as TriStateFilter)}
                  >
                    <option value="any">Any</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <label class="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={searchMentionOnly()}
                    onChange={(e) => setSearchMentionOnly(e.currentTarget.checked)}
                  />
                  Mention only
                </label>
              </div>

              <div class="mt-3">
                <label class="block text-xs text-muted-foreground mb-1">Conversations</label>
                <div class="flex flex-wrap gap-2">
                  <For each={sortedConversations()}>
                    {(item) => (
                      <button
                        class={`text-xs px-2 py-1 rounded border ${
                          searchConversationIds().includes(item.conversation.id)
                            ? 'bg-primary text-primary-foreground border-primary/50'
                            : 'bg-background hover:bg-muted border-border'
                        }`}
                        onClick={() =>
                          setSearchConversationIds((prev) =>
                            toggleNumberFilter(prev, item.conversation.id)
                          )
                        }
                      >
                        {item.conversation.name}
                      </button>
                    )}
                  </For>
                </div>
              </div>

              <div class="mt-3">
                <label class="block text-xs text-muted-foreground mb-1">Attachment kinds</label>
                <div class="flex flex-wrap gap-2">
                  <For each={ATTACHMENT_KIND_OPTIONS}>
                    {(kind) => (
                      <button
                        class={`text-xs px-2 py-1 rounded border ${
                          searchAttachmentKinds().includes(kind)
                            ? 'bg-primary text-primary-foreground border-primary/50'
                            : 'bg-background hover:bg-muted border-border'
                        }`}
                        onClick={() => setSearchAttachmentKinds((prev) => toggleStringFilter(prev, kind))}
                      >
                        {kind}
                      </button>
                    )}
                  </For>
                </div>
              </div>

              <div class="mt-3">
                <label class="block text-xs text-muted-foreground mb-1">Reference types</label>
                <div class="flex flex-wrap gap-2">
                  <For each={REFERENCE_TYPE_OPTIONS}>
                    {(refType) => (
                      <button
                        class={`text-xs px-2 py-1 rounded border ${
                          searchReferenceTypes().includes(refType)
                            ? 'bg-primary text-primary-foreground border-primary/50'
                            : 'bg-background hover:bg-muted border-border'
                        }`}
                        onClick={() => setSearchReferenceTypes((prev) => toggleStringFilter(prev, refType))}
                      >
                        {refType}
                      </button>
                    )}
                  </For>
                </div>
              </div>

              <div class="mt-4 max-h-96 overflow-y-auto space-y-2">
                <For each={searchResults()}>
                  {(result) => (
                    <button class="w-full text-left border rounded-md p-3 hover:bg-muted" onClick={() => openSearchResult(result)}>
                      <div class="text-sm font-medium">{conversationNameById(result.conversation_id)}</div>
                      <div class="text-xs text-muted-foreground mt-1 line-clamp-2">{result.body}</div>
                    </button>
                  )}
                </For>
                <Show when={!searching() && searchResults().length === 0}>
                  <div class="text-sm text-muted-foreground">No results yet.</div>
                </Show>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default Messages;
