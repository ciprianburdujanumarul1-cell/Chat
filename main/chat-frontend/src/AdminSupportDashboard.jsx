import { useEffect, useRef, useState } from "react";
import { tokens } from "./theme";

const WS_BASE = "ws://localhost:8000";

export default function AdminSupportDashboard() {
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    fetch("http://localhost:8000/api/chat/admin/threads/", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setThreads(data.threads || []))
      .catch((err) => console.error("Failed to load threads", err));
  }, []);

  useEffect(() => {
    if (!activeThread) return;

    fetch(`http://localhost:8000/api/chat/admin/threads/${activeThread}/`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setMessages(data.messages || []))
      .catch((err) => console.error("Failed to load thread history", err));

    const ws = new WebSocket(`${WS_BASE}/chat/admin/${activeThread}/`);
    wsRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (event) => setMessages((prev) => [...prev, JSON.parse(event.data)]);

    return () => { ws.close(); setConnected(false); };
  }, [activeThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ message: input }));
    setInput("");
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 880,
        height: "70vh",
        display: "flex",
        background: tokens.card,
        border: `1px solid ${tokens.border}`,
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      {/* Thread list */}
      <div style={{ width: 260, borderRight: `1px solid ${tokens.border}`, overflowY: "auto" }}>
        <div style={{ padding: "14px 16px", fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, color: tokens.text, borderBottom: `1px solid ${tokens.border}` }}>
          Threads
        </div>
        {threads.map((t) => (
          <button
            key={t.user_id}
            onClick={() => setActiveThread(t.user_id)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              background: t.user_id === activeThread ? tokens.panel : "transparent",
              border: "none",
              borderBottom: `1px solid ${tokens.border}`,
              padding: "12px 16px",
              cursor: "pointer",
            }}
          >
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: tokens.text, marginBottom: 2 }}>{t.username}</div>
            <div style={{ fontSize: 12, color: tokens.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.last_message}</div>
          </button>
        ))}
      </div>

      {/* Active thread */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {activeThread ? (
          <>
            <div
              style={{
                padding: "14px 18px",
                borderBottom: `1px solid ${tokens.border}`,
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 15,
                color: tokens.text,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>{threads.find((t) => t.user_id === activeThread)?.username}</span>
              <span style={{ fontSize: 12, color: connected ? tokens.accent : tokens.danger }}>
                {connected ? "● online" : "● offline"}
              </span>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
              {messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    alignSelf: m.is_admin ? "flex-end" : "flex-start",
                    maxWidth: "75%",
                    background: m.is_admin ? tokens.accentDim : tokens.panel,
                    border: `1px solid ${tokens.border}`,
                    borderRadius: 10,
                    padding: "8px 12px",
                  }}
                >
                  <div style={{ fontSize: 11, color: tokens.textMuted, marginBottom: 3 }}>
                    {m.is_admin ? "You (support)" : m.sender_username} · {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div style={{ fontSize: 14, color: tokens.text, fontFamily: "Inter, sans-serif" }}>{m.content}</div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={sendMessage} style={{ display: "flex", gap: 8, padding: 14, borderTop: `1px solid ${tokens.border}` }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Reply..."
                style={{
                  flex: 1,
                  background: tokens.panel,
                  border: `1px solid ${tokens.border}`,
                  borderRadius: 8,
                  padding: "10px 12px",
                  color: tokens.text,
                  fontFamily: "Inter, sans-serif",
                  fontSize: 14,
                  outline: "none",
                }}
              />
              <button
                type="submit"
                disabled={!connected}
                style={{
                  background: tokens.accent,
                  color: "#08211D",
                  border: "none",
                  borderRadius: 8,
                  padding: "0 18px",
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 500,
                  cursor: connected ? "pointer" : "default",
                  opacity: connected ? 1 : 0.6,
                }}
              >
                Send
              </button>
            </form>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: tokens.textMuted, fontFamily: "Inter, sans-serif" }}>
            Select a thread
          </div>
        )}
      </div>
    </div>
  );
}