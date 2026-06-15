import { useEffect, useRef, useState } from "react";
import {
  Ruler,
  Palette,
  BookOpen,
  ChevronRight,
  Camera,
  Bell,
  Shield,
  LogOut,
  Pencil,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../lib/AuthContext";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import { appearanceFromProfile } from "../lib/analysisAdapter";
import { readImage } from "../lib/images";
import { uploadGarmentImage, validateGarmentImage } from "../lib/wardrobeStorage";

const EDUCATION_TIPS = [
  { title: "Dressing for your silhouette", tag: "Body Shape", read: true },
  { title: "Warm vs cool skin tones", tag: "Color Theory", read: false },
  { title: "Building a capsule wardrobe", tag: "Minimalism", read: false },
  { title: "The 5-piece French wardrobe", tag: "Style Edit", read: true },
];

const MEASUREMENT_FIELDS = ["height", "bust", "waist", "hips"] as const;
const SIZE_FIELDS = ["top", "bottom", "shoes"] as const;

type ProfileForm = {
  name: string;
  undertone: string;
  season: string;
  skinTone: string;
  bodyShape: string;
  styleAdvice: string;
  measurements: Record<string, string>;
  sizes: Record<string, string>;
};

function emptyForm(): ProfileForm {
  return {
    name: "",
    undertone: "",
    season: "",
    skinTone: "",
    bodyShape: "",
    styleAdvice: "",
    measurements: {},
    sizes: {},
  };
}

function formFromProfile(profile: NonNullable<ReturnType<typeof useAuth>["profile"]>): ProfileForm {
  return {
    name: profile.name ?? "",
    undertone: profile.undertone ?? "",
    season: profile.season ?? "",
    skinTone: profile.skinTone ?? "",
    bodyShape: profile.bodyShape ?? "",
    styleAdvice: profile.styleAdvice ?? "",
    measurements: { ...(profile.measurements ?? {}) },
    sizes: { ...(profile.sizes ?? {}) },
  };
}

interface ProfileScreenProps {
  onSignOut?: () => void;
}

export function ProfileScreen({ onSignOut }: ProfileScreenProps = {}) {
  const { profile, token, signOut, refreshProfile } = useAuth();
  const { setPhotoDataUrl, setAppearanceAnalysis } = useApp();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"sizing" | "color" | "education">("sizing");
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<ProfileForm>(emptyForm());
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setForm(formFromProfile(profile));
    setPhotoPreview(profile.photoUrl ?? "");
    setPhotoFile(null);
  }, [profile]);

  const displayPhoto = photoPreview || profile?.photoUrl;

  const handlePhotoPick = async (file?: File) => {
    if (!file) return;
    const validationError = validateGarmentImage(file);
    if (validationError) {
      setSaveError(validationError);
      return;
    }
    setSaveError("");
    setPhotoFile(file);
    setPhotoPreview(await readImage(file));
  };

  const handleSave = async () => {
    if (!token || !profile?.id) return;
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);
    try {
      let photoUrl = profile.photoUrl;
      if (photoFile) {
        photoUrl = await uploadGarmentImage(profile.id, photoFile);
      }

      const updates = {
        name: form.name.trim(),
        undertone: form.undertone.trim() || undefined,
        season: form.season.trim() || undefined,
        skinTone: form.skinTone.trim() || undefined,
        bodyShape: form.bodyShape.trim() || undefined,
        styleAdvice: form.styleAdvice.trim() || undefined,
        measurements: Object.fromEntries(
          Object.entries(form.measurements).filter(([, value]) => value.trim()),
        ),
        sizes: Object.fromEntries(
          Object.entries(form.sizes).filter(([, value]) => value.trim()),
        ),
        ...(photoUrl ? { photoUrl } : {}),
      };

      await api.updateProfile(token, updates);
      await refreshProfile();
      if (photoUrl) setPhotoDataUrl(photoUrl);
      const analysis = appearanceFromProfile({ ...profile, ...updates });
      if (analysis) setAppearanceAnalysis(analysis);
      setIsEditing(false);
      setPhotoFile(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    onSignOut?.();
  };

  const measurements = MEASUREMENT_FIELDS.map((key) => ({
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    value: profile?.measurements?.[key] ?? "",
  })).filter((entry) => entry.value || isEditing);

  const sizes = SIZE_FIELDS.map((key) => ({
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    value: profile?.sizes?.[key] ?? "",
  })).filter((entry) => entry.value || isEditing);

  const palette = profile?.palette ?? [];
  const avoidColours = profile?.avoidColours ?? [];

  const fieldStyle = {
    background: "var(--background)",
    border: "1px solid var(--border)",
    color: "var(--foreground)",
    fontFamily: "var(--font-body)",
  } as const;

  return (
    <div className="flex flex-col pb-8">
      <input
        ref={photoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => void handlePhotoPick(e.target.files?.[0])}
      />

      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div
              className="rounded-full overflow-hidden flex items-center justify-center"
              style={{ width: 72, height: 72, border: "3px solid var(--accent)", background: "var(--secondary)" }}
            >
              {displayPhoto ? (
                <img src={displayPhoto} alt={profile?.name ?? "Profile"} className="w-full h-full object-cover" />
              ) : (
                <span style={{ fontSize: "1.5rem", color: "var(--accent)", fontWeight: 700, fontFamily: "var(--font-body)" }}>
                  {profile?.name?.[0]?.toUpperCase() ?? "?"}
                </span>
              )}
            </div>
            {isEditing && (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: "var(--accent)" }}
              >
                <Camera size={11} color="white" />
              </button>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={fieldStyle}
                placeholder="Your name"
              />
            ) : (
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 700, color: "var(--foreground)" }}>
                {profile?.name ?? "Your Profile"}
              </h1>
            )}
            <p className="text-sm mt-1 truncate" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>
              {profile?.email ?? ""}
            </p>
            {!isEditing && profile?.undertone && (
              <p className="text-xs mt-0.5" style={{ color: "var(--accent)", fontFamily: "var(--font-body)", fontWeight: 600 }}>
                {profile.undertone} undertone{profile.season ? ` · ${profile.season}` : ""}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              if (isEditing && profile) {
                setForm(formFromProfile(profile));
                setPhotoPreview(profile.photoUrl ?? "");
                setPhotoFile(null);
                setSaveError("");
              }
              setIsEditing((current) => !current);
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            {isEditing ? <X size={16} /> : <Pencil size={15} style={{ color: "var(--accent)" }} />}
          </button>
        </div>

        {isEditing && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex flex-col gap-3">
            {[
              { key: "undertone", label: "Undertone", placeholder: "e.g. Warm" },
              { key: "season", label: "Season palette", placeholder: "e.g. Spring / Autumn" },
              { key: "skinTone", label: "Skin tone", placeholder: "e.g. Medium warm" },
              { key: "bodyShape", label: "Body shape", placeholder: "e.g. Hourglass" },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="rounded-2xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <p className="text-xs mb-2" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {label}
                </p>
                <input
                  type="text"
                  value={form[key as keyof ProfileForm] as string}
                  onChange={(e) => setForm((current) => ({ ...current, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full bg-transparent outline-none text-sm"
                  style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}
                />
              </div>
            ))}

            <div className="rounded-2xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <p className="text-xs mb-2" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Style advice
              </p>
              <textarea
                rows={3}
                value={form.styleAdvice}
                onChange={(e) => setForm((current) => ({ ...current, styleAdvice: e.target.value }))}
                placeholder="Notes about colours and silhouettes that suit you"
                className="w-full bg-transparent outline-none text-sm resize-none"
                style={{ color: "var(--foreground)", fontFamily: "var(--font-body)", lineHeight: 1.5 }}
              />
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <p className="text-sm" style={{ fontFamily: "var(--font-body)", fontWeight: 600, color: "var(--foreground)" }}>Measurements</p>
              </div>
              <div className="grid grid-cols-2 gap-px" style={{ background: "var(--border)" }}>
                {MEASUREMENT_FIELDS.map((key) => (
                  <div key={key} className="p-3" style={{ background: "var(--card)" }}>
                    <p className="text-xs capitalize mb-1" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>{key}</p>
                    <input
                      type="text"
                      value={form.measurements[key] ?? ""}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          measurements: { ...current.measurements, [key]: e.target.value },
                        }))
                      }
                      placeholder="—"
                      className="w-full bg-transparent outline-none text-sm"
                      style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <p className="text-sm" style={{ fontFamily: "var(--font-body)", fontWeight: 600, color: "var(--foreground)" }}>Sizes</p>
              </div>
              <div className="flex">
                {SIZE_FIELDS.map((key, index) => (
                  <div
                    key={key}
                    className="flex-1 px-4 py-3 text-center"
                    style={{ borderRight: index < SIZE_FIELDS.length - 1 ? "1px solid var(--border)" : "none" }}
                  >
                    <p className="text-xs capitalize mb-1" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>{key}</p>
                    <input
                      type="text"
                      value={form.sizes[key] ?? ""}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          sizes: { ...current.sizes, [key]: e.target.value },
                        }))
                      }
                      placeholder="—"
                      className="w-full bg-transparent outline-none text-sm text-center"
                      style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {saveError && (
              <div className="flex items-start gap-2 px-4 py-3 rounded-xl" style={{ background: "rgba(232,93,135,0.1)", border: "1px solid rgba(232,93,135,0.3)" }}>
                <AlertCircle size={16} style={{ color: "#e85d87", flexShrink: 0, marginTop: 1 }} />
                <p className="text-xs" style={{ color: "#e85d87", fontFamily: "var(--font-body)" }}>{saveError}</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || !form.name.trim()}
              className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-sm"
              style={{
                background: form.name.trim() && !saving ? "linear-gradient(135deg, var(--accent), #7e5fbf)" : "var(--muted)",
                color: form.name.trim() && !saving ? "white" : "var(--muted-foreground)",
                fontFamily: "var(--font-body)",
                fontWeight: 700,
              }}
            >
              {saving ? "Saving…" : saveSuccess ? "Saved!" : "Save changes"}
              {!saving && !saveSuccess && <Check size={16} />}
            </button>
          </motion.div>
        )}
      </div>

      {!isEditing && (
        <>
          <div className="px-5 mb-4">
            <div className="flex rounded-2xl p-1" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              {(["sizing", "color", "education"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="flex-1 py-2 rounded-xl text-xs capitalize transition-all"
                  style={{
                    background: activeTab === tab ? "var(--primary)" : "transparent",
                    color: activeTab === tab ? "var(--primary-foreground)" : "var(--muted-foreground)",
                    fontFamily: "var(--font-body)",
                    fontWeight: activeTab === tab ? 600 : 400,
                  }}
                >
                  {tab === "sizing" ? "Smart Sizing" : tab === "color" ? "Color Tone" : "Style Hub"}
                </button>
              ))}
            </div>
          </div>

          <div className="px-5">
            {activeTab === "sizing" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
                <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2 p-4" style={{ borderBottom: "1px solid var(--border)" }}>
                    <Ruler size={15} style={{ color: "var(--accent)" }} />
                    <p className="text-sm" style={{ fontFamily: "var(--font-body)", fontWeight: 600, color: "var(--foreground)" }}>Body Measurements</p>
                  </div>
                  {measurements.length > 0 ? (
                    <div className="grid grid-cols-2 gap-px" style={{ background: "var(--border)" }}>
                      {measurements.map((m) => (
                        <div key={m.key} className="p-3" style={{ background: "var(--card)" }}>
                          <p className="text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>{m.label}</p>
                          <p className="text-sm mt-0.5" style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--foreground)" }}>{m.value}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="p-4 text-sm" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>
                      No measurements yet. Tap the pencil icon to add yours.
                    </p>
                  )}
                </div>

                <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2 p-4" style={{ borderBottom: "1px solid var(--border)" }}>
                    <p className="text-sm" style={{ fontFamily: "var(--font-body)", fontWeight: 600, color: "var(--foreground)" }}>Your Sizes</p>
                  </div>
                  {sizes.length > 0 ? (
                    <div className="flex">
                      {sizes.map((row, index) => (
                        <div
                          key={row.key}
                          className="flex-1 px-4 py-3 text-center"
                          style={{ borderRight: index < sizes.length - 1 ? "1px solid var(--border)" : "none" }}
                        >
                          <p className="text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>{row.label}</p>
                          <p className="text-sm mt-0.5" style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--foreground)" }}>{row.value}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="p-4 text-sm" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>
                      No sizes saved yet.
                    </p>
                  )}
                </div>

                {profile?.bodyShape && (
                  <div className="rounded-2xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <p className="text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>Body shape</p>
                    <p className="text-sm mt-1" style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--foreground)" }}>{profile.bodyShape}</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "color" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
                <div className="rounded-2xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Palette size={15} style={{ color: "var(--accent)" }} />
                    <p className="text-sm" style={{ fontFamily: "var(--font-body)", fontWeight: 600, color: "var(--foreground)" }}>Skin Tone Analysis</p>
                  </div>
                  {profile?.undertone || profile?.styleAdvice ? (
                    <div className="p-3 rounded-xl mb-3" style={{ background: "var(--secondary)" }}>
                      <p className="text-xs" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)", fontWeight: 600 }}>
                        {[profile?.undertone && `${profile.undertone} undertone`, profile?.season].filter(Boolean).join(" · ") || "Colour profile"}
                      </p>
                      {profile?.skinTone && (
                        <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>{profile.skinTone}</p>
                      )}
                      {profile?.styleAdvice && (
                        <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>{profile.styleAdvice}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm mb-3" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>
                      Complete onboarding or edit your profile to add colour analysis.
                    </p>
                  )}
                  {palette.length > 0 && (
                    <>
                      <p className="text-xs mb-2" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>Your best colours</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {palette.map((c) => (
                          <div key={c.name} className="flex flex-col items-center gap-1">
                            <div className="w-8 h-8 rounded-full" style={{ background: c.hex, border: "2px solid var(--border)" }} title={c.name} />
                            <span className="text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", fontSize: "0.6rem" }}>{c.name}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  {avoidColours.length > 0 && (
                    <>
                      <p className="text-xs mb-2" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>Colours to use carefully</p>
                      <div className="flex flex-wrap gap-2">
                        {avoidColours.map((c) => (
                          <div key={c.name} className="flex flex-col items-center gap-1">
                            <div className="w-8 h-8 rounded-full opacity-70" style={{ background: c.hex, border: "2px solid var(--border)" }} title={c.name} />
                            <span className="text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", fontSize: "0.6rem" }}>{c.name}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === "education" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen size={15} style={{ color: "var(--accent)" }} />
                  <p className="text-sm" style={{ fontFamily: "var(--font-body)", fontWeight: 600, color: "var(--foreground)" }}>Fashion Advice Hub</p>
                </div>
                {EDUCATION_TIPS.map((tip, i) => (
                  <motion.div
                    key={tip.title}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="flex items-center gap-3 p-4 rounded-2xl"
                    style={{ background: "var(--card)", border: "1px solid var(--border)", opacity: tip.read ? 0.65 : 1 }}
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--secondary)" }}>
                      <BookOpen size={15} style={{ color: "var(--foreground)" }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm" style={{ fontFamily: "var(--font-body)", fontWeight: 600, color: "var(--foreground)" }}>{tip.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--accent)", fontFamily: "var(--font-body)" }}>{tip.tag}</p>
                    </div>
                    <ChevronRight size={14} style={{ color: "var(--muted-foreground)" }} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </>
      )}

      <div className="px-5 mt-6">
        <p className="text-xs mb-3" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Settings</p>
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          {[
            { icon: Bell, label: "Notifications" },
            { icon: Shield, label: "Privacy & Data" },
            { icon: LogOut, label: "Sign Out" },
          ].map(({ icon: Icon, label }, i, arr) => (
            <button
              key={label}
              type="button"
              onClick={label === "Sign Out" ? () => void handleSignOut() : undefined}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all"
              style={{
                borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                color: label === "Sign Out" ? "#e85d87" : "var(--foreground)",
              }}
            >
              <Icon size={16} style={{ color: label === "Sign Out" ? "#e85d87" : "var(--muted-foreground)" }} />
              <span className="flex-1 text-sm" style={{ fontFamily: "var(--font-body)", fontWeight: 500 }}>{label}</span>
              <ChevronRight size={14} style={{ color: "var(--muted-foreground)" }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
