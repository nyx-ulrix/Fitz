import { useState, useEffect } from "react";
import { Users, Plus, Link, Sparkles, Copy, Check, Edit3, Calendar, MapPin, Palette, ChevronRight, ArrowLeft, Share2, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../lib/AuthContext";
import { api } from "../lib/api";

const STYLE_VIBES = [
  { id: "boho",    label: "Bohemian",   emoji: "🌿" },
  { id: "formal",  label: "Formal",     emoji: "🥂" },
  { id: "casual",  label: "Casual",     emoji: "☀️" },
  { id: "beach",   label: "Beach",      emoji: "🌊" },
  { id: "y2k",     label: "Y2K",        emoji: "✨" },
  { id: "minimal", label: "Minimalist", emoji: "🤍" },
  { id: "dark",    label: "Dark Glam",  emoji: "🖤" },
  { id: "garden",  label: "Garden",     emoji: "🌸" },
];

type CreateStep = "details" | "vibe" | "invite" | "done";

export function StyleJamsScreen() {
  const { token, profile } = useAuth();

  const [tab, setTab]               = useState<"active" | "create" | "join">("active");
  const [createStep, setCreateStep] = useState<CreateStep>("details");
  const [jams, setJams]             = useState<any[]>([]);
  const [activeJam, setActiveJam]   = useState<any | null>(null);
  const [loading, setLoading]       = useState(true);
  const [copied, setCopied]         = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptText, setPromptText] = useState("");
  const [joinCode, setJoinCode]     = useState("");
  const [joinError, setJoinError]   = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [newJam, setNewJam]         = useState({ eventName: "", date: "", location: "", prompt: "", vibe: "", code: "" });

  const STEP_LABELS: CreateStep[] = ["details", "vibe", "invite", "done"];
  const stepIndex = STEP_LABELS.indexOf(createStep);

  const fetchJams = async () => {
    if (!token) return;
    try {
      const { jams: data } = await api.getJams(token);
      setJams(data ?? []);
      if (data?.length > 0) { setActiveJam(data[0]); setPromptText(data[0].prompt ?? ""); }
    } catch (e) { console.log("Fetch jams error:", e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchJams(); }, [token]);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const savePrompt = async () => {
    if (!token || !activeJam) return;
    setEditingPrompt(false);
    try {
      const { jam } = await api.updateJam(token, activeJam.id, { prompt: promptText });
      setActiveJam(jam);
    } catch (e) { console.log("Update prompt error:", e); }
  };

  const advanceStep = async () => {
    if (createStep === "details") { setCreateStep("vibe"); return; }
    if (createStep === "vibe")    { setCreateStep("invite"); return; }
    if (createStep === "invite") {
      setSubmitting(true);
      try {
        const { jam } = await api.createJam(token!, { eventName: newJam.eventName, date: newJam.date, location: newJam.location, prompt: newJam.prompt, vibe: newJam.vibe });
        setNewJam(j => ({ ...j, code: jam.code }));
        setCreateStep("done");
        await fetchJams();
      } catch (e) { console.log("Create jam error:", e); }
      finally { setSubmitting(false); }
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim() || !token) return;
    setSubmitting(true); setJoinError("");
    try {
      await api.joinJam(token, joinCode.trim());
      await fetchJams();
      setTab("active");
    } catch (e: any) { setJoinError(e.message ?? "Jam not found"); }
    finally { setSubmitting(false); }
  };

  const resetCreate = () => {
    setCreateStep("details");
    setNewJam({ eventName: "", date: "", location: "", prompt: "", vibe: "", code: "" });
    setTab("active");
  };

  const canAdvance =
    createStep === "details" ? newJam.eventName.trim().length > 0 :
    createStep === "vibe"    ? newJam.vibe.length > 0 : true;

  return (
    <div className="flex flex-col pb-8">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 700, color: "var(--foreground)" }}>Style Jams</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>Coordinate looks with your crew</p>
      </div>

      {/* Tabs */}
      <div className="px-5 mb-5">
        <div className="flex rounded-2xl p-1" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          {(["active", "create", "join"] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); if (t === "create") setCreateStep("details"); }}
              className="flex-1 py-2 rounded-xl text-xs capitalize transition-all"
              style={{ background: tab === t ? "var(--primary)" : "transparent", color: tab === t ? "var(--primary-foreground)" : "var(--muted-foreground)", fontFamily: "var(--font-body)", fontWeight: tab === t ? 600 : 400 }}>
              {t === "active" ? "My Jams" : t === "create" ? "Create" : "Join"}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ── MY JAMS ── */}
        {tab === "active" && (
          <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {loading ? (
              <div className="flex justify-center py-16"><RefreshCw size={24} style={{ color: "var(--accent)", animation: "spin 1s linear infinite" }} /></div>
            ) : !activeJam ? (
              <div className="flex flex-col items-center py-16 px-8 text-center gap-3">
                <span style={{ fontSize: "2.5rem" }}>🎉</span>
                <p style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", color: "var(--foreground)" }}>No active jams yet</p>
                <p className="text-sm" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>Create a jam or join one with a code</p>
                <button onClick={() => setTab("create")} className="mt-2 px-5 py-2.5 rounded-full text-sm" style={{ background: "var(--accent)", color: "white", fontFamily: "var(--font-body)", fontWeight: 600 }}>
                  Create a Jam
                </button>
              </div>
            ) : (
              <div className="px-5">
                <div className="rounded-3xl overflow-hidden" style={{ background: "var(--card)", boxShadow: "0 4px 24px rgba(169,139,227,0.2)", border: "1.5px solid var(--border)" }}>
                  {/* Gradient header */}
                  <div className="p-4" style={{ background: "linear-gradient(135deg, var(--accent), var(--secondary))" }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.25)", color: "white", fontFamily: "var(--font-body)" }}>
                          Active · {activeJam.hostId === profile?.id ? "Host" : "Member"}
                        </span>
                        <h2 className="mt-1" style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", color: "white", fontWeight: 700 }}>{activeJam.eventName}</h2>
                        <div className="flex items-center gap-3 mt-1.5">
                          {activeJam.date && <div className="flex items-center gap-1"><Calendar size={11} color="rgba(255,255,255,0.8)" /><span className="text-xs" style={{ color: "rgba(255,255,255,0.8)", fontFamily: "var(--font-body)" }}>{activeJam.date}</span></div>}
                          {activeJam.location && <div className="flex items-center gap-1"><MapPin size={11} color="rgba(255,255,255,0.8)" /><span className="text-xs" style={{ color: "rgba(255,255,255,0.8)", fontFamily: "var(--font-body)" }}>{activeJam.location}</span></div>}
                        </div>
                      </div>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
                        style={{ background: "rgba(255,255,255,0.2)", color: "white", fontFamily: "var(--font-body)", backdropFilter: "blur(8px)" }}
                        onClick={() => copyCode(activeJam.code)}>
                        {copied ? <Check size={11} /> : <Copy size={11} />} {activeJam.code}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <div className="flex -space-x-2">
                        {(activeJam.members ?? []).slice(0, 4).map((m: any) => (
                          <div key={m.userId} className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0" style={{ border: "2px solid white", background: "var(--accent)" }}>
                            {m.avatar ? <img src={m.avatar} alt={m.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">{m.name?.[0]}</div>}
                          </div>
                        ))}
                      </div>
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.9)", fontFamily: "var(--font-body)" }}>
                        {activeJam.members?.length ?? 1} member{activeJam.members?.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Editable prompt */}
                  <div className="p-4" style={{ borderBottom: "1px solid var(--border)" }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-xs mb-1" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>Event Prompt</p>
                        {editingPrompt ? (
                          <input autoFocus value={promptText} onChange={e => setPromptText(e.target.value)} onBlur={savePrompt}
                            className="w-full text-sm bg-transparent outline-none border-b"
                            style={{ color: "var(--foreground)", fontFamily: "var(--font-display)", fontStyle: "italic", borderColor: "var(--accent)", paddingBottom: 2 }} />
                        ) : (
                          <p style={{ fontFamily: "var(--font-display)", fontSize: "0.95rem", color: "var(--foreground)", fontStyle: "italic" }}>"{promptText || "No prompt set"}"</p>
                        )}
                      </div>
                      <button onClick={() => setEditingPrompt(true)}><Edit3 size={14} style={{ color: "var(--muted-foreground)" }} /></button>
                    </div>
                  </div>

                  {/* Member status */}
                  <div className="p-4">
                    <p className="text-xs mb-3" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>Member status</p>
                    <div className="flex flex-col gap-2">
                      {(activeJam.members ?? []).map((m: any) => (
                        <div key={m.userId} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0" style={{ border: "2px solid var(--accent)", background: "var(--accent)" }}>
                            {m.avatar ? <img src={m.avatar} alt={m.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">{m.name?.[0]}</div>}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs" style={{ fontFamily: "var(--font-body)", fontWeight: 600, color: "var(--foreground)" }}>{m.name}</p>
                            <p className="text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>{m.items ?? 0} items</p>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: m.status === "host" ? "var(--accent)" : m.status === "ready" ? "#dcfce7" : "var(--muted)", color: m.status === "host" ? "white" : m.status === "ready" ? "#16a34a" : "var(--muted-foreground)", fontFamily: "var(--font-body)", fontWeight: 600 }}>
                            {m.status === "host" ? "Host" : m.status === "ready" ? "Ready" : "Pending"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Other jams list */}
                {jams.length > 1 && (
                  <div className="mt-4">
                    <p className="text-xs mb-2" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Other Jams</p>
                    {jams.slice(1).map((jam: any) => (
                      <button key={jam.id} onClick={() => { setActiveJam(jam); setPromptText(jam.prompt ?? ""); }}
                        className="w-full flex items-center gap-3 p-3 rounded-2xl mb-2 text-left"
                        style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--secondary)" }}>
                          <Users size={14} style={{ color: "var(--foreground)" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate" style={{ fontFamily: "var(--font-body)", fontWeight: 600, color: "var(--foreground)" }}>{jam.eventName}</p>
                          <p className="text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>{jam.members?.length ?? 1} members · {jam.code}</p>
                        </div>
                        <ChevronRight size={14} style={{ color: "var(--muted-foreground)" }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ── CREATE ── */}
        {tab === "create" && (
          <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-5">
            {/* Progress */}
            <div className="flex items-center gap-2 mb-6">
              {["Details", "Vibe", "Invite", "Done"].map((label, i) => (
                <div key={label} className="flex items-center gap-2 flex-1">
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all"
                      style={{ background: i <= stepIndex ? "var(--accent)" : "var(--muted)", color: i <= stepIndex ? "white" : "var(--muted-foreground)", fontFamily: "var(--font-body)", fontWeight: 700 }}>
                      {i < stepIndex ? <Check size={13} /> : i + 1}
                    </div>
                    <span className="text-xs" style={{ color: i <= stepIndex ? "var(--accent)" : "var(--muted-foreground)", fontFamily: "var(--font-body)", fontWeight: i === stepIndex ? 600 : 400 }}>{label}</span>
                  </div>
                  {i < 3 && <div className="h-0.5 flex-1 rounded-full mb-4" style={{ background: i < stepIndex ? "var(--accent)" : "var(--muted)" }} />}
                </div>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {/* Step 1 — Details */}
              {createStep === "details" && (
                <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-3">
                  <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", color: "var(--foreground)", marginBottom: 4 }}>Event Details</h2>
                  {[
                    { label: "Event Name *", icon: null, key: "eventName", placeholder: "e.g. Keiko's Wedding" },
                    { label: "Date",         icon: Calendar, key: "date",      placeholder: "", type: "date" },
                    { label: "Location",     icon: MapPin,   key: "location",  placeholder: "e.g. Bali, Indonesia" },
                  ].map(({ label, icon: Icon, key, placeholder, type }: any) => (
                    <div key={key} className="rounded-2xl p-4" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
                      <div className="flex items-center gap-2 mb-2">
                        {Icon && <Icon size={13} style={{ color: "var(--accent)" }} />}
                        <p className="text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
                      </div>
                      <input type={type || "text"} placeholder={placeholder} value={(newJam as any)[key]}
                        onChange={e => setNewJam(j => ({ ...j, [key]: e.target.value }))}
                        className="w-full bg-transparent outline-none text-sm"
                        style={{ color: (newJam as any)[key] ? "var(--foreground)" : "var(--muted-foreground)", fontFamily: "var(--font-body)" }} />
                    </div>
                  ))}
                  <div className="rounded-2xl p-4" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Palette size={13} style={{ color: "var(--accent)" }} />
                      <p className="text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Style Prompt</p>
                    </div>
                    <textarea rows={2} placeholder='"Bohemian beach wedding in Bali"' value={newJam.prompt}
                      onChange={e => setNewJam(j => ({ ...j, prompt: e.target.value }))}
                      className="w-full bg-transparent outline-none text-sm resize-none"
                      style={{ color: "var(--foreground)", fontFamily: "var(--font-body)", lineHeight: 1.5 }} />
                  </div>
                </motion.div>
              )}

              {/* Step 2 — Vibe */}
              {createStep === "vibe" && (
                <motion.div key="vibe" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-4">
                  <div>
                    <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", color: "var(--foreground)" }}>Choose a Vibe</h2>
                    <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>Guides the AI when matching outfits across wardrobes</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {STYLE_VIBES.map(vibe => {
                      const isSelected = newJam.vibe === vibe.id;
                      return (
                        <button key={vibe.id} onClick={() => setNewJam(j => ({ ...j, vibe: vibe.id }))} className="p-4 rounded-2xl text-left transition-all"
                          style={{ background: isSelected ? "var(--primary)" : "var(--card)", border: "1.5px solid", borderColor: isSelected ? "var(--primary)" : "var(--border)", boxShadow: isSelected ? "0 4px 16px rgba(75,59,97,0.25)" : "none", transform: isSelected ? "scale(1.02)" : "scale(1)" }}>
                          <span style={{ fontSize: "1.4rem" }}>{vibe.emoji}</span>
                          <p className="mt-1.5 text-sm" style={{ fontFamily: "var(--font-body)", fontWeight: 600, color: isSelected ? "var(--primary-foreground)" : "var(--foreground)" }}>{vibe.label}</p>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Step 3 — Invite */}
              {createStep === "invite" && (
                <motion.div key="invite" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-4">
                  <div>
                    <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", color: "var(--foreground)" }}>Invite Your Crew</h2>
                    <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>A unique code is generated when you create the jam</p>
                  </div>
                  <div className="p-4 rounded-2xl" style={{ background: "linear-gradient(135deg, var(--accent), var(--secondary))", boxShadow: "0 6px 20px rgba(169,139,227,0.3)" }}>
                    <p className="text-xs text-white mb-1" style={{ fontFamily: "var(--font-body)", opacity: 0.8 }}>Your Jam</p>
                    <p className="text-white" style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 700 }}>{newJam.eventName || "Untitled Event"}</p>
                    {newJam.date && <div className="flex items-center gap-1.5 mt-1"><Calendar size={11} color="rgba(255,255,255,0.8)" /><span className="text-xs" style={{ color: "rgba(255,255,255,0.8)", fontFamily: "var(--font-body)" }}>{newJam.date}</span></div>}
                    {newJam.location && <div className="flex items-center gap-1.5 mt-1"><MapPin size={11} color="rgba(255,255,255,0.8)" /><span className="text-xs" style={{ color: "rgba(255,255,255,0.8)", fontFamily: "var(--font-body)" }}>{newJam.location}</span></div>}
                    {newJam.vibe && <div className="mt-2"><span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.2)", color: "white", fontFamily: "var(--font-body)" }}>{STYLE_VIBES.find(v => v.id === newJam.vibe)?.emoji} {STYLE_VIBES.find(v => v.id === newJam.vibe)?.label}</span></div>}
                  </div>
                  <div className="p-4 rounded-2xl flex items-center gap-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0" style={{ border: "2px solid var(--accent)", background: "var(--accent)" }}>
                      {profile?.photoUrl ? <img src={profile.photoUrl} alt="You" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">{profile?.name?.[0] ?? "Y"}</div>}
                    </div>
                    <div>
                      <p className="text-xs" style={{ fontFamily: "var(--font-body)", fontWeight: 600, color: "var(--foreground)" }}>{profile?.name ?? "You"} (Host)</p>
                      <p className="text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>Wardrobe ready</p>
                    </div>
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--accent)", color: "white", fontFamily: "var(--font-body)" }}>Host</span>
                  </div>
                </motion.div>
              )}

              {/* Step 4 — Done */}
              {createStep === "done" && (
                <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-5 py-4">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.1 }}
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, var(--accent), var(--secondary))", boxShadow: "0 8px 32px rgba(169,139,227,0.4)" }}>
                    <Check size={36} color="white" strokeWidth={2.5} />
                  </motion.div>
                  <div className="text-center">
                    <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", color: "var(--foreground)", fontWeight: 700 }}>Jam Created!</h2>
                    <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>Share your code to start coordinating</p>
                  </div>
                  <div className="w-full p-4 rounded-2xl flex items-center justify-between" style={{ background: "var(--card)", border: "2px dashed var(--accent)" }}>
                    <div>
                      <p className="text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>Your Jam Code</p>
                      <p style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 700, color: "var(--accent)", letterSpacing: "0.05em" }}>{newJam.code}</p>
                    </div>
                    <button onClick={() => copyCode(newJam.code)} className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm"
                      style={{ background: "var(--primary)", color: "var(--primary-foreground)", fontFamily: "var(--font-body)", fontWeight: 600 }}>
                      {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <div className="w-full flex gap-2">
                    <button className="flex-1 py-3 rounded-full text-sm flex items-center justify-center gap-2" style={{ background: "var(--secondary)", color: "var(--foreground)", fontFamily: "var(--font-body)", fontWeight: 600 }}>
                      <Share2 size={15} /> Share Link
                    </button>
                    <button onClick={resetCreate} className="flex-1 py-3 rounded-full text-sm flex items-center justify-center gap-2" style={{ background: "var(--primary)", color: "var(--primary-foreground)", fontFamily: "var(--font-body)", fontWeight: 600 }}>
                      <Users size={15} /> View Jam
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {createStep !== "done" && (
              <div className="flex gap-3 mt-6">
                {createStep !== "details" && (
                  <button onClick={() => setCreateStep(STEP_LABELS[stepIndex - 1])} className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
                    <ArrowLeft size={18} style={{ color: "var(--foreground)" }} />
                  </button>
                )}
                <button onClick={advanceStep} disabled={!canAdvance || submitting} className="flex-1 py-3.5 rounded-full text-sm flex items-center justify-center gap-2 transition-all"
                  style={{ background: canAdvance && !submitting ? "var(--primary)" : "var(--muted)", color: canAdvance && !submitting ? "var(--primary-foreground)" : "var(--muted-foreground)", fontFamily: "var(--font-body)", fontWeight: 600, boxShadow: canAdvance ? "0 4px 16px rgba(75,59,97,0.25)" : "none" }}>
                  {submitting ? <><RefreshCw size={14} className="animate-spin" /> Creating…</> : createStep === "invite" ? <><Sparkles size={15} /> Create Jam</> : <>Continue <ChevronRight size={15} /></>}
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ── JOIN ── */}
        {tab === "join" && (
          <motion.div key="join" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-5">
            <div className="flex flex-col gap-4">
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", color: "var(--foreground)" }}>Join a Jam</h2>
                <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>Enter the code your host shared with you</p>
              </div>
              <div className="p-4 rounded-2xl" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
                <p className="text-xs mb-2" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Jam Code</p>
                <input type="text" placeholder="e.g. STYLE-4821" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full bg-transparent outline-none"
                  style={{ color: "var(--foreground)", fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 700, letterSpacing: "0.05em" }} />
              </div>
              {joinError && <p className="text-xs text-center" style={{ color: "#e85d87", fontFamily: "var(--font-body)" }}>{joinError}</p>}
              <button onClick={handleJoin} disabled={joinCode.length < 6 || submitting} className="w-full py-4 rounded-full text-sm flex items-center justify-center gap-2"
                style={{ background: joinCode.length >= 6 && !submitting ? "var(--primary)" : "var(--muted)", color: joinCode.length >= 6 && !submitting ? "var(--primary-foreground)" : "var(--muted-foreground)", fontFamily: "var(--font-body)", fontWeight: 600 }}>
                {submitting ? <><RefreshCw size={14} className="animate-spin" /> Joining…</> : <><Link size={15} /> Join Jam</>}
              </button>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                <span className="text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>or</span>
                <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
              </div>
              <button className="w-full py-4 rounded-2xl text-sm flex items-center justify-center gap-2" style={{ background: "var(--card)", border: "1.5px solid var(--border)", color: "var(--foreground)", fontFamily: "var(--font-body)", fontWeight: 600 }}>
                <Share2 size={15} style={{ color: "var(--accent)" }} /> Scan QR Code
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
