import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Camera, ArrowRight, Check, Sparkles, User, Mail, ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

type Step = "welcome" | "account" | "photo" | "analysing" | "results" | "done";

interface Profile {
  name: string;
  email: string;
  photoUrl: string;
}

interface OnboardingScreenProps {
  onComplete: () => void;
}

const SAMPLE_PHOTOS = [
  "https://images.unsplash.com/photo-1581841064838-a470c740e8ee?w=600&h=800&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1616639943825-e0fbad20a3d3?w=600&h=800&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1652473291442-7a2e034a00d1?w=600&h=800&fit=crop&auto=format",
];

const AI_RESULTS = {
  undertone: "Warm",
  season: "Spring / Autumn",
  skinTone: "Medium Warm",
  palette: [
    { name: "Camel",     hex: "#c19a6b" },
    { name: "Terracotta",hex: "#c0694a" },
    { name: "Sage",      hex: "#8aab8a" },
    { name: "Ivory",     hex: "#f5f0e8" },
    { name: "Warm Rust", hex: "#b5451b" },
    { name: "Olive",     hex: "#8a8a4a" },
    { name: "Blush",     hex: "#e8a898" },
    { name: "Chocolate", hex: "#5c3d2e" },
  ],
  avoidColours: [
    { name: "Icy Blue",  hex: "#b8d4e8" },
    { name: "Cool Grey", hex: "#9a9aaa" },
    { name: "Fuchsia",   hex: "#c8408a" },
  ],
  measurements: {
    height:    "167 cm",
    bust:      "86 cm",
    waist:     "68 cm",
    hips:      "94 cm",
    inseam:    "78 cm",
    shoulders: "38 cm",
  },
  sizes: {
    tops:    "S",
    bottoms: "36",
    shoes:   "38",
  },
  bodyShape: "Hourglass",
  styleAdvice: "Your proportions suit high-waisted bottoms, fitted midlayers, and A-line or wrap silhouettes that define your waist.",
};

const ANALYSIS_STEPS = [
  "Detecting skin tone & undertone…",
  "Mapping your seasonal colour palette…",
  "Estimating body measurements…",
  "Identifying your body shape…",
  "Building your style profile…",
];

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { signIn, refreshProfile, token } = useAuth();
  const [step, setStep]           = useState<Step>("welcome");
  const [profile, setProfile]     = useState<Profile>({ name: "", email: "", photoUrl: "" });
  const [password, setPassword]   = useState("");
  const [analysisStep, setAnalysisStep] = useState(0);
  const [resultsTab, setResultsTab] = useState<"colour" | "measurements">("colour");
  const [authError, setAuthError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleCreateAccount = async () => {
    if (submitting) return;
    setSubmitting(true);
    setAuthError("");
    try {
      await api.signup(profile.name, profile.email, password);
      await signIn(profile.email, password);
      setStep("photo");
    } catch (err: any) {
      setAuthError(err.message ?? "Signup failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const startAnalysis = () => {
    setStep("analysing");
    setAnalysisStep(0);
    let i = 0;
    const tick = setInterval(() => {
      i++;
      setAnalysisStep(i);
      if (i >= ANALYSIS_STEPS.length) {
        clearInterval(tick);
        setTimeout(() => setStep("results"), 400);
      }
    }, 700);
  };

  const handleFinish = async () => {
    try {
      if (token) {
        await api.updateProfile(token, { photoUrl: profile.photoUrl, ...AI_RESULTS });
        await refreshProfile();
      }
    } catch (e) { console.log("Save profile error:", e); }
    onComplete();
  };

  const canAdvanceAccount = profile.name.trim().length > 1 && profile.email.includes("@") && password.length >= 8;
  const canAdvancePhoto   = profile.photoUrl.length > 0;

  return (
    <div className="flex flex-col" style={{ minHeight: "100dvh", background: "var(--background)" }}>
      <AnimatePresence mode="wait">

        {/* ── WELCOME ── */}
        {step === "welcome" && (
          <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col flex-1" style={{ minHeight: "100dvh" }}
          >
            {/* Hero */}
            <div className="relative flex-1" style={{ minHeight: 420 }}>
              <img
                src="https://images.unsplash.com/photo-1616639943825-e0fbad20a3d3?w=800&h=1000&fit=crop&auto=format"
                alt="Fashion" className="w-full h-full object-cover absolute inset-0"
              />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(75,59,97,0.15) 0%, rgba(75,59,97,0.7) 65%, var(--background) 100%)" }} />
              <div className="absolute bottom-0 left-0 right-0 px-6 pb-8">
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
                  <span className="text-xs px-3 py-1 rounded-full" style={{ background: "var(--accent)", color: "white", fontFamily: "var(--font-body)", fontWeight: 600 }}>
                    AI-Powered Styling
                  </span>
                  <h1 className="mt-3" style={{ fontFamily: "var(--font-display)", fontSize: "2.2rem", fontWeight: 700, color: "white", lineHeight: 1.15 }}>
                    Your wardrobe,<br />
                    <span style={{ color: "var(--secondary)" }}>reimagined.</span>
                  </h1>
                  <p className="mt-3 text-sm" style={{ color: "rgba(255,255,255,0.8)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
                    Upload a photo of yourself. We'll analyse your unique colour tones and body shape to build your personal style profile.
                  </p>
                </motion.div>
              </div>
            </div>

            <div className="px-6 pb-10 pt-2">
              <motion.button
                initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setStep("account")}
                className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-sm"
                style={{ background: "linear-gradient(135deg, var(--accent), #7e5fbf)", color: "white", fontFamily: "var(--font-body)", fontWeight: 700, boxShadow: "0 6px 24px rgba(169,139,227,0.45)" }}
              >
                Get Started <ArrowRight size={17} />
              </motion.button>
              <button
                onClick={onComplete}
                className="w-full mt-3 py-3 text-sm"
                style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}
              >
                Skip for now
              </button>
            </div>
          </motion.div>
        )}

        {/* ── ACCOUNT ── */}
        {step === "account" && (
          <motion.div key="account" initial={{ x: "100%", opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: "-100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="flex flex-col px-6 pt-14 pb-10" style={{ minHeight: "100dvh" }}
          >
            <button onClick={() => setStep("welcome")} className="mb-8 self-start w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <ArrowLeft size={16} style={{ color: "var(--foreground)" }} />
            </button>

            {/* Step indicator */}
            <div className="flex gap-1.5 mb-8">
              {["account","photo","results"].map((s, i) => (
                <div key={s} className="h-1 flex-1 rounded-full" style={{ background: i === 0 ? "var(--accent)" : "var(--muted)" }} />
              ))}
            </div>

            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", fontWeight: 700, color: "var(--foreground)", lineHeight: 1.2 }}>
              Create your<br />account
            </h1>
            <p className="mt-2 mb-8 text-sm" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>
              We'll use this to personalise your wardrobe and style profile.
            </p>

            <div className="flex flex-col gap-3 flex-1">
              <div className="p-4 rounded-2xl" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <User size={13} style={{ color: "var(--accent)" }} />
                  <p className="text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Full Name</p>
                </div>
                <input
                  type="text" placeholder="Sophie Laurent"
                  value={profile.name}
                  onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                  className="w-full bg-transparent outline-none text-sm"
                  style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}
                />
              </div>

              <div className="p-4 rounded-2xl" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Mail size={13} style={{ color: "var(--accent)" }} />
                  <p className="text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Email</p>
                </div>
                <input
                  type="email" placeholder="sophie@example.com"
                  value={profile.email}
                  onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                  className="w-full bg-transparent outline-none text-sm"
                  style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}
                />
              </div>

              <div className="p-4 rounded-2xl" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Password</p>
                </div>
                <input
                  type="password" placeholder="Min. 8 characters"
                  className="w-full bg-transparent outline-none text-sm"
                  style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}
                />
              </div>
            </div>

            <button
              onClick={() => setStep("photo")}
              disabled={!canAdvanceAccount}
              className="mt-8 w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-sm"
              style={{
                background: canAdvanceAccount ? "linear-gradient(135deg, var(--accent), #7e5fbf)" : "var(--muted)",
                color: canAdvanceAccount ? "white" : "var(--muted-foreground)",
                fontFamily: "var(--font-body)", fontWeight: 700,
                boxShadow: canAdvanceAccount ? "0 6px 20px rgba(169,139,227,0.4)" : "none",
              }}
            >
              Continue <ArrowRight size={16} />
            </button>
          </motion.div>
        )}

        {/* ── PHOTO ── */}
        {step === "photo" && (
          <motion.div key="photo" initial={{ x: "100%", opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: "-100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="flex flex-col px-6 pt-14 pb-10" style={{ minHeight: "100dvh" }}
          >
            <button onClick={() => setStep("account")} className="mb-8 self-start w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <ArrowLeft size={16} style={{ color: "var(--foreground)" }} />
            </button>

            <div className="flex gap-1.5 mb-8">
              {["account","photo","results"].map((s, i) => (
                <div key={s} className="h-1 flex-1 rounded-full" style={{ background: i <= 1 ? "var(--accent)" : "var(--muted)" }} />
              ))}
            </div>

            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", fontWeight: 700, color: "var(--foreground)", lineHeight: 1.2 }}>
              Upload a<br />full-body photo
            </h1>
            <p className="mt-2 mb-6 text-sm" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
              Our AI will analyse your skin tone, undertone, and body proportions to build your colour palette and estimate your measurements.
            </p>

            {/* Tips */}
            <div className="flex flex-col gap-2 mb-6">
              {[
                { tip: "Stand in natural light",           icon: "☀️" },
                { tip: "Wear fitted clothing or neutral colours", icon: "👗" },
                { tip: "Face the camera directly",         icon: "📸" },
                { tip: "Show your full body if possible",  icon: "🧍" },
              ].map(({ tip, icon }) => (
                <div key={tip} className="flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: "1rem" }}>{icon}</span>
                  <p className="text-xs" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{tip}</p>
                </div>
              ))}
            </div>

            {/* Photo options */}
            {!profile.photoUrl ? (
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => { setProfile((p) => ({ ...p, photoUrl: SAMPLE_PHOTOS[selectedPhoto] })); }}
                  className="w-full py-4 rounded-2xl flex items-center justify-center gap-3"
                  style={{ background: "linear-gradient(135deg, var(--accent), #7e5fbf)", color: "white", fontFamily: "var(--font-body)", fontWeight: 700, boxShadow: "0 6px 20px rgba(169,139,227,0.4)" }}
                >
                  <Camera size={18} /> Take Photo
                </button>
                <button
                  onClick={() => { setProfile((p) => ({ ...p, photoUrl: SAMPLE_PHOTOS[selectedPhoto] })); }}
                  className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-sm"
                  style={{ background: "var(--card)", border: "1.5px solid var(--border)", color: "var(--foreground)", fontFamily: "var(--font-body)", fontWeight: 600 }}
                >
                  Upload from camera roll
                </button>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-4">
                {/* Preview */}
                <div className="relative rounded-3xl overflow-hidden" style={{ height: 280 }}>
                  <img src={profile.photoUrl} alt="Your photo" className="w-full h-full object-cover object-top" />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(75,59,97,0.5), transparent 50%)" }} />
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(246,242,255,0.9)" }}>
                      <Check size={12} style={{ color: "var(--accent)" }} />
                      <span className="text-xs" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)", fontWeight: 600 }}>Photo selected</span>
                    </div>
                    <button
                      onClick={() => setProfile((p) => ({ ...p, photoUrl: "" }))}
                      className="px-3 py-1.5 rounded-full text-xs"
                      style={{ background: "rgba(246,242,255,0.9)", color: "var(--foreground)", fontFamily: "var(--font-body)" }}
                    >
                      Retake
                    </button>
                  </div>
                </div>

                <button
                  onClick={startAnalysis}
                  className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-sm"
                  style={{ background: "linear-gradient(135deg, var(--accent), #7e5fbf)", color: "white", fontFamily: "var(--font-body)", fontWeight: 700, boxShadow: "0 6px 20px rgba(169,139,227,0.4)" }}
                >
                  <Sparkles size={17} /> Analyse My Style
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── ANALYSING ── */}
        {step === "analysing" && (
          <motion.div key="analysing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center px-6 text-center" style={{ minHeight: "100dvh" }}
          >
            {/* Pulsing avatar */}
            <div className="relative mb-8">
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                className="w-32 h-32 rounded-full overflow-hidden"
                style={{ border: "3px solid var(--accent)", boxShadow: "0 0 0 6px rgba(169,139,227,0.15), 0 0 0 12px rgba(169,139,227,0.08)" }}
              >
                <img src={profile.photoUrl} alt="Analysing" className="w-full h-full object-cover object-top" />
              </motion.div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="absolute -inset-2 rounded-full"
                style={{ border: "2px dashed var(--accent)", borderTopColor: "transparent", opacity: 0.5 }}
              />
            </div>

            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 700, color: "var(--foreground)" }}>
              Analysing your photo
            </h2>
            <p className="mt-2 mb-10 text-sm" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>
              This only takes a moment
            </p>

            <div className="w-full flex flex-col gap-3">
              {ANALYSIS_STEPS.map((s, i) => (
                <motion.div
                  key={s}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: i <= analysisStep ? 1 : 0.3, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                  style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: i < analysisStep ? "var(--accent)" : i === analysisStep ? "var(--secondary)" : "var(--muted)" }}
                  >
                    {i < analysisStep
                      ? <Check size={12} color="white" />
                      : i === analysisStep
                        ? <RefreshCw size={11} style={{ color: "var(--accent)", animation: "spin 1s linear infinite" }} />
                        : <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--muted-foreground)", display: "block" }} />
                    }
                  </div>
                  <p className="text-xs" style={{ fontFamily: "var(--font-body)", color: i <= analysisStep ? "var(--foreground)" : "var(--muted-foreground)", fontWeight: i === analysisStep ? 600 : 400 }}>
                    {s}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── RESULTS ── */}
        {step === "results" && (
          <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col pb-10" style={{ minHeight: "100dvh" }}
          >
            {/* Hero banner */}
            <div className="relative" style={{ height: 220 }}>
              <img src={profile.photoUrl} alt="You" className="w-full h-full object-cover object-top" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(75,59,97,0.2), rgba(75,59,97,0.75) 80%)" }} />
              <div className="absolute bottom-5 left-5 right-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "var(--accent)" }}>
                    <Check size={13} color="white" />
                  </div>
                  <span className="text-xs text-white" style={{ fontFamily: "var(--font-body)", fontWeight: 600 }}>Analysis complete</span>
                </div>
                <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 700, color: "white", lineHeight: 1.2 }}>
                  Your Style Profile,<br />{profile.name.split(" ")[0] || "Sophie"}
                </h1>
              </div>
            </div>

            {/* Tab toggle */}
            <div className="px-5 mt-4 mb-4">
              <div className="flex rounded-2xl p-1" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                {(["colour", "measurements"] as const).map((t) => (
                  <button key={t} onClick={() => setResultsTab(t)}
                    className="flex-1 py-2.5 rounded-xl text-xs transition-all"
                    style={{ background: resultsTab === t ? "var(--primary)" : "transparent", color: resultsTab === t ? "var(--primary-foreground)" : "var(--muted-foreground)", fontFamily: "var(--font-body)", fontWeight: resultsTab === t ? 600 : 400 }}
                  >
                    {t === "colour" ? "Colour Profile" : "Body & Sizing"}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {resultsTab === "colour" && (
                <motion.div key="colour" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
                  className="px-5 flex flex-col gap-4"
                >
                  {/* Undertone card */}
                  <div className="p-4 rounded-2xl" style={{ background: "linear-gradient(135deg, rgba(169,139,227,0.12), rgba(205,183,246,0.12))", border: "1.5px solid var(--border)" }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent)" }}>
                        <Sparkles size={16} color="white" />
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>Undertone detected</p>
                        <p style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 700, color: "var(--foreground)" }}>
                          {AI_RESULTS.undertone} · {AI_RESULTS.skinTone}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--accent)", fontFamily: "var(--font-body)", fontWeight: 600 }}>{AI_RESULTS.season} palette</p>
                      </div>
                    </div>
                  </div>

                  {/* Recommended palette */}
                  <div className="p-4 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <p className="text-sm mb-3" style={{ fontFamily: "var(--font-body)", fontWeight: 600, color: "var(--foreground)" }}>Your Best Colours</p>
                    <div className="flex flex-wrap gap-3">
                      {AI_RESULTS.palette.map((c) => (
                        <div key={c.name} className="flex flex-col items-center gap-1">
                          <div className="w-10 h-10 rounded-full" style={{ background: c.hex, border: "2px solid var(--border)", boxShadow: "0 2px 6px rgba(0,0,0,0.12)" }} />
                          <span className="text-xs text-center" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", fontSize: "0.6rem", lineHeight: 1.2, maxWidth: 44 }}>{c.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Avoid */}
                  <div className="p-4 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <p className="text-sm mb-3" style={{ fontFamily: "var(--font-body)", fontWeight: 600, color: "var(--foreground)" }}>Colours to Avoid</p>
                    <div className="flex gap-3">
                      {AI_RESULTS.avoidColours.map((c) => (
                        <div key={c.name} className="flex flex-col items-center gap-1">
                          <div className="relative w-10 h-10 rounded-full" style={{ background: c.hex, border: "2px solid var(--border)", opacity: 0.6 }}>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-6 h-0.5 rotate-45 rounded" style={{ background: "#e85d87" }} />
                            </div>
                          </div>
                          <span className="text-xs text-center" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", fontSize: "0.6rem", lineHeight: 1.2, maxWidth: 44 }}>{c.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {resultsTab === "measurements" && (
                <motion.div key="measurements" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
                  className="px-5 flex flex-col gap-4"
                >
                  {/* Body shape */}
                  <div className="p-4 rounded-2xl" style={{ background: "linear-gradient(135deg, rgba(169,139,227,0.12), rgba(205,183,246,0.12))", border: "1.5px solid var(--border)" }}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent)" }}>
                        <span style={{ fontSize: "1.1rem" }}>🧍</span>
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>Body shape</p>
                        <p style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 700, color: "var(--foreground)" }}>{AI_RESULTS.bodyShape}</p>
                      </div>
                    </div>
                    <p className="text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>{AI_RESULTS.styleAdvice}</p>
                  </div>

                  {/* Measurements grid */}
                  <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                      <p className="text-sm" style={{ fontFamily: "var(--font-body)", fontWeight: 600, color: "var(--foreground)" }}>Estimated Measurements</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>AI estimates — you can edit these in your profile</p>
                    </div>
                    <div className="grid grid-cols-2">
                      {Object.entries(AI_RESULTS.measurements).map(([key, value], i, arr) => (
                        <div key={key} className="px-4 py-3" style={{ borderBottom: i < arr.length - 2 ? "1px solid var(--border)" : "none", borderRight: i % 2 === 0 ? "1px solid var(--border)" : "none" }}>
                          <p className="text-xs capitalize" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>{key}</p>
                          <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--foreground)", fontSize: "1rem", marginTop: 2 }}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sizes */}
                  <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                      <p className="text-sm" style={{ fontFamily: "var(--font-body)", fontWeight: 600, color: "var(--foreground)" }}>Your Sizes</p>
                    </div>
                    <div className="flex">
                      {Object.entries(AI_RESULTS.sizes).map(([key, value], i, arr) => (
                        <div key={key} className="flex-1 px-4 py-3 text-center" style={{ borderRight: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                          <p className="text-xs capitalize" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>{key}</p>
                          <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--accent)", fontSize: "1.2rem", marginTop: 2 }}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="px-5 mt-6">
              <button
                onClick={onComplete}
                className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-sm"
                style={{ background: "linear-gradient(135deg, var(--accent), #7e5fbf)", color: "white", fontFamily: "var(--font-body)", fontWeight: 700, boxShadow: "0 6px 20px rgba(169,139,227,0.4)" }}
              >
                Enter My Wardrobe <ArrowRight size={17} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
