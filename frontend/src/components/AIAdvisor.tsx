import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

const CONFIG = {
  name: "Sarra",
  subtitle: "Conseillère Souk.tn",
  primaryColor: "#FF6B35",
  secondaryColor: "#E85D20",
  apiUrl: "http://localhost:5000/api/assistant/chat",
  welcomeMessage: "👋 Bonjour ! Je suis **Sarra**, votre conseillère shopping sur Souk.tn.\n\nJe connais tous nos produits et je peux vous aider à trouver ce qu'il vous faut selon votre budget ! 🛍️",
  suggestions: [
    "Je cherche un téléphone pas cher",
    "أنجم نلقى هدية مناسبة؟",
    "Quels sont vos produits disponibles ?",
    "ما عندي ميزانية 200 دينار",
  ]
};

// ── Icône robot SVG orange ──
const RobotIcon = ({ size = 32, color = "#FF6B35" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="26" cy="26" r="26" fill={color}/>
    <line x1="26" y1="7" x2="26" y2="2" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="26" cy="1" r="2" fill="white"/>
    <rect x="10" y="9" width="32" height="24" rx="6" fill="white"/>
    <circle cx="19" cy="19" r="3.5" fill={color}/>
    <circle cx="33" cy="19" r="3.5" fill={color}/>
    <circle cx="19.8" cy="18" r="1.4" fill="white"/>
    <circle cx="33.8" cy="18" r="1.4" fill="white"/>
    <path d="M17 26 Q26 32 35 26" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none"/>
    <line x1="26" y1="33" x2="26" y2="42" stroke="white" strokeWidth="3" strokeLinecap="round"/>
    <line x1="16" y1="38" x2="36" y2="38" stroke="white" strokeWidth="3" strokeLinecap="round"/>
    <line x1="16" y1="38" x2="11" y2="46" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="36" y1="38" x2="41" y2="46" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

// Petite version pour les bulles de message
const RobotIconSmall = ({ color = "#FF6B35" }: { color?: string }) => (
  <svg width="28" height="28" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="26" cy="26" r="26" fill="#FFF0EB"/>
    <line x1="26" y1="7" x2="26" y2="2" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="26" cy="1" r="2" fill={color}/>
    <rect x="10" y="9" width="32" height="24" rx="6" fill={color}/>
    <circle cx="19" cy="19" r="3.5" fill="white"/>
    <circle cx="33" cy="19" r="3.5" fill="white"/>
    <circle cx="19.8" cy="18" r="1.4" fill={color}/>
    <circle cx="33.8" cy="18" r="1.4" fill={color}/>
    <path d="M17 26 Q26 32 35 26" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
    <line x1="26" y1="33" x2="26" y2="42" stroke="white" strokeWidth="3" strokeLinecap="round"/>
    <line x1="16" y1="38" x2="36" y2="38" stroke="white" strokeWidth="3" strokeLinecap="round"/>
    <line x1="16" y1="38" x2="11" y2="46" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="36" y1="38" x2="41" y2="46" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

type Product = {
  id: number;
  name: string;
  price: number;
  slug: string;
  image?: string;
  category_name?: string;
};

type Message = {
  role: "user" | "model";
  parts: [{ text: string }];
  products?: Product[];
};

export default function AIAdvisor() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();

  if (profile?.role === "seller" || profile?.role === "admin") return null;

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", parts: [{ text: CONFIG.welcomeMessage }] }
  ]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim() || loading) return;

    setShowSuggestions(false);

    const newMessages: Message[] = [
      ...messages,
      { role: "user", parts: [{ text: messageText }] }
    ];

    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(CONFIG.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, parts: m.parts }))
        })
      });

      const data = await res.json();
      setMessages([
        ...newMessages,
        {
          role: "model",
          parts: [{ text: data.reply || "Désolé, réessaie." }],
          products: data.products || []
        }
      ]);
    } catch {
      setMessages([
        ...newMessages,
        { role: "model", parts: [{ text: "❌ Erreur de connexion. Réessaie." }] }
      ]);
    }

    setLoading(false);
  };

  const formatText = (text: string) =>
    text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br/>");

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">

      {/* ── Fenêtre chat ── */}
      {open && (
        <div
          className="mb-4 flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-gray-100"
          style={{ width: "370px", height: "560px", background: "#f8f9ff" }}
        >
          {/* Header */}
          <div
            style={{ background: `linear-gradient(135deg, ${CONFIG.primaryColor}, ${CONFIG.secondaryColor})` }}
            className="px-4 py-3 flex items-center justify-between flex-shrink-0"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                <RobotIcon size={36} color="white" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">{CONFIG.name}</p>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <p className="text-white/80 text-xs">{CONFIG.subtitle}</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white text-lg transition"
            >✕</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i}>
                <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "model" && (
                    <div className="mr-2 mt-1 flex-shrink-0">
                      <RobotIconSmall color={CONFIG.primaryColor} />
                    </div>
                  )}
                  <div
                    className="text-sm px-4 py-2.5 rounded-2xl max-w-[80%] leading-relaxed"
                    style={{
                      background: m.role === "user"
                        ? `linear-gradient(135deg, ${CONFIG.primaryColor}, ${CONFIG.secondaryColor})`
                        : "white",
                      color: m.role === "user" ? "white" : "#1f2937",
                      borderBottomRightRadius: m.role === "user" ? "4px" : "16px",
                      borderBottomLeftRadius: m.role === "model" ? "4px" : "16px",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
                    }}
                    dangerouslySetInnerHTML={{ __html: formatText(m.parts[0].text) }}
                  />
                </div>

                {/* Cartes produits */}
                {m.products && m.products.length > 0 && (
                  <div className="mt-2 ml-9 space-y-2">
                    {m.products.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { navigate(`/product/${p.id}`); setOpen(false); }}
                        className="w-full text-left bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex items-center gap-3 hover:border-orange-300 hover:shadow-md transition-all"
                      >
                        {p.image ? (
                          <img
                            src={`http://localhost:5000${p.image}`}
                            alt={p.name}
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg flex items-center justify-center text-xl flex-shrink-0 bg-orange-50">
                            🛍️
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                          {p.category_name && (
                            <p className="text-xs text-gray-400">{p.category_name}</p>
                          )}
                          <p className="text-sm font-bold mt-0.5" style={{ color: CONFIG.primaryColor }}>
                            {p.price} DT
                          </p>
                        </div>
                        <span className="text-gray-300 text-lg">›</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Loading */}
            {loading && (
              <div className="flex justify-start items-center gap-2">
                <div className="mr-0 flex-shrink-0">
                  <RobotIconSmall color={CONFIG.primaryColor} />
                </div>
                <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    {[0, 150, 300].map(delay => (
                      <div
                        key={delay}
                        className="w-2 h-2 rounded-full animate-bounce"
                        style={{ backgroundColor: CONFIG.primaryColor, animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Suggestions */}
            {showSuggestions && messages.length === 1 && (
              <div className="space-y-2 mt-2">
                <p className="text-xs text-gray-400 text-center">Questions fréquentes</p>
                {CONFIG.suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s)}
                    className="w-full text-left text-xs px-3 py-2 rounded-xl border bg-white transition hover:bg-orange-50"
                    style={{ borderColor: `${CONFIG.primaryColor}40`, color: CONFIG.primaryColor }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t border-gray-100 flex-shrink-0">
            <div className="flex gap-2 items-center bg-gray-50 rounded-xl px-3 py-2 border border-gray-200">
              <input
                className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder="Écris ta question... / اكتب سؤالك..."
                disabled={loading}
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition disabled:opacity-40"
                style={{ background: `linear-gradient(135deg, ${CONFIG.primaryColor}, ${CONFIG.secondaryColor})` }}
              >
                <span className="text-white text-sm">➤</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bouton flottant ── */}
      <button
        onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        style={{ background: `linear-gradient(135deg, ${CONFIG.primaryColor}, ${CONFIG.secondaryColor})` }}
      >
        {open ? (
          <span className="text-white text-xl font-bold">✕</span>
        ) : (
          <RobotIcon size={40} color="white" />
        )}
      </button>

      {/* Badge notification */}
      {!open && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center pointer-events-none">
          <span className="text-white text-xs font-bold">1</span>
        </div>
      )}
    </div>
  );
}