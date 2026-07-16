
import { useState, createContext, useContext, useEffect } from "react";
import { tokens, fontImport } from "./theme";
import SupportChat from "./SupportChat";
import AdminSupportDashboard from "./AdminSupportDashboard";

/* ------------------------------------------------------------------ */
/*  API layer — talks to the Django endpoints                          */
/*  NOTE: see the message below the code for the required Django       */
/*  changes (JSON responses + CSRF) that make these calls work.        */
/* ------------------------------------------------------------------ */
// În dezvoltare, React (5173) și Django (8000) rulează pe porturi diferite,
// deci ai nevoie de URL complet. În producție (Varianta 2 din chat) poți
// lăsa doar "/api/auth" dacă React e servit tot de Django.
const API_BASE = "http://localhost:8000/api/auth";

function getCookie(name) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

async function apiRequest(path, body) {
  const res = await fetch(`${API_BASE}/${path}/`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCookie("csrftoken") || "",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Something went wrong. Try again.");
  }
  return data;
}

const authApi = {
  signup: (username, email, password) => apiRequest("signup", { username, email, password }),
  login: (email, password) => apiRequest("login", { email, password }),
  logout: () => apiRequest("logout", {}),
  me: () => fetch(`${API_BASE}/me/`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)),
};

/* ------------------------------------------------------------------ */
/*  Auth context                                                       */
/* ------------------------------------------------------------------ */
const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    authApi
      .me()
      .then((data) => setUser(data?.user || null))
      .finally(() => setChecking(false));
  }, []);

  const value = {
    user,
    checking,
    login: async (email, password) => {
      const data = await authApi.login(email, password);
      setUser(data.user);
    },
    signup: async (username, email, password) => {
      const data = await authApi.signup(username, email, password);
      setUser(data.user);
    },
    logout: async () => {
      await authApi.logout();
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth() {
  return useContext(AuthContext);
}

/* ------------------------------------------------------------------ */
/*  Typing-dots signature element — used ambiently, and as the         */
/*  submit-button loading state so the "chat" language carries         */
/*  through the auth flow itself.                                      */
/* ------------------------------------------------------------------ */
function TypingDots({ size = 6 }) {
  return (
    <span style={{ display: "inline-flex", gap: size * 0.7, alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: "currentColor",
            display: "inline-block",
            animation: `chatBounce 1.1s ${i * 0.15}s infinite ease-in-out`,
          }}
        />
      ))}
    </span>
  );
}

function FloatingBubbles() {
  const bubbles = [
    { w: 120, top: "18%", left: "10%", delay: "0s" },
    { w: 88, top: "38%", left: "58%", delay: "1.4s" },
    { w: 150, top: "62%", left: "22%", delay: "0.7s" },
    { w: 70, top: "78%", left: "64%", delay: "2s" },
  ];
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }} aria-hidden="true">
      {bubbles.map((b, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: b.top,
            left: b.left,
            width: b.w,
            height: b.w * 0.42,
            borderRadius: 14,
            border: `1px solid ${tokens.border}`,
            background: "rgba(79, 216, 196, 0.04)",
            animation: `chatFloat 7s ${b.delay} infinite ease-in-out`,
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared field component                                             */
/* ------------------------------------------------------------------ */
function Field({ label, ...props }) {
  return (
    <label style={{ display: "block", marginBottom: 18 }}>
      <span
        style={{
          display: "block",
          fontSize: 12,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: tokens.textMuted,
          marginBottom: 7,
          fontFamily: "Inter, sans-serif",
        }}
      >
        {label}
      </span>
      <input
        {...props}
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: tokens.panel,
          border: `1px solid ${tokens.border}`,
          borderRadius: 8,
          padding: "11px 13px",
          color: tokens.text,
          fontSize: 14.5,
          fontFamily: "Inter, sans-serif",
          outline: "none",
          transition: "border-color 0.15s ease",
        }}
        onFocus={(e) => (e.target.style.borderColor = tokens.accentDim)}
        onBlur={(e) => (e.target.style.borderColor = tokens.border)}
      />
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  Login form                                                         */
/* ------------------------------------------------------------------ */
function LoginForm({ onSwitch }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Field
        label="Email"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Field
        label="Password"
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <ErrorBanner text={error} />}
      <SubmitButton loading={loading}>Log in</SubmitButton>
      <SwitchLine
        text="New here?"
        actionText="Create an account"
        onClick={onSwitch}
      />
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Signup form                                                        */
/* ------------------------------------------------------------------ */
function SignupForm({ onSwitch }) {
  const { signup } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signup(username, email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Field
        label="Username"
        type="text"
        placeholder="how others will see you"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <Field
        label="Email"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Field
        label="Password"
        type="password"
        placeholder="at least 8 characters"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={8}
      />
      {error && <ErrorBanner text={error} />}
      <SubmitButton loading={loading}>Create account</SubmitButton>
      <SwitchLine
        text="Already have an account?"
        actionText="Log in"
        onClick={onSwitch}
      />
    </form>
  );
}

function ErrorBanner({ text }) {
  return (
    <div
      style={{
        background: "rgba(226, 104, 92, 0.08)",
        border: `1px solid rgba(226, 104, 92, 0.35)`,
        color: tokens.danger,
        fontSize: 13,
        borderRadius: 7,
        padding: "9px 12px",
        marginBottom: 16,
        fontFamily: "Inter, sans-serif",
      }}
    >
      {text}
    </div>
  );
}

function SubmitButton({ loading, children }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        width: "100%",
        background: tokens.accent,
        color: "#08211D",
        border: "none",
        borderRadius: 8,
        padding: "12px 0",
        fontSize: 14.5,
        fontWeight: 500,
        fontFamily: "Inter, sans-serif",
        cursor: loading ? "default" : "pointer",
        opacity: loading ? 0.85 : 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        transition: "opacity 0.15s ease",
      }}
    >
      {loading ? <TypingDots size={6} /> : children}
    </button>
  );
}

function SwitchLine({ text, actionText, onClick }) {
  return (
    <p
      style={{
        textAlign: "center",
        fontSize: 13,
        color: tokens.textMuted,
        marginTop: 20,
        fontFamily: "Inter, sans-serif",
      }}
    >
      {text}{" "}
      <button
        type="button"
        onClick={onClick}
        style={{
          background: "none",
          border: "none",
          color: tokens.accent,
          fontSize: 13,
          cursor: "pointer",
          padding: 0,
          fontFamily: "Inter, sans-serif",
        }}
      >
        {actionText}
      </button>
    </p>
  );
}

/* ------------------------------------------------------------------ */
/*  Auth screen — split layout                                         */
/* ------------------------------------------------------------------ */
function AuthScreen() {
  const [mode, setMode] = useState("login");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: tokens.bg,
        display: "flex",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <style>{`
        ${fontImport}
        @keyframes chatBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes chatFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-14px); }
        }
      `}</style>

      {/* Hero / signature side */}
      <div
        style={{
          flex: "1 1 46%",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 64px",
          borderRight: `1px solid ${tokens.border}`,
        }}
      >
        <FloatingBubbles />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ color: tokens.accent, marginBottom: 18 }}>
            <TypingDots size={7} />
          </div>
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 42,
              lineHeight: 1.12,
              color: tokens.text,
              margin: "0 0 16px",
              maxWidth: 380,
            }}
          >
            Someone's already typing.
          </h1>
          <p style={{ color: tokens.textMuted, fontSize: 15, maxWidth: 340, lineHeight: 1.6 }}>
            Sign in to pick up the conversation, or create an account to join.
          </p>
        </div>
      </div>

      {/* Form side */}
      <div
        style={{
          flex: "1 1 54%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 360,
            background: tokens.card,
            border: `1px solid ${tokens.border}`,
            borderRadius: 14,
            padding: "32px 28px",
          }}
        >
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 500,
              fontSize: 21,
              color: tokens.text,
              margin: "0 0 24px",
            }}
          >
            {mode === "login" ? "Log in" : "Create your account"}
          </h2>
          {mode === "login" ? (
            <LoginForm onSwitch={() => setMode("signup")} />
          ) : (
            <SignupForm onSwitch={() => setMode("login")} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Simple gate — swap the "signed in" panel for your real chat UI     */
/* ------------------------------------------------------------------ */
function SignedInPanel() {
  const { user, logout } = useAuth();
  return (
    <div
      style={{
        minHeight: "100vh",
        background: tokens.bg,
        color: tokens.text,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "40px 24px",
        fontFamily: "Inter, sans-serif",
        gap: 20,
      }}
    >
      <style>{fontImport}</style>
      <div
        style={{
          width: "100%",
          maxWidth: 880,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, color: tokens.text, margin: 0 }}>
          {user?.username} {user?.is_staff && <span style={{ color: tokens.accent, fontSize: 13 }}>(admin)</span>}
        </p>
        <button
          onClick={logout}
          style={{
            background: "none",
            border: `1px solid ${tokens.border}`,
            color: tokens.textMuted,
            borderRadius: 8,
            padding: "9px 18px",
            cursor: "pointer",
            fontSize: 13.5,
          }}
        >
          Log out
        </button>
      </div>

      {user?.is_staff ? <AdminSupportDashboard /> : <SupportChat />}
    </div>
  );
}

function AuthGate() {
  const { user, checking } = useAuth();
  if (checking) return null;
  return user ? <SignedInPanel /> : <AuthScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
