// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";

const C = {
  bg: "#080810",
  card: "#0f0f18",
  surface: "#18182a",
  border: "#1e1e2e",
  text: "#f0f0ff",
  sub: "#6b7280",
  primary: "#7c3aed",
  accent: "#a78bfa",
  sky: "#38bdf8",
  danger: "#ef4444",
  green: "#10b981",
};

// LocalStorage keys
const CONV_LIST_KEY = "ht_chat_conversations_v2"; // [{id,title,updatedAt}]
const CONV_ACTIVE_KEY = "ht_chat_active_v2";
const LEGACY_CONV_KEY = "ht_chat_conv_v1";
const AUTO_TTS_KEY = "ht_chat_auto_tts_v1";
const TTS_API_KEY = "ht_chat_tts_apikey_v1";
const TTS_VOICE_KEY = "ht_chat_tts_voice_v1";
const TTS_MODEL_KEY = "ht_chat_tts_model_v1";
const instructionKey = (id: string) => `ht_chat_instr_v1__${id}`;

type Conv = { id: string; title: string; updatedAt: number };
type Msg = { id?: string; role: "user" | "assistant"; content: string };

function newConvId(): string {
  return (crypto.randomUUID && crypto.randomUUID()) || `c_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function loadConversations(): Conv[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CONV_LIST_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    }
  } catch {}
  // Migrate from legacy single-conversation key, if any.
  try {
    const legacy = localStorage.getItem(LEGACY_CONV_KEY);
    if (legacy) {
      const conv: Conv = { id: legacy, title: "Cuộc trò chuyện đầu tiên", updatedAt: Date.now() };
      localStorage.setItem(CONV_LIST_KEY, JSON.stringify([conv]));
      localStorage.setItem(CONV_ACTIVE_KEY, legacy);
      return [conv];
    }
  } catch {}
  return [];
}

function saveConversations(list: Conv[]) {
  try {
    localStorage.setItem(CONV_LIST_KEY, JSON.stringify(list));
  } catch {}
}

function loadActiveConvId(list: Conv[]): string {
  if (typeof window === "undefined") return "";
  try {
    const cur = localStorage.getItem(CONV_ACTIVE_KEY);
    if (cur && list.find((c) => c.id === cur)) return cur;
  } catch {}
  return list[0]?.id || "";
}

export default function ChatTab({ t, lang }: { t: any; lang: string }) {
  const [conversations, setConversations] = useState<Conv[]>(() => loadConversations());
  const [activeId, setActiveId] = useState<string>(() => loadActiveConvId(loadConversations()));
  const [showHistory, setShowHistory] = useState(false);
  const [showInstruction, setShowInstruction] = useState(false);
  const [customInstruction, setCustomInstruction] = useState<string>("");

  // Ensure there is always at least one conversation.
  useEffect(() => {
    if (conversations.length === 0) {
      const c: Conv = {
        id: newConvId(),
        title: lang === "vi" ? "Trò chuyện mới" : "New chat",
        updatedAt: Date.now(),
      };
      const list = [c];
      setConversations(list);
      saveConversations(list);
      setActiveId(c.id);
      try {
        localStorage.setItem(CONV_ACTIVE_KEY, c.id);
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist active conv id.
  useEffect(() => {
    if (!activeId) return;
    try {
      localStorage.setItem(CONV_ACTIVE_KEY, activeId);
    } catch {}
  }, [activeId]);

  // Load custom instruction for active conversation.
  useEffect(() => {
    if (!activeId) return;
    try {
      setCustomInstruction(localStorage.getItem(instructionKey(activeId)) || "");
    } catch {
      setCustomInstruction("");
    }
  }, [activeId]);

  const persistInstruction = (val: string) => {
    setCustomInstruction(val);
    if (!activeId) return;
    try {
      if (val.trim()) localStorage.setItem(instructionKey(activeId), val);
      else localStorage.removeItem(instructionKey(activeId));
    } catch {}
  };

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoTTS, setAutoTTS] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(AUTO_TTS_KEY) === "1";
  });
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastSpokenIdxRef = useRef<number>(-1);

  // TTS settings (user-provided)
  const [showTTSSettings, setShowTTSSettings] = useState(false);
  const [ttsApiKey, setTtsApiKey] = useState<string>(() =>
    typeof window === "undefined" ? "" : localStorage.getItem(TTS_API_KEY) || "",
  );
  const [ttsVoiceId, setTtsVoiceId] = useState<string>(() =>
    typeof window === "undefined" ? "" : localStorage.getItem(TTS_VOICE_KEY) || "",
  );
  const [ttsModelId, setTtsModelId] = useState<string>(() =>
    typeof window === "undefined"
      ? "eleven_multilingual_v2"
      : localStorage.getItem(TTS_MODEL_KEY) || "eleven_multilingual_v2",
  );
  const hasTTSKey = ttsApiKey.trim().length > 0;

  // Load history for the active conversation.
  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id,role,content,created_at")
        .eq("conversation_id", activeId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (cancelled) return;
      if (!error && data) {
        setMessages(
          data
            .filter((m) => m.role !== "system")
            .map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content })),
        );
      } else {
        setMessages([]);
      }
      lastSpokenIdxRef.current = -1;
    })();
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const persistAutoTTS = (v: boolean) => {
    setAutoTTS(v);
    try {
      localStorage.setItem(AUTO_TTS_KEY, v ? "1" : "0");
    } catch {}
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setPlayingIdx(null);
  };

  const speak = async (text: string, idx: number) => {
    if (!hasTTSKey) {
      setShowTTSSettings(true);
      return;
    }
    stopAudio();
    setPlayingIdx(idx);
    try {
      const r = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          apiKey: ttsApiKey.trim(),
          voiceId: ttsVoiceId.trim() || undefined,
          modelId: ttsModelId || undefined,
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({ error: "TTS error" }));
        alert(err.error || "TTS failed");
        setPlayingIdx(null);
        return;
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = new Audio(url);
      audioRef.current = a;
      a.onended = () => {
        setPlayingIdx(null);
        URL.revokeObjectURL(url);
      };
      a.onerror = () => {
        setPlayingIdx(null);
        URL.revokeObjectURL(url);
      };
      await a.play();
    } catch {
      setPlayingIdx(null);
    }
  };

  // Auto-play when a new assistant message lands
  useEffect(() => {
    if (!autoTTS || loading || !hasTTSKey) return;
    const lastIdx = messages.length - 1;
    if (lastIdx < 0) return;
    const last = messages[lastIdx];
    if (last.role !== "assistant") return;
    if (lastIdx <= lastSpokenIdxRef.current) return;
    if (!last.content || last.content.length < 1) return;
    lastSpokenIdxRef.current = lastIdx;
    speak(last.content, lastIdx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, loading, autoTTS]);

  const updateConvMeta = (id: string, patch: Partial<Conv>) => {
    setConversations((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, ...patch } : c));
      saveConversations(next);
      return next;
    });
  };

  const newConversation = () => {
    const c: Conv = {
      id: newConvId(),
      title: lang === "vi" ? "Trò chuyện mới" : "New chat",
      updatedAt: Date.now(),
    };
    const list = [c, ...conversations];
    setConversations(list);
    saveConversations(list);
    setActiveId(c.id);
    setMessages([]);
    setShowHistory(false);
    stopAudio();
  };

  const deleteConversation = async (id: string) => {
    if (
      !confirm(
        lang === "vi"
          ? "Xoá vĩnh viễn cuộc trò chuyện này?"
          : "Permanently delete this conversation?",
      )
    )
      return;
    try {
      await supabase.from("chat_messages").delete().eq("conversation_id", id);
    } catch {}
    try {
      localStorage.removeItem(instructionKey(id));
    } catch {}
    const next = conversations.filter((c) => c.id !== id);
    setConversations(next);
    saveConversations(next);
    if (id === activeId) {
      if (next.length) {
        setActiveId(next[0].id);
      } else {
        // create a fresh empty conversation
        const c: Conv = {
          id: newConvId(),
          title: lang === "vi" ? "Trò chuyện mới" : "New chat",
          updatedAt: Date.now(),
        };
        setConversations([c]);
        saveConversations([c]);
        setActiveId(c.id);
        setMessages([]);
      }
    }
  };

  const renameConversation = (id: string) => {
    const cur = conversations.find((c) => c.id === id);
    const name = prompt(lang === "vi" ? "Tên cuộc trò chuyện:" : "Conversation name:", cur?.title || "");
    if (name == null) return;
    const trimmed = name.trim().slice(0, 80);
    if (!trimmed) return;
    updateConvMeta(id, { title: trimmed });
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading || !activeId) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    // If this is the first user message, derive a title from it.
    const cur = conversations.find((c) => c.id === activeId);
    if (cur && (cur.title === (lang === "vi" ? "Trò chuyện mới" : "New chat") || messages.length === 0)) {
      const title = text.slice(0, 60);
      updateConvMeta(activeId, { title, updatedAt: Date.now() });
    } else {
      updateConvMeta(activeId, { updatedAt: Date.now() });
    }

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeId,
          userMessage: text,
          messages: next.slice(-30),
          customInstruction: customInstruction.trim() || undefined,
        }),
      });

      if (!r.ok || !r.body) {
        const err = await r.json().catch(() => ({ error: "Unknown error" }));
        setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${err.error || "Lỗi kết nối AI"}` }]);
        setLoading(false);
        return;
      }

      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let assistant = "";
      let started = false;
      let done = false;

      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(payload);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              assistant += delta;
              if (!started) {
                started = true;
                setMessages((prev) => [...prev, { role: "assistant", content: assistant }]);
              } else {
                setMessages((prev) => {
                  const copy = [...prev];
                  copy[copy.length - 1] = { role: "assistant", content: assistant };
                  return copy;
                });
              }
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
      setLoading(false);
      updateConvMeta(activeId, { updatedAt: Date.now() });
    } catch (e) {
      console.error(e);
      setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Network error" }]);
      setLoading(false);
    }
  };

  const clearChat = async () => {
    if (!activeId) return;
    if (!confirm(lang === "vi" ? "Xoá toàn bộ tin nhắn trong cuộc này?" : "Clear all messages in this chat?")) return;
    await supabase.from("chat_messages").delete().eq("conversation_id", activeId);
    setMessages([]);
    stopAudio();
  };

  const activeConv = conversations.find((c) => c.id === activeId);
  const sortedHistory = useMemo(
    () => [...conversations].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)),
    [conversations],
  );

  return (
    <div
      style={{
        padding: "12px 12px 100px",
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 120px)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
          gap: 8,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>
            💬 {lang === "vi" ? "Trợ lý AI" : "AI Assistant"}
          </div>
          <div
            style={{
              fontSize: 11,
              color: C.sub,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={activeConv?.title || ""}
          >
            {activeConv ? activeConv.title : lang === "vi" ? "Chưa có cuộc trò chuyện" : "No conversation"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button
            onClick={() => setShowHistory((v) => !v)}
            title={lang === "vi" ? "Lịch sử trò chuyện" : "Chat history"}
            style={btnStyle(showHistory ? C.accent : C.sub, showHistory ? C.accent : C.border)}
          >
            📚
          </button>
          <button
            onClick={newConversation}
            title={lang === "vi" ? "Trò chuyện mới" : "New chat"}
            style={btnStyle(C.green, C.green)}
          >
            ＋
          </button>
          <button
            onClick={() => setShowInstruction((v) => !v)}
            title={lang === "vi" ? "Định hướng cho AI" : "AI custom instructions"}
            style={btnStyle(
              customInstruction.trim() ? C.accent : C.sub,
              customInstruction.trim() ? C.accent : C.border,
            )}
          >
            🎯
          </button>
          <button
            onClick={() => setShowTTSSettings((v) => !v)}
            title={lang === "vi" ? "Cài đặt giọng" : "Voice settings"}
            style={btnStyle(hasTTSKey ? C.accent : C.sub, hasTTSKey ? C.accent : C.border)}
          >
            ⚙️
          </button>
          <button
            onClick={() => persistAutoTTS(!autoTTS)}
            disabled={!hasTTSKey}
            title={lang === "vi" ? "Tự động phát giọng" : "Auto-play voice"}
            style={{
              ...btnStyle(
                autoTTS && hasTTSKey ? C.green : C.sub,
                autoTTS && hasTTSKey ? C.green : C.border,
              ),
              cursor: hasTTSKey ? "pointer" : "not-allowed",
              opacity: hasTTSKey ? 1 : 0.5,
            }}
          >
            🔊 {autoTTS && hasTTSKey ? "ON" : "OFF"}
          </button>
          <button onClick={clearChat} style={btnStyle(C.sub, C.border)} title={lang === "vi" ? "Xoá tin nhắn" : "Clear messages"}>
            🗑
          </button>
        </div>
      </div>

      {showHistory && (
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 10,
            marginBottom: 10,
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, color: C.accent, marginBottom: 8 }}>
            📚 {lang === "vi" ? "Lịch sử trò chuyện" : "Chat history"} ({sortedHistory.length})
          </div>
          {sortedHistory.map((c) => {
            const active = c.id === activeId;
            return (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 10px",
                  marginBottom: 4,
                  borderRadius: 10,
                  background: active ? `${C.primary}28` : C.surface,
                  border: `1px solid ${active ? C.primary : C.border}`,
                }}
              >
                <button
                  onClick={() => {
                    setActiveId(c.id);
                    setShowHistory(false);
                  }}
                  style={{
                    flex: 1,
                    background: "none",
                    border: "none",
                    color: active ? C.text : C.sub,
                    fontWeight: active ? 700 : 500,
                    textAlign: "left",
                    fontSize: 12,
                    cursor: "pointer",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={c.title}
                >
                  {c.title || (lang === "vi" ? "(không tiêu đề)" : "(untitled)")}
                </button>
                <button
                  onClick={() => renameConversation(c.id)}
                  style={iconMini(C.sub, C.border)}
                  title={lang === "vi" ? "Đổi tên" : "Rename"}
                >
                  ✎
                </button>
                <button
                  onClick={() => deleteConversation(c.id)}
                  style={iconMini(C.danger, `${C.danger}55`)}
                  title={lang === "vi" ? "Xoá" : "Delete"}
                >
                  ✕
                </button>
              </div>
            );
          })}
          {sortedHistory.length === 0 && (
            <div style={{ fontSize: 11, color: C.sub, textAlign: "center", padding: 8 }}>
              {lang === "vi" ? "Chưa có cuộc trò chuyện nào." : "No conversations yet."}
            </div>
          )}
        </div>
      )}

      {showInstruction && (
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 12,
            marginBottom: 10,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, color: C.accent }}>
            🎯 {lang === "vi" ? "Định hướng cho AI" : "Custom instructions for AI"}
          </div>
          <div style={{ fontSize: 10, color: C.sub, lineHeight: 1.5 }}>
            {lang === "vi"
              ? "Ghi cách bạn muốn AI trả lời (giọng điệu, ngôn ngữ, vai trò, kiến thức về bạn...). Áp dụng cho cuộc trò chuyện hiện tại."
              : "Tell the AI how you want it to behave (tone, language, persona, what to remember about you). Applies to this conversation."}
          </div>
          <textarea
            value={customInstruction}
            onChange={(e) => persistInstruction(e.target.value)}
            placeholder={
              lang === "vi"
                ? "Ví dụ: Hãy gọi tôi là 'Quân', dùng giọng thẳng thắn nam tính, trả lời ngắn gọn dưới 5 câu..."
                : "e.g. Call me 'Alex', be blunt and confident, keep replies under 5 sentences..."
            }
            rows={5}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "8px 10px",
              color: C.text,
              fontSize: 12,
              outline: "none",
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => setShowInstruction(false)}
              style={{
                flex: 1,
                background: `linear-gradient(135deg,${C.primary},${C.accent})`,
                border: "none",
                borderRadius: 8,
                padding: "8px",
                color: "#fff",
                fontWeight: 800,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              💾 {lang === "vi" ? "Đã lưu" : "Saved"}
            </button>
            <button
              onClick={() => persistInstruction("")}
              style={{
                background: C.surface,
                border: `1px solid ${C.danger}55`,
                borderRadius: 8,
                padding: "8px 12px",
                color: C.danger,
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {lang === "vi" ? "Xoá" : "Clear"}
            </button>
          </div>
        </div>
      )}

      {showTTSSettings && (
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 12,
            marginBottom: 10,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, color: C.accent }}>
            🔊 {lang === "vi" ? "Cài đặt giọng đọc (ElevenLabs)" : "Voice settings (ElevenLabs)"}
          </div>
          <div style={{ fontSize: 10, color: C.sub, lineHeight: 1.5 }}>
            {lang === "vi"
              ? "Lấy API key tại elevenlabs.io → Profile. Voice ID lấy ở Voice Library. Khoá lưu trong trình duyệt của bạn."
              : "Get an API key at elevenlabs.io → Profile. Voice ID from Voice Library. Stored in your browser only."}
          </div>

          <input
            type="password"
            placeholder={lang === "vi" ? "ElevenLabs API key" : "ElevenLabs API key"}
            value={ttsApiKey}
            onChange={(e) => setTtsApiKey(e.target.value)}
            style={inputStyle()}
          />
          <input
            type="text"
            placeholder={lang === "vi" ? "Voice ID (vd: JBFqnCBsd6RMkjVDRZzb — George)" : "Voice ID (e.g. JBFqnCBsd6RMkjVDRZzb — George)"}
            value={ttsVoiceId}
            onChange={(e) => setTtsVoiceId(e.target.value)}
            style={inputStyle()}
          />
          <select value={ttsModelId} onChange={(e) => setTtsModelId(e.target.value)} style={inputStyle()}>
            <option value="eleven_multilingual_v2">eleven_multilingual_v2 (VI + EN)</option>
            <option value="eleven_turbo_v2_5">eleven_turbo_v2_5 (fast)</option>
            <option value="eleven_turbo_v2">eleven_turbo_v2</option>
            <option value="eleven_monolingual_v1">eleven_monolingual_v1 (EN only)</option>
          </select>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => {
                try {
                  localStorage.setItem(TTS_API_KEY, ttsApiKey.trim());
                  localStorage.setItem(TTS_VOICE_KEY, ttsVoiceId.trim());
                  localStorage.setItem(TTS_MODEL_KEY, ttsModelId);
                } catch {}
                setShowTTSSettings(false);
              }}
              style={{
                flex: 1,
                background: `linear-gradient(135deg,${C.primary},${C.accent})`,
                border: "none",
                borderRadius: 8,
                padding: "8px",
                color: "#fff",
                fontWeight: 800,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              💾 {lang === "vi" ? "Lưu" : "Save"}
            </button>
            <button
              onClick={() => {
                setTtsApiKey("");
                setTtsVoiceId("");
                setTtsModelId("eleven_multilingual_v2");
                try {
                  localStorage.removeItem(TTS_API_KEY);
                  localStorage.removeItem(TTS_VOICE_KEY);
                  localStorage.removeItem(TTS_MODEL_KEY);
                } catch {}
                persistAutoTTS(false);
              }}
              style={{
                background: C.surface,
                border: `1px solid ${C.danger}55`,
                borderRadius: 8,
                padding: "8px 12px",
                color: C.danger,
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {lang === "vi" ? "Xoá" : "Clear"}
            </button>
          </div>
        </div>
      )}

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: 12,
          marginBottom: 10,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {messages.length === 0 && !loading && (
          <div style={{ textAlign: "center", color: C.sub, padding: 20, fontSize: 13, lineHeight: 1.6 }}>
            👋{" "}
            {lang === "vi"
              ? "Chào! Hỏi mình bất cứ điều gì — về thử thách, edging, sức khoẻ nam giới, hay tâm sự."
              : "Hi! Ask me anything — challenges, edging, men's health, or just to chat."}
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "88%",
              background: m.role === "user" ? `${C.primary}28` : C.card,
              border: `1px solid ${m.role === "user" ? `${C.primary}66` : C.border}`,
              borderRadius: 14,
              padding: "10px 12px",
              color: C.text,
              fontSize: 14,
              lineHeight: 1.55,
            }}
          >
            <div className="markdown-msg" style={{ wordBreak: "break-word" }}>
              {m.role === "assistant" ? <ReactMarkdown>{m.content}</ReactMarkdown> : m.content}
            </div>
            {m.role === "assistant" && m.content && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                <button
                  onClick={() => (playingIdx === i ? stopAudio() : speak(m.content, i))}
                  style={{
                    background: playingIdx === i ? `${C.danger}22` : `${C.sky}18`,
                    border: `1px solid ${playingIdx === i ? C.danger : C.sky}55`,
                    borderRadius: 8,
                    padding: "3px 8px",
                    color: playingIdx === i ? C.danger : C.sky,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {playingIdx === i ? "⏹ Stop" : "🔊 Đọc"}
                </button>
              </div>
            )}
          </div>
        ))}
        {loading && messages[messages.length - 1]?.role === "user" && (
          <div
            style={{
              alignSelf: "flex-start",
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              padding: "10px 14px",
              color: C.sub,
              fontSize: 13,
            }}
          >
            <span style={{ opacity: 0.8 }}>● ● ●</span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={lang === "vi" ? "Nhắn cho AI..." : "Message AI..."}
          style={{
            flex: 1,
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: "12px 14px",
            color: C.text,
            fontSize: 14,
            outline: "none",
          }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          style={{
            background: `linear-gradient(135deg,${C.primary},${C.accent})`,
            border: "none",
            borderRadius: 12,
            padding: "0 18px",
            color: "#fff",
            fontWeight: 800,
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            opacity: loading || !input.trim() ? 0.5 : 1,
          }}
        >
          {lang === "vi" ? "Gửi" : "Send"}
        </button>
      </div>

      <style>{`
        .markdown-msg p { margin: 0 0 6px; }
        .markdown-msg p:last-child { margin-bottom: 0; }
        .markdown-msg ul, .markdown-msg ol { margin: 4px 0 6px 18px; padding: 0; }
        .markdown-msg code { background: rgba(255,255,255,.08); padding: 1px 5px; border-radius: 4px; font-size: 12px; }
        .markdown-msg pre { background: rgba(0,0,0,.4); padding: 8px 10px; border-radius: 8px; overflow-x: auto; }
        .markdown-msg a { color: ${C.sky}; }
        .markdown-msg strong { color: ${C.accent}; }
      `}</style>
    </div>
  );
}

function btnStyle(color: string, border: string): React.CSSProperties {
  return {
    background: C.surface,
    border: `1px solid ${border}`,
    borderRadius: 10,
    padding: "6px 10px",
    color,
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
  };
}

function iconMini(color: string, border: string): React.CSSProperties {
  return {
    background: "transparent",
    border: `1px solid ${border}`,
    borderRadius: 8,
    padding: "4px 8px",
    color,
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
  };
}

function inputStyle(): React.CSSProperties {
  return {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: "8px 10px",
    color: C.text,
    fontSize: 12,
    outline: "none",
  };
}
