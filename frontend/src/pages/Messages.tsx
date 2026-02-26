import { createSignal, For, Show, onCleanup, onMount } from 'solid-js';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
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
  VaultItem,
} from '@/lib/messages';
import {
  IconBell,
  IconBellOff,
  IconLock,
  IconMessageCircle,
  IconPlus,
  IconSearch,
  IconSend,
  IconUsers,
  IconX,
} from '@tabler/icons-solidjs';

interface MemberOption {
  id: number;
  username: string;
  name: string;
}

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
  'password_vault_item',
];

type TriStateFilter = 'any' | 'yes' | 'no';
type CallStatus = 'idle' | 'starting' | 'calling' | 'in_call' | 'error';

export const Messages = () => {
  const [conversations, setConversations] = createSignal<ConversationListItem[]>([]);
  const [messages, setMessages] = createSignal<Message[]>([]);
  const [selectedConversationId, setSelectedConversationId] = createSignal<number | null>(null);
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
  const [showVault, setShowVault] = createSignal(false);
  const [vaultItems, setVaultItems] = createSignal<VaultItem[]>([]);
  const [revealedSecrets, setRevealedSecrets] = createSignal<Record<number, { secret: string; notes: string }>>({});
  const [shareTargets, setShareTargets] = createSignal<Record<number, string>>({});
  const [members, setMembers] = createSignal<MemberOption[]>([]);
  const [conversationMembers, setConversationMembers] = createSignal<ConversationMember[]>([]);
  const [typingByConversation, setTypingByConversation] = createSignal<Record<number, Record<number, number>>>({});
  const [newConversationType, setNewConversationType] = createSignal<'dm' | 'group' | 'team'>('dm');
  const [newConversationName, setNewConversationName] = createSignal('');
  const [newConversationTopic, setNewConversationTopic] = createSignal('');
  const [targetUserId, setTargetUserId] = createSignal('');
  const [groupUserIds, setGroupUserIds] = createSignal('');
  const [teamId, setTeamId] = createSignal('');
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

  const sortedConversations = () =>
    [...conversations()].sort((a, b) => {
      const aDate = a.conversation.last_message_at || a.conversation.updated_at;
      const bDate = b.conversation.last_message_at || b.conversation.updated_at;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });

  const activeConversation = () =>
    conversations().find((item) => item.conversation.id === selectedConversationId()) || null;

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
        return member?.user?.full_name || member?.user?.username || `User ${id}`;
      });

    return names;
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

      if (response.warning) {
        toast.warning('Sensitive Content Warning', response.warning);
      }

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
      if (selectedConversationId() !== conversationID) {
        setSelectedConversationId(conversationID);
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
      setConversations(data.conversations || []);
      if (!selectedConversationId() && data.conversations?.length) {
        setSelectedConversationId(data.conversations[0].conversation.id);
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
        name: m.name || m.full_name || m.email || `User ${m.id}`,
      }));
      setMembers(mapped);
    } catch {
      // ignore
    }
  };

  const loadVaultItems = async () => {
    try {
      const data = await messagesApi.listVaultItems();
      setVaultItems(data.items || []);
    } catch (error) {
      toast.error('Failed to load vault items', error instanceof Error ? error.message : 'Unknown error');
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
    setSelectedFiles(files);
  };

  const sendMessage = async () => {
    if (!selectedConversationId()) return;
    const body = inputText().trim();
    if (!body && selectedFiles().length === 0) return;

    try {
      const attachments: any[] = [];
      for (const file of selectedFiles()) {
        const uploaded = await uploadChatFile(file);
        attachments.push({
          kind: uploaded.mime_type?.startsWith('image/') ? 'image' : 'file',
          file_id: uploaded.id,
          title: uploaded.original_name,
          url: `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/files/${uploaded.id}/download`,
        });
      }

      await postMessage(body, attachments);
      setInputText('');
      setSelectedFiles([]);
    } catch (error) {
      toast.error('Failed to send message', error instanceof Error ? error.message : 'Unknown error');
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
      if (suggestion.type === 'move_to_password_vault') {
        await loadVaultItems();
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
    setSelectedConversationId(result.conversation_id);
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
        payload.user_ids = [Number(targetUserId())];
      } else if (type === 'group') {
        payload.user_ids = groupUserIds()
          .split(',')
          .map((part) => Number(part.trim()))
          .filter((id) => Number.isFinite(id) && id > 0);
      } else if (type === 'team') {
        payload.team_id = Number(teamId());
      }

      const data = await messagesApi.createConversation(payload);
      setShowCreateConversation(false);
      setNewConversationName('');
      setNewConversationTopic('');
      setTargetUserId('');
      setGroupUserIds('');
      setTeamId('');
      await loadConversations();
      setSelectedConversationId(data.conversation.id);
      await loadMessages(data.conversation.id);
    } catch (error) {
      toast.error('Failed to create conversation', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const revealVaultItem = async (item: VaultItem) => {
    try {
      const revealed = await messagesApi.revealVaultItem(item.id);
      setRevealedSecrets((prev) => ({
        ...prev,
        [item.id]: { secret: revealed.secret, notes: revealed.notes || '' },
      }));
      toast.warning('Password Safety', revealed.warning || 'Handle revealed secrets with care.');
    } catch (error) {
      toast.error('Failed to reveal vault item', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const shareVaultItem = async (item: VaultItem) => {
    const targetRaw = shareTargets()[item.id];
    const targetConversationID = Number(targetRaw);
    if (!targetConversationID) {
      toast.warning('Target required', 'Enter a valid conversation ID.');
      return;
    }
    try {
      await messagesApi.shareVaultItem(item.id, {
        target_conversation_id: targetConversationID,
        allow_reveal: true,
      });
      toast.success('Vault item shared');
      await loadVaultItems();
    } catch (error) {
      toast.error('Failed to share vault item', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  onMount(async () => {
    await Promise.all([loadConversations(), loadMembers(), loadVaultItems()]);
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

  onCleanup(() => {
    markTypingStopped();
    discardVoiceRecording = true;
    stopVoiceRecording();
    cleanupCallResources();
    if (typingCleanupTimer) {
      window.clearInterval(typingCleanupTimer);
      typingCleanupTimer = null;
    }
    if (typingStopTimer) {
      window.clearTimeout(typingStopTimer);
      typingStopTimer = null;
    }
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
    <div class="h-full flex">
      {/* Left rail */}
      <div class="w-80 border-r bg-card flex flex-col">
        <div class="p-4 border-b">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <IconMessageCircle class="size-5 text-primary" />
              <h2 class="text-lg font-semibold">Messages</h2>
            </div>
            <Button size="sm" variant="outline" onClick={() => setSearchOpen(true)}>
              <IconSearch class="size-4" />
            </Button>
          </div>
          <div class="mt-3 flex items-center gap-2">
            <Button size="sm" onClick={() => setShowCreateConversation(true)} class="flex-1">
              <IconPlus class="size-4 mr-1" />
              New
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
        </div>

        <div class="px-4 py-2 text-xs text-muted-foreground flex items-center justify-between">
          <span>Status: {wsStatus()}</span>
          <Show when={loadingConversations()}>
            <span>Refreshing…</span>
          </Show>
        </div>

        <div class="flex-1 overflow-y-auto p-2 space-y-1">
          <For each={sortedConversations()}>
            {(item) => (
              <button
                class={`w-full text-left rounded-lg p-3 transition-colors border ${
                  selectedConversationId() === item.conversation.id
                    ? 'bg-primary/10 border-primary/30'
                    : 'border-transparent hover:bg-muted'
                }`}
                onClick={() => setSelectedConversationId(item.conversation.id)}
              >
                <div class="flex items-center justify-between gap-2">
                  <div class="min-w-0">
                    <p class="font-medium truncate">{item.conversation.name}</p>
                    <p class="text-xs text-muted-foreground truncate">
                      {item.conversation.type}
                      {item.last_message ? ` • ${item.last_message.body}` : ''}
                    </p>
                  </div>
                  <Show when={item.unread_count > 0}>
                    <span class="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                      {item.unread_count}
                    </span>
                  </Show>
                </div>
              </button>
            )}
          </For>
        </div>
      </div>

      {/* Center timeline */}
      <div class="flex-1 flex flex-col min-w-0">
        <div class="border-b p-4 flex items-center justify-between">
          <div>
            <h3 class="font-semibold text-lg">{activeConversation()?.conversation.name || 'Select a conversation'}</h3>
            <p class="text-xs text-muted-foreground">
              {activeConversation()?.conversation.topic || activeConversation()?.conversation.type || ''}
            </p>
          </div>
          <div class="flex items-center gap-2">
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
              {isCallActive() ? 'End Call' : 'Call'}
            </Button>
            <Show when={isCallActive()}>
              <Button size="sm" variant="outline" onClick={toggleCallMute}>
                {callMuted() ? 'Unmute' : 'Mute'}
              </Button>
            </Show>
            <Button size="sm" variant="outline" onClick={() => setShowVault(!showVault())}>
              <IconLock class="size-4 mr-1" />
              Vault
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSearchOpen(true)}>
              <IconSearch class="size-4 mr-1" />
              Search
            </Button>
          </div>
        </div>
        <Show when={isCallActive()}>
          <div class="px-4 pb-3 text-xs text-muted-foreground flex flex-wrap items-center gap-3">
            <span>
              Call status: {callStatus()}
              <Show when={activeCallPeerIds().length > 0}>
                <span> • with {activeCallPeerIds().length} peer{activeCallPeerIds().length > 1 ? 's' : ''}</span>
              </Show>
            </span>
            <label class="inline-flex items-center gap-2">
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
              Local call transcription
            </label>
          </div>
        </Show>
        <Show when={callTranscriptPreview()}>
          <div class="px-4 pb-3 text-xs text-muted-foreground">
            <span class="font-medium">Call transcript preview:</span> {callTranscriptPreview()}
          </div>
        </Show>

        <div class="flex-1 overflow-y-auto p-4 space-y-4">
          <Show when={loadingMessages()}>
            <p class="text-sm text-muted-foreground">Loading messages…</p>
          </Show>

          <For each={messages()}>
            {(message) => (
              <div class={`flex ${message.sender_id === currentUserId() ? 'justify-end' : 'justify-start'}`}>
                <div
                  class={`max-w-[80%] rounded-lg p-3 border ${
                    message.sender_id === currentUserId()
                      ? 'bg-primary text-primary-foreground border-primary/40'
                      : 'bg-card border-border'
                  }`}
                >
                  <div class="text-xs opacity-80 mb-1 flex items-center gap-2">
                    <div class="size-6 rounded-full overflow-hidden bg-muted flex items-center justify-center text-[10px] font-semibold">
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
                          alt={message.sender?.username || `User ${message.sender_id}`}
                          class="w-full h-full object-cover"
                        />
                      </Show>
                    </div>
                    <span class="truncate">
                      {message.sender?.full_name || message.sender?.username || `User ${message.sender_id}`}
                    </span>
                    <Show when={message.edited_at}>
                      <span class="ml-1">(edited)</span>
                    </Show>
                  </div>
                  <p class="whitespace-pre-wrap break-words">{message.body}</p>

                  <Show when={message.is_sensitive}>
                    <div class="mt-2 text-xs rounded-md p-2 bg-amber-500/15 text-amber-700 dark:text-amber-300">
                      Sensitive content detected. We recommend Proton Pass (not affiliated).
                    </div>
                  </Show>

                  <Show when={(message.attachments || []).length > 0}>
                    <div class="mt-3 space-y-1">
                      <For each={message.attachments || []}>
                        {(att) => (
                          <Show
                            when={att.kind === 'voice_note' && att.url}
                            fallback={
                              <a
                                href={att.url || '#'}
                                target="_blank"
                                rel="noreferrer"
                                class="block text-xs rounded border border-border/50 p-2 hover:bg-muted/40"
                              >
                                <span class="font-medium">{att.kind}</span>
                                <span class="ml-2">{att.title || att.url}</span>
                              </a>
                            }
                          >
                            <div class="block text-xs rounded border border-border/50 p-2">
                              <div class="font-medium mb-1">{att.title || 'Voice note'}</div>
                              <audio controls src={att.url || ''} class="w-full" />
                            </div>
                          </Show>
                        )}
                      </For>
                    </div>
                  </Show>

                  <Show when={(message.references || []).length > 0}>
                    <div class="mt-2 flex flex-wrap gap-1">
                      <For each={message.references || []}>
                        {(ref) => (
                          <a
                            href={ref.deep_link}
                            class="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80"
                          >
                            {ref.entity_type}
                          </a>
                        )}
                      </For>
                    </div>
                  </Show>

                  <Show when={(message.suggestions || []).some((s) => s.status === 'pending')}>
                    <div class="mt-3 space-y-2">
                      <For each={(message.suggestions || []).filter((s) => s.status === 'pending')}>
                        {(suggestion) => (
                          <div class="rounded border border-border/60 p-2 bg-muted/40">
                            <div class="text-xs font-medium">{suggestion.type}</div>
                            <Show when={suggestion.type === 'password_warning'}>
                              <div class="text-xs mt-1">
                                We do not recommend storing passwords in chat. If needed, move it to encrypted vault storage.
                              </div>
                            </Show>
                            <div class="mt-2 flex gap-2">
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

                  <div class="mt-2 flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => addReaction(message.id, '👍')}>
                      👍
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => addReaction(message.id, '🔥')}>
                      🔥
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => addReaction(message.id, '✅')}>
                      ✅
                    </Button>
                    <Show when={(message.reactions || []).length > 0}>
                      <div class="text-xs text-muted-foreground ml-2">
                        {(message.reactions || []).map((r) => r.emoji).join(' ')}
                      </div>
                    </Show>
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>

        <div class="border-t p-4">
          <Show when={activeTypingUserNames().length > 0}>
            <div class="mb-2 text-xs text-muted-foreground">
              {activeTypingUserNames().length === 1
                ? `${activeTypingUserNames()[0]} is typing...`
                : `${activeTypingUserNames().slice(0, 2).join(', ')}${activeTypingUserNames().length > 2 ? ' and others' : ''} are typing...`}
            </div>
          </Show>
          <div class="flex items-center gap-2 mb-2">
            <input type="file" multiple onChange={onFileSelect} class="text-xs" />
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
              {isRecordingVoice() ? 'Stop Voice' : 'Voice Note'}
            </Button>
            <label class="text-xs inline-flex items-center gap-1">
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
              Local transcript
            </label>
            <Show when={selectedFiles().length > 0}>
              <span class="text-xs text-muted-foreground">
                {selectedFiles().length} file{selectedFiles().length > 1 ? 's' : ''} selected
              </span>
            </Show>
            <Show when={isRecordingVoice()}>
              <span class="text-xs text-rose-600 dark:text-rose-400">
                Recording {formatMs(voiceRecordingMs())}
              </span>
            </Show>
          </div>
          <Show when={voiceTranscriptPreview()}>
            <div class="mb-2 text-xs text-muted-foreground">
              <span class="font-medium">Voice transcript preview:</span> {voiceTranscriptPreview()}
            </div>
          </Show>
          <div class="flex gap-2">
            <Input
              value={inputText()}
              onInput={(e) => {
                const value = (e.currentTarget as HTMLInputElement).value;
                setInputText(value);
                if (value.trim()) {
                  markTypingStarted();
                } else {
                  markTypingStopped();
                }
              }}
              placeholder='Message (try links, tasks, events, or "@username" mentions)'
              onKeyDown={(e: KeyboardEvent) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <Button onClick={sendMessage} disabled={sendingMessage() || (!inputText().trim() && selectedFiles().length === 0)}>
              <IconSend class="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Right rail */}
      <div class="w-88 border-l bg-card overflow-y-auto">
        <div class="p-4 border-b">
          <h3 class="font-semibold flex items-center gap-2">
            <IconUsers class="size-4" />
            Details
          </h3>
          <p class="text-xs text-muted-foreground mt-1">
            Members, vault items, and quick actions
          </p>
        </div>

        <div class="p-4 space-y-4">
          <Card class="p-3">
            <h4 class="text-sm font-medium mb-2">Conversation Info</h4>
            <p class="text-xs text-muted-foreground">ID: {selectedConversationId() || '-'}</p>
            <p class="text-xs text-muted-foreground">Type: {activeConversation()?.conversation.type || '-'}</p>
          </Card>

          <Card class="p-3">
            <h4 class="text-sm font-medium mb-2">Members</h4>
            <Show
              when={conversationMembers().length > 0}
              fallback={<p class="text-xs text-muted-foreground">No members loaded.</p>}
            >
              <div class="space-y-2 max-h-56 overflow-y-auto">
                <For each={conversationMembers()}>
                  {(member) => (
                    <div class="flex items-center justify-between rounded-md border p-2">
                      <div class="flex items-center gap-2 min-w-0">
                        <div class="size-7 rounded-full overflow-hidden bg-muted flex items-center justify-center text-[10px] font-semibold">
                          <Show
                            when={member.user?.avatar_url}
                            fallback={
                              <span>
                                {(member.user?.full_name || member.user?.username || 'U').charAt(0).toUpperCase()}
                              </span>
                            }
                          >
                            <img
                              src={member.user?.avatar_url}
                              alt={member.user?.username || `User ${member.user_id}`}
                              class="w-full h-full object-cover"
                            />
                          </Show>
                        </div>
                        <div class="min-w-0">
                          <div class="text-xs font-medium truncate">
                            {member.user?.full_name || member.user?.username || `User ${member.user_id}`}
                          </div>
                          <div class="text-[11px] text-muted-foreground truncate">@{member.user?.username || member.user_id}</div>
                        </div>
                      </div>
                      <span class="text-[10px] uppercase tracking-wide text-muted-foreground">{member.role}</span>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </Card>

          <Card class="p-3">
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-sm font-medium">Password Vault</h4>
              <Button size="sm" variant="outline" onClick={() => setShowVault(!showVault())}>
                <Show when={showVault()} fallback="Show">Hide</Show>
              </Button>
            </div>
            <Show when={showVault()}>
              <div class="space-y-2 max-h-96 overflow-y-auto">
                <For each={vaultItems()}>
                  {(item) => (
                    <div class="border rounded-md p-2">
                      <div class="text-sm font-medium">{item.label}</div>
                      <div class="text-xs text-muted-foreground">
                        Owner: {item.owner_user_id} {item.shared ? '• Shared' : ''}
                      </div>
                      <Show when={revealedSecrets()[item.id]}>
                        <div class="mt-2 text-xs rounded bg-muted p-2 break-all">
                          <div><strong>Secret:</strong> {revealedSecrets()[item.id].secret}</div>
                          <Show when={revealedSecrets()[item.id].notes}>
                            <div class="mt-1"><strong>Notes:</strong> {revealedSecrets()[item.id].notes}</div>
                          </Show>
                        </div>
                      </Show>
                      <div class="mt-2 flex gap-2">
                        <Button size="sm" onClick={() => revealVaultItem(item)}>Reveal</Button>
                      </div>
                      <div class="mt-2 flex gap-2">
                        <Input
                          value={shareTargets()[item.id] || ''}
                          onInput={(e) =>
                            setShareTargets((prev) => ({
                              ...prev,
                              [item.id]: (e.currentTarget as HTMLInputElement).value,
                            }))
                          }
                          placeholder="Conversation ID"
                        />
                        <Button size="sm" variant="outline" onClick={() => shareVaultItem(item)}>
                          Share
                        </Button>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </Card>

          <Card class="p-3">
            <h4 class="text-sm font-medium mb-2">Quick Create Conversation</h4>
            <Button class="w-full" size="sm" onClick={() => setShowCreateConversation(true)}>
              <IconPlus class="size-4 mr-1" />
              Create
            </Button>
          </Card>
        </div>
      </div>

      {/* Create conversation modal */}
      <Show when={showCreateConversation()}>
        <div class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div class="bg-card border rounded-lg w-full max-w-lg p-4 space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold">Create Conversation</h3>
              <Button size="sm" variant="ghost" onClick={() => setShowCreateConversation(false)}>
                <IconX class="size-4" />
              </Button>
            </div>

            <div class="grid grid-cols-3 gap-2">
              <Button variant={newConversationType() === 'dm' ? 'default' : 'outline'} onClick={() => setNewConversationType('dm')}>
                DM
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
                value={targetUserId()}
                onChange={(e) => setTargetUserId(e.currentTarget.value)}
              >
                <option value="">Select user</option>
                <For each={members()}>
                  {(member) => (
                    <option value={member.id}>
                      {member.name} ({member.username || member.id})
                    </option>
                  )}
                </For>
              </select>
            </Show>

            <Show when={newConversationType() === 'group'}>
              <Input
                value={groupUserIds()}
                onInput={(e) => setGroupUserIds((e.currentTarget as HTMLInputElement).value)}
                placeholder="Member user IDs, comma-separated (e.g. 2,3,7)"
              />
            </Show>

            <Show when={newConversationType() === 'team'}>
              <Input
                value={teamId()}
                onInput={(e) => setTeamId((e.currentTarget as HTMLInputElement).value)}
                placeholder="Team ID"
              />
            </Show>

            <div class="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateConversation(false)}>Cancel</Button>
              <Button onClick={createConversation}>Create</Button>
            </div>
          </div>
        </div>
      </Show>

      {/* Search modal */}
      <Show when={searchOpen()}>
        <div class="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4">
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
                  placeholder="Search text, file type, URLs, mentions..."
                  onKeyDown={(e: KeyboardEvent) => {
                    if (e.key === 'Enter') performSearch();
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
                          {member.name} ({member.username || member.id})
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
                  Mention-only
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
                        onClick={() =>
                          setSearchAttachmentKinds((prev) => toggleStringFilter(prev, kind))
                        }
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
                        onClick={() =>
                          setSearchReferenceTypes((prev) => toggleStringFilter(prev, refType))
                        }
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
                    <button
                      class="w-full text-left border rounded-md p-3 hover:bg-muted"
                      onClick={() => openSearchResult(result)}
                    >
                      <div class="text-sm font-medium">Conversation #{result.conversation_id}</div>
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
