/**
 * chat.tsx — Stage 9
 *
 * Open AI coaching conversation.
 *   - Client-side keyword classification routes to the right knowledge docs
 *   - Sends { message, classification, history } to ai-chat Edge Function
 *   - Streams SSE response token-by-token
 *   - Stores last 20 turns locally (resets on app reload — no persistence needed)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

type MessageClassification =
  | 'program'
  | 'technique'
  | 'science'
  | 'nutrition'
  | 'injury'
  | 'general';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

// ── Classification ─────────────────────────────────────────────────────────────

function classifyMessage(text: string): MessageClassification {
  const lower = text.toLowerCase();
  if (/\b(pain|hurt|sore|injury|sharp|pop|swelling|ache)\b/.test(lower)) return 'injury';
  if (/\b(eat|protein|calories|diet|supplement|creatine|food)\b/.test(lower)) return 'nutrition';
  if (/\b(what is|why does|explain|dup|rpe|hrv|zone 2|zone2|periodis)\b/.test(lower)) return 'science';
  if (/\b(how|form|cue|fault|technique|demo)\b/.test(lower)) return 'technique';
  if (/\b(why|volume|load|program|engine|deload|sets|reps|mesocycle)\b/.test(lower)) return 'program';
  return 'general';
}

// ── Streaming fetch ────────────────────────────────────────────────────────────

const FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-chat`;
const MAX_HISTORY_TURNS = 20;

async function streamChatMessage(params: {
  message: string;
  classification: MessageClassification;
  history: { role: 'user' | 'assistant'; content: string }[];
  jwtToken: string;
  onToken: (token: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
}) {
  const { message, classification, history, jwtToken, onToken, onDone, onError } = params;

  try {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({ message, classification, history }),
    });

    if (!response.ok) {
      const err = await response.text();
      onError(`Server error: ${response.status} — ${err}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) { onError('No response stream'); return; }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE lines
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? ''; // keep incomplete last line

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') { onDone(); return; }
        try {
          const parsed = JSON.parse(payload) as { text?: string; error?: string };
          if (parsed.error) { onError(parsed.error); return; }
          if (parsed.text) onToken(parsed.text);
        } catch {
          // Malformed event — skip
        }
      }
    }
    onDone();
  } catch (e) {
    onError(e instanceof Error ? e.message : 'Network error');
  }
}

// ── Message bubble ─────────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 12,
      paddingHorizontal: 4,
    }}>
      <View style={{
        maxWidth: '82%',
        backgroundColor: isUser ? '#1d4ed8' : '#18181b',
        borderRadius: 16,
        borderBottomRightRadius: isUser ? 4 : 16,
        borderBottomLeftRadius: isUser ? 16 : 4,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: isUser ? 0 : 1,
        borderColor: '#27272a',
      }}>
        <Text style={{ color: isUser ? '#fff' : '#d4d4d8', fontSize: 15, lineHeight: 22 }}>
          {message.content}
          {message.isStreaming && (
            <Text style={{ color: '#71717a' }}>▌</Text>
          )}
        </Text>
      </View>
    </View>
  );
}

// ── Suggested prompts ─────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'Why am I on a deload this week?',
  'How do I improve my deadlift form?',
  'What is Zone 2 training?',
  'What should I eat around training?',
];

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  // Scroll to bottom when messages change
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 50);
    return () => clearTimeout(timer);
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    setInputText('');

    // Get auth token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const classification = classifyMessage(trimmed);

    // Build history from current messages (exclude any still-streaming)
    const history = messages
      .filter(m => !m.isStreaming)
      .slice(-MAX_HISTORY_TURNS)
      .map(m => ({ role: m.role, content: m.content }));

    // Add user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    // Add placeholder for assistant response
    const assistantId = `assistant-${Date.now()}`;
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    await streamChatMessage({
      message: trimmed,
      classification,
      history,
      jwtToken: session.access_token,
      onToken: (token) => {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, content: m.content + token }
              : m
          )
        );
      },
      onDone: () => {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId ? { ...m, isStreaming: false } : m
          )
        );
        setIsStreaming(false);
      },
      onError: (err) => {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, content: `Error: ${err}`, isStreaming: false }
              : m
          )
        );
        setIsStreaming(false);
      },
    });
  }, [messages, isStreaming]);

  const isEmpty = messages.length === 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#09090b' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={{
        paddingTop: insets.top + 12,
        paddingBottom: 12,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#18181b',
      }}>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>Coach</Text>
        <Text style={{ color: '#52525b', fontSize: 12, marginTop: 2 }}>
          Powered by Claude · Ask about your program, technique, or nutrition
        </Text>
      </View>

      {/* Message list */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: 16,
          paddingHorizontal: 16,
          paddingBottom: 8,
          flexGrow: 1,
        }}
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        {isEmpty ? (
          <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 16 }}>
            <Text style={{ color: '#52525b', fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
              Ask anything about your training
            </Text>
            <View style={{ gap: 8 }}>
              {SUGGESTIONS.map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => sendMessage(s)}
                  style={{
                    backgroundColor: '#18181b',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#27272a',
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}
                >
                  <Text style={{ color: '#a1a1aa', fontSize: 14 }}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
      </ScrollView>

      {/* Input bar */}
      <View style={{
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: insets.bottom + 12,
        borderTopWidth: 1,
        borderTopColor: '#18181b',
        backgroundColor: '#09090b',
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 10,
      }}>
        <TextInput
          ref={inputRef}
          style={{
            flex: 1,
            backgroundColor: '#18181b',
            borderRadius: 20,
            borderWidth: 1,
            borderColor: '#27272a',
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: 10,
            color: '#fff',
            fontSize: 15,
            maxHeight: 120,
          }}
          placeholder="Ask your coach…"
          placeholderTextColor="#52525b"
          value={inputText}
          onChangeText={setInputText}
          multiline
          returnKeyType="send"
          onSubmitEditing={() => sendMessage(inputText)}
          editable={!isStreaming}
        />
        <TouchableOpacity
          onPress={() => sendMessage(inputText)}
          disabled={!inputText.trim() || isStreaming}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: inputText.trim() && !isStreaming ? '#1d4ed8' : '#27272a',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isStreaming ? (
            <ActivityIndicator size="small" color="#71717a" />
          ) : (
            <Text style={{ color: '#fff', fontSize: 18, lineHeight: 22 }}>↑</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

export { ScreenErrorBoundary as ErrorBoundary } from '../../components/shared/ScreenErrorBoundary';
