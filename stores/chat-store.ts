import { create } from 'zustand';
import { getAccessToken, pmsPatientMessageApi } from '@/lib/api';
import { API_BASE_URL } from '@/lib/auth0';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket';
import type { Socket } from 'socket.io-client';

// ── Types ──────────────────────────────────────────────

export interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  senderType: 'doctor' | 'patient';
  content: string;
  read: boolean;
  readAt?: string | null;
  createdAt: string;
  /** Client-only temp ID for optimistic sends */
  tempId?: string;
  pending?: boolean;
  failed?: boolean;
}

export interface Conversation {
  id: number;
  doctor?: { id: number; name: string; email: string; practiceName?: string };
  patient?: { id: number; name: string; email: string; currentTray?: number; totalTrays?: number };
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  createdAt: string;
  source?: 'standalone' | 'pms';
  _pmsId?: number;
  staffName?: string;
}

interface TypingState {
  userId: number;
  userType: string;
  isTyping: boolean;
}

/** Auto-clear typing indicator after this many ms if no stop event received */
const TYPING_TIMEOUT_MS = 15000;
const typingTimers: Record<string, ReturnType<typeof setTimeout>> = {};

interface ChatState {
  // Connection
  connected: boolean;
  connecting: boolean;

  // Data
  conversations: Conversation[];
  messages: Record<number, Message[]>; // conversationId → messages
  typingUsers: Record<number, TypingState[]>; // conversationId → typing users
  totalUnread: number;
  hasMoreMessages: Record<number, boolean>;

  // Loading states
  loadingConversations: boolean;
  loadingMessages: Record<number, boolean>;
  sendingMessage: boolean;

  // Active conversation
  activeConversationId: number | null;

  // Actions
  connect: () => void;
  disconnect: () => void;
  loadConversations: (userType: 'doctor' | 'patient') => Promise<void>;
  loadMessages: (conversationId: number, userType: 'doctor' | 'patient', loadMore?: boolean) => Promise<void>;
  sendMessage: (conversationId: number, content: string) => void;
  markRead: (conversationId: number, userType: 'doctor' | 'patient') => Promise<void>;
  startTyping: (conversationId: number) => void;
  stopTyping: (conversationId: number) => void;
  setActiveConversation: (conversationId: number | null) => void;
  createConversation: (patientId: number) => Promise<Conversation | null>;
  loadUnreadCount: (userType: 'doctor' | 'patient') => Promise<void>;
  reset: () => void;
}

// ── API helpers ────────────────────────────────────────

function getBaseUrl(userType: 'doctor' | 'patient'): string {
  return userType === 'doctor'
    ? `${API_BASE_URL}/api/v1/doctor/standalone/messages`
    : `${API_BASE_URL}/api/v1/patient/standalone/messages`;
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T | null> {
  const token = getAccessToken();
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      if (__DEV__) console.error(`[Chat API] ${res.status}:`, await res.text());
      return null;
    }
    const json = await res.json();
    return json.data as T;
  } catch (err) {
    if (__DEV__) console.error('[Chat API] Fetch error:', err);
    return null;
  }
}

function computeTotalUnread(conversations: Conversation[]): number {
  return conversations.reduce((sum, c) => sum + c.unreadCount, 0);
}

// ── Store ──────────────────────────────────────────────

const initialState = {
  connected: false,
  connecting: false,
  conversations: [] as Conversation[],
  messages: {} as Record<number, Message[]>,
  typingUsers: {} as Record<number, TypingState[]>,
  totalUnread: 0,
  hasMoreMessages: {} as Record<number, boolean>,
  loadingConversations: false,
  loadingMessages: {} as Record<number, boolean>,
  sendingMessage: false,
  activeConversationId: null as number | null,
};

export const useChatStore = create<ChatState>((set, get) => ({
  ...initialState,

  // ── Connection ─────────────────────────────────────

  connect() {
    if (get().connected || get().connecting) return;
    set({ connecting: true });

    try {
      const socket = connectSocket();
      setupSocketListeners(socket, set, get);
      set({ connected: true, connecting: false });
    } catch (err) {
      if (__DEV__) console.error('[Chat] Connect failed:', err);
      set({ connecting: false });
    }
  },

  disconnect() {
    disconnectSocket();
    set({ connected: false, connecting: false });
  },

  // ── Load conversations ────────────────────────────

  async loadConversations(userType) {
    set({ loadingConversations: true });
    const data = await apiFetch<Conversation[]>(`${getBaseUrl(userType)}/conversations`);
    let allConversations: Conversation[] = [];

    if (data) {
      allConversations = data.map(c => ({ ...c, source: 'standalone' as const }));
    }

    // For patients, also load PMS conversations
    if (userType === 'patient') {
      try {
        const pmsResponse = await pmsPatientMessageApi.getConversations();
        if (pmsResponse.data && Array.isArray(pmsResponse.data)) {
          const pmsConvs: Conversation[] = pmsResponse.data.map((c: any) => ({
            ...c,
            source: 'pms' as const,
            _pmsId: c.id,
          }));
          allConversations = [...allConversations, ...pmsConvs];
        }
      } catch {
        // PMS messaging not available — that's fine
      }
    }

    // Sort by lastMessageAt
    allConversations.sort((a, b) => {
      if (!a.lastMessageAt) return 1;
      if (!b.lastMessageAt) return -1;
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });

    set({ conversations: allConversations, loadingConversations: false });
  },

  // ── Load messages ─────────────────────────────────

  async loadMessages(conversationId, userType, loadMore = false) {
    const state = get();
    if (state.loadingMessages[conversationId]) return;

    set({ loadingMessages: { ...state.loadingMessages, [conversationId]: true } });

    const existing = state.messages[conversationId] || [];
    let url = `${getBaseUrl(userType)}/conversations/${conversationId}?limit=50`;

    if (loadMore && existing.length > 0) {
      // Get the oldest message's ID for cursor
      const oldest = existing[existing.length - 1];
      url += `&before=${oldest.id}`;
    }

    const data = await apiFetch<{ messages: Message[]; hasMore: boolean; cursor: number | null }>(url);

    if (data) {
      const currentMsgs = get().messages[conversationId] || [];
      let newMessages: Message[];

      if (loadMore) {
        // Append older messages, deduplicating by id
        const existingIds = new Set(currentMsgs.map(m => m.id));
        const unique = data.messages.filter(m => !existingIds.has(m.id));
        newMessages = [...currentMsgs, ...unique];
      } else {
        // Fresh load — preserve any pending/optimistic messages
        const pending = currentMsgs.filter(m => m.pending || m.failed);
        const serverIds = new Set(data.messages.map(m => m.id));
        const keepPending = pending.filter(m => !serverIds.has(m.id));
        newMessages = [...keepPending, ...data.messages];
      }

      set({
        messages: { ...get().messages, [conversationId]: newMessages },
        hasMoreMessages: { ...get().hasMoreMessages, [conversationId]: data.hasMore },
        loadingMessages: { ...get().loadingMessages, [conversationId]: false },
      });
    } else {
      set({ loadingMessages: { ...get().loadingMessages, [conversationId]: false } });
    }
  },

  // ── Send message ──────────────────────────────────

  sendMessage(conversationId, content) {
    const socket = getSocket();
    if (!socket?.connected) {
      if (__DEV__) console.error('[Chat] Socket not connected, cannot send');
      return;
    }

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // Optimistic add
    const optimistic: Message = {
      id: -Date.now(),
      conversationId,
      senderId: 0,
      senderType: 'patient', // Will be overridden by server
      content,
      read: false,
      createdAt: new Date().toISOString(),
      tempId,
      pending: true,
    };

    const msgs = get().messages[conversationId] || [];
    set({
      messages: { ...get().messages, [conversationId]: [optimistic, ...msgs] },
      sendingMessage: true,
    });

    socket.emit('send_message', { conversationId, content, tempId }, (response: any) => {
      const currentMsgs = get().messages[conversationId] || [];

      if (response?.success && response.message) {
        // Replace optimistic message with real one
        const updated = currentMsgs.map((m) =>
          m.tempId === tempId ? { ...response.message, tempId: undefined, pending: false } : m
        );
        set({
          messages: { ...get().messages, [conversationId]: updated },
          sendingMessage: false,
        });

        // Update conversation preview
        const convs = get().conversations.map((c) =>
          c.id === conversationId
            ? { ...c, lastMessageAt: response.message.createdAt, lastMessagePreview: content.slice(0, 200) }
            : c
        );
        set({ conversations: convs });
      } else {
        // Mark as failed
        const updated = currentMsgs.map((m) =>
          m.tempId === tempId ? { ...m, pending: false, failed: true } : m
        );
        set({
          messages: { ...get().messages, [conversationId]: updated },
          sendingMessage: false,
        });
      }
    });
  },

  // ── Mark read ─────────────────────────────────────

  async markRead(conversationId, userType) {
    const previousConvs = get().conversations;

    // Optimistic update
    const convs = previousConvs.map((c) =>
      c.id === conversationId ? { ...c, unreadCount: 0 } : c
    );
    set({ conversations: convs, totalUnread: computeTotalUnread(convs) });

    // Emit via socket for real-time read receipt
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit('mark_read', { conversationId });
    }

    // REST API fallback
    const result = await apiFetch(`${getBaseUrl(userType)}/conversations/${conversationId}/read`, {
      method: 'PATCH',
    });

    // Rollback on failure
    if (!result) {
      set({ conversations: previousConvs, totalUnread: computeTotalUnread(previousConvs) });
    }
  },

  // ── Typing indicators ────────────────────────────

  startTyping(conversationId) {
    getSocket()?.emit('typing_start', { conversationId });
    // Auto-stop after timeout in case stopTyping is never called
    const key = `self_${conversationId}`;
    if (typingTimers[key]) clearTimeout(typingTimers[key]);
    typingTimers[key] = setTimeout(() => {
      getSocket()?.emit('typing_stop', { conversationId });
      delete typingTimers[key];
    }, TYPING_TIMEOUT_MS);
  },

  stopTyping(conversationId) {
    getSocket()?.emit('typing_stop', { conversationId });
    const key = `self_${conversationId}`;
    if (typingTimers[key]) {
      clearTimeout(typingTimers[key]);
      delete typingTimers[key];
    }
  },

  // ── Active conversation ──────────────────────────

  setActiveConversation(conversationId) {
    set({ activeConversationId: conversationId });

    if (conversationId) {
      // Join conversation room if needed
      getSocket()?.emit('join_conversation', { conversationId });
    }
  },

  // ── Create conversation (doctor only) ────────────

  async createConversation(patientId) {
    const data = await apiFetch<Conversation>(
      `${getBaseUrl('doctor')}/conversations`,
      { method: 'POST', body: JSON.stringify({ patientId }) }
    );
    if (data) {
      // Add to conversations if not already there
      const convs = get().conversations;
      if (!convs.find((c) => c.id === data.id)) {
        set({ conversations: [data, ...convs] });
      }
      return data;
    }
    return null;
  },

  // ── Load unread count ────────────────────────────

  async loadUnreadCount(userType) {
    const data = await apiFetch<{ unreadCount: number }>(`${getBaseUrl(userType)}/unread-count`);
    if (data) {
      set({ totalUnread: data.unreadCount });
    }
  },

  // ── Reset ────────────────────────────────────────

  reset() {
    get().disconnect();
    set(initialState);
  },
}));

// ── Socket event listeners ──────────────────────────

function setupSocketListeners(
  socket: Socket,
  set: (state: Partial<ChatState> | ((state: ChatState) => Partial<ChatState>)) => void,
  get: () => ChatState
) {
  // Remove previous chat-specific listeners to prevent duplicates
  socket.off('new_message');
  socket.off('new_message_notification');
  socket.off('typing');
  socket.off('read_receipt');
  socket.off('unread_count');

  socket.on('connect', () => {
    set({ connected: true, connecting: false });
  });

  socket.on('disconnect', () => {
    set({ connected: false });
  });

  // New message received
  socket.on('new_message', (message: Message) => {
    const convId = message.conversationId;
    const existing = get().messages[convId] || [];

    // Avoid duplicates
    if (existing.find((m) => m.id === message.id)) return;

    set({
      messages: { ...get().messages, [convId]: [message, ...existing] },
    });

    // Update conversation preview
    const convs = get().conversations.map((c) =>
      c.id === convId
        ? {
            ...c,
            lastMessageAt: message.createdAt,
            lastMessagePreview: message.content.slice(0, 200),
            unreadCount: get().activeConversationId === convId ? c.unreadCount : c.unreadCount + 1,
          }
        : c
    );
    set({ conversations: convs, totalUnread: computeTotalUnread(convs) });

    // Auto-mark read if viewing this conversation
    if (get().activeConversationId === convId) {
      socket.emit('mark_read', { conversationId: convId });
    }
  });

  // New message notification (for conversations not currently viewed)
  socket.on('new_message_notification', (data: { conversationId: number; message: Message }) => {
    const total = computeTotalUnread(get().conversations);
    set({ totalUnread: total });
  });

  // Typing indicator
  socket.on('typing', (data: { conversationId: number; userId: number; userType: string; isTyping: boolean }) => {
    const convTyping = get().typingUsers[data.conversationId] || [];
    const timerKey = `${data.conversationId}_${data.userId}`;

    if (data.isTyping) {
      // Add typing user (avoid duplicates)
      if (!convTyping.find((t) => t.userId === data.userId)) {
        set({
          typingUsers: {
            ...get().typingUsers,
            [data.conversationId]: [...convTyping, data],
          },
        });
      }
      // Auto-clear typing after timeout
      if (typingTimers[timerKey]) clearTimeout(typingTimers[timerKey]);
      typingTimers[timerKey] = setTimeout(() => {
        const current = get().typingUsers[data.conversationId] || [];
        set({
          typingUsers: {
            ...get().typingUsers,
            [data.conversationId]: current.filter((t) => t.userId !== data.userId),
          },
        });
        delete typingTimers[timerKey];
      }, TYPING_TIMEOUT_MS);
    } else {
      // Remove typing user
      if (typingTimers[timerKey]) {
        clearTimeout(typingTimers[timerKey]);
        delete typingTimers[timerKey];
      }
      set({
        typingUsers: {
          ...get().typingUsers,
          [data.conversationId]: convTyping.filter((t) => t.userId !== data.userId),
        },
      });
    }
  });

  // Read receipt
  socket.on('read_receipt', (data: { conversationId: number; readBy: string; readAt: string }) => {
    const msgs = get().messages[data.conversationId] || [];
    const updated = msgs.map((m) =>
      !m.read && m.senderType !== data.readBy
        ? { ...m, read: true, readAt: data.readAt }
        : m
    );
    set({ messages: { ...get().messages, [data.conversationId]: updated } });
  });

  // Initial unread count from server
  socket.on('unread_count', (data: { total: number }) => {
    set({ totalUnread: data.total });
  });
}
