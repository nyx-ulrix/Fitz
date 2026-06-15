import { useState, useRef } from "react";
import { ArrowLeft, Camera, ImagePlus, Mail, Sparkles, Check, ChevronDown, X, Images, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../lib/AuthContext";
import { api } from "../lib/api";
import { readImage } from "../lib/images";
import {
  nameFromFile,
  uploadGarmentImage,
  validateGarmentImage,
} from "../lib/wardrobeStorage";

const CATEGORIES = ["Tops", "Bottoms", "Dresses", "Shoes", "Accessories", "Outerwear", "Bags"];
const SEASONS    = ["All seasons", "Spring / Summer", "Autumn / Winter"];
const COLOURS    = [
  { name: "Black",  hex: "#1a1a1a" },
  { name: "White",  hex: "#f5f5f5" },
  { name: "Cream",  hex: "#f5f0e8" },
  { name: "Beige",  hex: "#d4b896" },
  { name: "Camel",  hex: "#c19a6b" },
  { name: "Brown",  hex: "#7c5c3e" },
  { name: "Navy",   hex: "#1e3a5f" },
  { name: "Blue",   hex: "#4a90d9" },
  { name: "Sage",   hex: "#8aab8a" },
  { name: "Green",  hex: "#4a7c59" },
  { name: "Blush",  hex: "#f2b5c0" },
  { name: "Pink",   hex: "#e8789a" },
  { name: "Lilac",  hex: "#c4a8d4" },
  { name: "Purple", hex: "#7e5fbf" },
  { name: "Red",    hex: "#c0392b" },
  { name: "Orange", hex: "#e07b39" },
];

type Method = "photo" | "bulk" | "receipt" | "manual" | null;

interface BulkItem {
  id: string;
  file: File;
  preview: string;
  name: string;
}

interface ItemForm {
  name: string;
  brand: string;
  category: string;
  colour: string;
  season: string;
  price: string;
  notes: string;
}

interface AddItemScreenProps {
  onBack: () => void;
}

export function AddItemScreen({ onBack }: AddItemScreenProps) {
  const [method, setMethod] = useState<Method>(null);
  const [form, setForm] = useState<ItemForm>({
    name: "", brand: "", category: "", colour: "", season: "", price: "", notes: "",
  });
  const { token, profile } = useAuth();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const bulkInputRef = useRef<HTMLInputElement>(null);
  const manualImageRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [manualImageFile, setManualImageFile] = useState<File | null>(null);
  const [manualImagePreview, setManualImagePreview] = useState("");
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
  const [bulkCategory, setBulkCategory] = useState("Tops");
  const [aiTagging, setAiTagging] = useState(false);
  const [aiTagged, setAiTagged]   = useState(false);
  const [saved, setSaved]         = useState(false);
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showSeasonPicker, setShowSeasonPicker]     = useState(false);
  const [showBulkCategoryPicker, setShowBulkCategoryPicker] = useState(false);

  const addFilesToBulk = async (files: FileList | File[]) => {
    const list = Array.from(files);
    const next: BulkItem[] = [];
    for (const file of list) {
      const validationError = validateGarmentImage(file);
      if (validationError) {
        setSaveError(validationError);
        continue;
      }
      const preview = await readImage(file);
      next.push({
        id: crypto.randomUUID(),
        file,
        preview,
        name: nameFromFile(file) || "Wardrobe item",
      });
    }
    if (next.length) {
      setSaveError("");
      setBulkItems((current) => [...current, ...next]);
    }
  };

  const handlePhotoFile = async (file?: File) => {
    if (!file) return;
    const validationError = validateGarmentImage(file);
    if (validationError) {
      setSaveError(validationError);
      return;
    }
    setSaveError("");
    setPhotoFile(file);
    setPhotoPreview(await readImage(file));
    setAiTagging(true);
    setAiTagged(false);
    setTimeout(() => {
      setForm((f) => ({
        ...f,
        name: nameFromFile(file) || f.name || "Wardrobe item",
        brand: f.brand,
        category: f.category || "Tops",
        colour: f.colour,
        season: f.season || "All seasons",
        price: f.price,
      }));
      setAiTagging(false);
      setAiTagged(true);
    }, 800);
  };

  const buildWardrobePayload = (imageUrl?: string) => ({
    name: form.name,
    brand: form.brand,
    category: form.category.toLowerCase(),
    colour: form.colour,
    season: form.season,
    price: parseFloat(form.price) || 0,
    notes: form.notes,
    ...(imageUrl
      ? { image_url: imageUrl, img: imageUrl }
      : {}),
  });

  const handleSave = async () => {
    if (!token || !profile?.id) return;
    setSaving(true);
    setSaveError("");
    try {
      let imageUrl: string | undefined;
      const imageFile = method === "photo" ? photoFile : manualImageFile;
      if (imageFile) {
        imageUrl = await uploadGarmentImage(profile.id, imageFile);
      }
      await api.addWardrobeItem(token, buildWardrobePayload(imageUrl));
      setSaved(true);
      setTimeout(onBack, 1400);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save item");
    } finally {
      setSaving(false);
    }
  };

  const handleBulkSave = async () => {
    if (!token || !profile?.id || bulkItems.length === 0) return;
    setSaving(true);
    setSaveError("");
    try {
      for (const item of bulkItems) {
        const imageUrl = await uploadGarmentImage(profile.id, item.file);
        await api.addWardrobeItem(token, {
          name: item.name.trim() || nameFromFile(item.file) || "Wardrobe item",
          brand: "",
          category: bulkCategory.toLowerCase(),
          colour: "",
          season: "All seasons",
          price: 0,
          notes: "",
          image_url: imageUrl,
          img: imageUrl,
        });
      }
      setSaved(true);
      setTimeout(onBack, 1400);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save items");
    } finally {
      setSaving(false);
    }
  };

  const canSave = form.name.trim() && form.category;

  // ── METHOD SELECTION ──────────────────────────────────────
  if (!method) {
    return (
      <div className="flex flex-col pb-8">
        <div className="px-5 pt-6 pb-4 flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <ArrowLeft size={17} style={{ color: "var(--foreground)" }} />
          </button>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "var(--foreground)" }}>
            Add Item
          </h1>
        </div>

        <div className="px-5 flex flex-col gap-4">
          <p className="text-sm" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>
            How would you like to add this item?
          </p>

          {/* Photo upload */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setMethod("photo")}
            className="w-full text-left rounded-3xl overflow-hidden"
            style={{ background: "var(--card)", border: "1.5px solid var(--border)", boxShadow: "0 4px 16px rgba(169,139,227,0.12)" }}
          >
            <div
              className="relative flex items-center justify-center"
              style={{ height: 140, background: "linear-gradient(135deg, var(--secondary), var(--muted))" }}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.5)" }}>
                  <Camera size={26} style={{ color: "var(--foreground)" }} />
                </div>
                <span className="text-sm" style={{ fontFamily: "var(--font-body)", fontWeight: 600, color: "var(--foreground)" }}>Take or Upload Photo</span>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={13} style={{ color: "var(--accent)" }} />
                <p className="text-xs" style={{ fontFamily: "var(--font-body)", fontWeight: 600, color: "var(--accent)" }}>AI-powered</p>
              </div>
              <p className="text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", lineHeight: 1.5 }}>
                Take a photo or upload from your camera roll. AI automatically removes the background, tags the colour, category, and brand.
              </p>
            </div>
          </motion.button>

          {/* Multiple photos */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setMethod("bulk")}
            className="w-full text-left rounded-3xl overflow-hidden"
            style={{ background: "var(--card)", border: "1.5px solid var(--border)", boxShadow: "0 4px 16px rgba(169,139,227,0.12)" }}
          >
            <div
              className="relative flex items-center justify-center"
              style={{ height: 140, background: "linear-gradient(135deg, var(--muted), var(--secondary))" }}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.5)" }}>
                  <Images size={26} style={{ color: "var(--foreground)" }} />
                </div>
                <span className="text-sm" style={{ fontFamily: "var(--font-body)", fontWeight: 600, color: "var(--foreground)" }}>Upload Multiple Photos</span>
              </div>
            </div>
            <div className="p-4">
              <p className="text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", lineHeight: 1.5 }}>
                Select several clothing photos at once. Each image becomes its own wardrobe item.
              </p>
            </div>
          </motion.button>

          {/* Email receipt */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setMethod("receipt")}
            className="w-full text-left p-4 rounded-3xl flex items-center gap-4"
            style={{ background: "var(--card)", border: "1.5px solid var(--border)", boxShadow: "0 4px 16px rgba(169,139,227,0.08)" }}
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--secondary)" }}>
              <Mail size={24} style={{ color: "var(--foreground)" }} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm" style={{ fontFamily: "var(--font-body)", fontWeight: 600, color: "var(--foreground)" }}>Sync from Receipt</p>
              <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", lineHeight: 1.5 }}>
                Forward your order confirmation email to <span style={{ color: "var(--accent)", fontWeight: 600 }}>add@wardrobeapp.com</span> — we'll extract the item details automatically.
              </p>
            </div>
          </motion.button>

          {/* Manual */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setMethod("manual")}
            className="w-full text-left p-4 rounded-3xl flex items-center gap-4"
            style={{ background: "var(--card)", border: "1.5px solid var(--border)", boxShadow: "0 4px 16px rgba(169,139,227,0.08)" }}
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--secondary)" }}>
              <ImagePlus size={24} style={{ color: "var(--foreground)" }} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm" style={{ fontFamily: "var(--font-body)", fontWeight: 600, color: "var(--foreground)" }}>Add Manually</p>
              <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", lineHeight: 1.5 }}>
                Enter the item name, brand, colour, category, and price yourself.
              </p>
            </div>
          </motion.button>
        </div>
      </div>
    );
  }

  // ── RECEIPT METHOD ─────────────────────────────────────────
  if (method === "receipt") {
    return (
      <div className="flex flex-col pb-8">
        <div className="px-5 pt-6 pb-4 flex items-center gap-3">
          <button onClick={() => setMethod(null)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <ArrowLeft size={17} style={{ color: "var(--foreground)" }} />
          </button>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "var(--foreground)" }}>Sync Receipt</h1>
        </div>

        <div className="px-5 flex flex-col gap-4">
          {/* Privacy note */}
          <div className="p-4 rounded-2xl flex items-start gap-3" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
            <Sparkles size={15} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1 }} />
            <p className="text-xs" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
              <strong>Privacy first.</strong> We only read the receipts you forward — we never scan your inbox. Your data is processed securely and never shared.
            </p>
          </div>

          {/* Option 1 — forward email */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
            <div className="p-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <p className="text-sm" style={{ fontFamily: "var(--font-body)", fontWeight: 600, color: "var(--foreground)" }}>Option 1 — Forward a receipt</p>
              <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", lineHeight: 1.5 }}>
                Forward any order confirmation email to the address below. We'll parse the item details and add them to your wardrobe automatically.
              </p>
            </div>
            <div className="p-4 flex items-center justify-between gap-3">
              <div
                className="flex-1 px-3 py-2.5 rounded-xl"
                style={{ background: "var(--background)", border: "1px solid var(--border)" }}
              >
                <p style={{ fontFamily: "var(--font-body)", fontWeight: 700, color: "var(--accent)", fontSize: "0.85rem" }}>add@wardrobeapp.com</p>
              </div>
              <button
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs flex-shrink-0"
                style={{ background: "var(--primary)", color: "var(--primary-foreground)", fontFamily: "var(--font-body)", fontWeight: 600 }}
              >
                <Mail size={12} /> Copy
              </button>
            </div>
          </div>

          {/* Option 2 — inbox sync */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
            <div className="p-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <p className="text-sm" style={{ fontFamily: "var(--font-body)", fontWeight: 600, color: "var(--foreground)" }}>Option 2 — Connect inbox</p>
              <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", lineHeight: 1.5 }}>
                Grant one-time access to your inbox to auto-detect order emails from supported retailers.
              </p>
            </div>
            <div className="p-4 flex flex-col gap-2">
              {["Gmail", "Outlook", "Apple Mail"].map((provider) => (
                <button
                  key={provider}
                  className="flex items-center justify-between px-4 py-3 rounded-xl text-sm"
                  style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)", fontFamily: "var(--font-body)", fontWeight: 500 }}
                >
                  {provider}
                  <ChevronDown size={14} style={{ color: "var(--muted-foreground)", transform: "rotate(-90deg)" }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── BULK UPLOAD ────────────────────────────────────────────
  if (method === "bulk") {
    return (
      <div className="flex flex-col pb-8">
        <div className="px-5 pt-6 pb-4 flex items-center gap-3">
          <button onClick={() => setMethod(null)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <ArrowLeft size={17} style={{ color: "var(--foreground)" }} />
          </button>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "var(--foreground)" }}>
            Upload Multiple
          </h1>
        </div>

        <div className="px-5 flex flex-col gap-4">
          <input
            ref={bulkInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              void addFilesToBulk(e.target.files ?? []);
              e.target.value = "";
            }}
          />

          <button
            onClick={() => bulkInputRef.current?.click()}
            className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-sm"
            style={{ background: "linear-gradient(135deg, var(--accent), #7e5fbf)", color: "white", fontFamily: "var(--font-body)", fontWeight: 700 }}
          >
            <Images size={18} /> Choose Photos
          </button>

          <button
            className="rounded-2xl p-4 flex items-center justify-between text-left w-full"
            style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}
            onClick={() => setShowBulkCategoryPicker(true)}
          >
            <div>
              <p className="text-xs mb-1" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Category for all items
              </p>
              <p className="text-sm" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>{bulkCategory}</p>
            </div>
            <ChevronDown size={16} style={{ color: "var(--muted-foreground)" }} />
          </button>

          {bulkItems.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {bulkItems.map((item) => (
                <div key={item.id} className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                  <div className="relative" style={{ height: 120 }}>
                    <img src={item.preview} alt={item.name} className="w-full h-full object-cover" />
                    <button
                      onClick={() => setBulkItems((current) => current.filter((entry) => entry.id !== item.id))}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(255,255,255,0.9)" }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="p-3">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) =>
                        setBulkItems((current) =>
                          current.map((entry) =>
                            entry.id === item.id ? { ...entry, name: e.target.value } : entry,
                          ),
                        )
                      }
                      className="w-full bg-transparent outline-none text-xs"
                      style={{ color: "var(--foreground)", fontFamily: "var(--font-body)", fontWeight: 600 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {saveError && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl" style={{ background: "rgba(232,93,135,0.1)", border: "1px solid rgba(232,93,135,0.3)" }}>
              <AlertCircle size={16} style={{ color: "#e85d87", flexShrink: 0, marginTop: 1 }} />
              <p className="text-xs" style={{ color: "#e85d87", fontFamily: "var(--font-body)" }}>{saveError}</p>
            </div>
          )}

          {saved ? (
            <div className="w-full py-4 rounded-full flex items-center justify-center gap-2" style={{ background: "#dcfce7" }}>
              <Check size={18} style={{ color: "#16a34a" }} />
              <span style={{ fontFamily: "var(--font-body)", fontWeight: 600, color: "#16a34a" }}>Added to wardrobe!</span>
            </div>
          ) : (
            <button
              onClick={() => void handleBulkSave()}
              disabled={bulkItems.length === 0 || saving}
              className="w-full py-4 rounded-full text-sm"
              style={{
                background: bulkItems.length > 0 && !saving ? "linear-gradient(135deg, var(--accent), #7e5fbf)" : "var(--muted)",
                color: bulkItems.length > 0 && !saving ? "white" : "var(--muted-foreground)",
                fontFamily: "var(--font-body)", fontWeight: 700,
              }}
            >
              {saving ? "Uploading…" : `Add ${bulkItems.length} item${bulkItems.length === 1 ? "" : "s"} to wardrobe`}
            </button>
          )}
        </div>

        <AnimatePresence>
          {showBulkCategoryPicker && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-30" style={{ background: "rgba(75,59,97,0.4)", backdropFilter: "blur(4px)" }}
                onClick={() => setShowBulkCategoryPicker(false)}
              />
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 26, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-40 rounded-t-3xl p-5"
                style={{ background: "var(--card)" }}
              >
                <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "var(--border)" }} />
                <div className="flex flex-col gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => { setBulkCategory(cat); setShowBulkCategoryPicker(false); }}
                      className="flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm"
                      style={{
                        background: bulkCategory === cat ? "var(--primary)" : "var(--background)",
                        color: bulkCategory === cat ? "var(--primary-foreground)" : "var(--foreground)",
                        fontFamily: "var(--font-body)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {cat}
                      {bulkCategory === cat && <Check size={15} />}
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── PHOTO / MANUAL FORM ────────────────────────────────────
  return (
    <div className="flex flex-col pb-8">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => setMethod(null)} className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <ArrowLeft size={17} style={{ color: "var(--foreground)" }} />
        </button>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "var(--foreground)" }}>
          {method === "photo" ? "Photo Import" : "Add Manually"}
        </h1>
      </div>

      <div className="px-5 flex flex-col gap-4">

        {/* Photo upload zone */}
        {method === "photo" && (
          <>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => void handlePhotoFile(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="relative flex items-center justify-center rounded-3xl overflow-hidden w-full"
              style={{ height: 200, background: "var(--card)", border: "2px dashed var(--accent)" }}
            >
            {aiTagging ? (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-3"
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "var(--secondary)" }}>
                  <Sparkles size={20} style={{ color: "var(--accent)", animation: "spin 1.2s linear infinite" }} />
                </div>
                <p className="text-sm" style={{ fontFamily: "var(--font-body)", color: "var(--muted-foreground)" }}>AI analysing photo…</p>
                <p className="text-xs" style={{ fontFamily: "var(--font-body)", color: "var(--muted-foreground)" }}>Removing background · Tagging details</p>
              </motion.div>
            ) : aiTagged && photoPreview ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full h-full relative">
                <img src={photoPreview} alt="Selected garment" className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" style={{ background: "rgba(75,59,97,0.35)" }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "var(--accent)" }}>
                    <Check size={22} color="white" />
                  </div>
                  <p className="text-sm text-white" style={{ fontFamily: "var(--font-body)", fontWeight: 600 }}>Photo selected</p>
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "var(--secondary)" }}>
                  <Camera size={26} style={{ color: "var(--foreground)" }} />
                </div>
                <p className="text-sm" style={{ fontFamily: "var(--font-body)", color: "var(--muted-foreground)" }}>Tap to take or upload a photo</p>
              </div>
            )}
            </button>
          </>
        )}

        {method === "manual" && (
          <>
            <input
              ref={manualImageRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const validationError = validateGarmentImage(file);
                if (validationError) {
                  setSaveError(validationError);
                  return;
                }
                setSaveError("");
                setManualImageFile(file);
                void readImage(file).then(setManualImagePreview);
              }}
            />
            <button
              type="button"
              onClick={() => manualImageRef.current?.click()}
              className="relative flex items-center justify-center rounded-3xl overflow-hidden w-full"
              style={{ height: 160, background: "var(--card)", border: "2px dashed var(--border)" }}
            >
              {manualImagePreview ? (
                <img src={manualImagePreview} alt="Item" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <ImagePlus size={24} style={{ color: "var(--muted-foreground)" }} />
                  <p className="text-sm" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>Add a photo (optional)</p>
                </div>
              )}
            </button>
          </>
        )}

        {/* AI tag banner */}
        {aiTagged && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl"
            style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}
          >
            <Sparkles size={14} style={{ color: "var(--accent)" }} />
            <p className="text-xs flex-1" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>
              AI auto-filled the details below. Review and edit before saving.
            </p>
          </motion.div>
        )}

        {/* ── FORM FIELDS ── */}
        <div className="flex flex-col gap-3">

          {/* Name */}
          <div className="rounded-2xl p-4" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
            <p className="text-xs mb-2" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Item Name *
            </p>
            <input
              type="text"
              placeholder="e.g. Oversized Blazer"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full bg-transparent outline-none text-sm"
              style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}
            />
          </div>

          {/* Brand */}
          <div className="rounded-2xl p-4" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
            <p className="text-xs mb-2" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Brand
            </p>
            <input
              type="text"
              placeholder="e.g. Arket"
              value={form.brand}
              onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
              className="w-full bg-transparent outline-none text-sm"
              style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}
            />
          </div>

          {/* Category picker */}
          <button
            className="rounded-2xl p-4 flex items-center justify-between text-left w-full"
            style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}
            onClick={() => setShowCategoryPicker(true)}
          >
            <div>
              <p className="text-xs mb-1" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Category *
              </p>
              <p className="text-sm" style={{ color: form.category ? "var(--foreground)" : "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>
                {form.category || "Select category"}
              </p>
            </div>
            <ChevronDown size={16} style={{ color: "var(--muted-foreground)" }} />
          </button>

          {/* Colour swatches */}
          <div className="rounded-2xl p-4" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
            <p className="text-xs mb-3" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Colour
            </p>
            <div className="flex flex-wrap gap-2.5">
              {COLOURS.map((c) => {
                const isSelected = form.colour === c.name;
                return (
                  <button
                    key={c.name}
                    onClick={() => setForm((f) => ({ ...f, colour: c.name }))}
                    className="flex flex-col items-center gap-1"
                    title={c.name}
                  >
                    <div
                      className="w-8 h-8 rounded-full transition-transform"
                      style={{
                        background: c.hex,
                        border: isSelected ? "2.5px solid var(--accent)" : "2px solid var(--border)",
                        transform: isSelected ? "scale(1.18)" : "scale(1)",
                        boxShadow: isSelected ? "0 2px 8px rgba(169,139,227,0.4)" : "none",
                      }}
                    />
                    {isSelected && <span className="text-xs" style={{ color: "var(--accent)", fontFamily: "var(--font-body)", fontSize: "0.6rem" }}>{c.name}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Season picker */}
          <button
            className="rounded-2xl p-4 flex items-center justify-between text-left w-full"
            style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}
            onClick={() => setShowSeasonPicker(true)}
          >
            <div>
              <p className="text-xs mb-1" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Season
              </p>
              <p className="text-sm" style={{ color: form.season ? "var(--foreground)" : "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>
                {form.season || "Select season"}
              </p>
            </div>
            <ChevronDown size={16} style={{ color: "var(--muted-foreground)" }} />
          </button>

          {/* Price */}
          <div className="rounded-2xl p-4" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
            <p className="text-xs mb-2" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Price Paid (£)
            </p>
            <input
              type="number"
              placeholder="0.00"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              className="w-full bg-transparent outline-none text-sm"
              style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}
            />
          </div>

          {/* Notes */}
          <div className="rounded-2xl p-4" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
            <p className="text-xs mb-2" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Notes
            </p>
            <textarea
              rows={2}
              placeholder="e.g. Runs small, size up — or styling notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full bg-transparent outline-none text-sm resize-none"
              style={{ color: "var(--foreground)", fontFamily: "var(--font-body)", lineHeight: 1.5 }}
            />
          </div>
        </div>

        {saveError && (
          <div className="flex items-start gap-2 px-4 py-3 rounded-xl" style={{ background: "rgba(232,93,135,0.1)", border: "1px solid rgba(232,93,135,0.3)" }}>
            <AlertCircle size={16} style={{ color: "#e85d87", flexShrink: 0, marginTop: 1 }} />
            <p className="text-xs" style={{ color: "#e85d87", fontFamily: "var(--font-body)" }}>{saveError}</p>
          </div>
        )}

        {/* Save button */}
        <AnimatePresence mode="wait">
          {saved ? (
            <motion.div
              key="saved"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="w-full py-4 rounded-full flex items-center justify-center gap-2"
              style={{ background: "#dcfce7" }}
            >
              <Check size={18} style={{ color: "#16a34a" }} />
              <span style={{ fontFamily: "var(--font-body)", fontWeight: 600, color: "#16a34a" }}>Saved to wardrobe!</span>
            </motion.div>
          ) : (
            <motion.button
              key="save"
              onClick={() => void handleSave()}
              disabled={!canSave || saving}
              className="w-full py-4 rounded-full text-sm transition-all"
              style={{
                background: canSave && !saving ? "linear-gradient(135deg, var(--accent), #7e5fbf)" : "var(--muted)",
                color: canSave && !saving ? "white" : "var(--muted-foreground)",
                fontFamily: "var(--font-body)", fontWeight: 700,
                boxShadow: canSave && !saving ? "0 6px 20px rgba(169,139,227,0.4)" : "none",
              }}
            >
              {saving ? "Saving…" : "Save to Wardrobe"}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Category bottom sheet */}
      <AnimatePresence>
        {showCategoryPicker && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-30" style={{ background: "rgba(75,59,97,0.4)", backdropFilter: "blur(4px)" }}
              onClick={() => setShowCategoryPicker(false)}
            />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-40 rounded-t-3xl p-5"
              style={{ background: "var(--card)" }}
            >
              <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "var(--border)" }} />
              <div className="flex items-center justify-between mb-4">
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", color: "var(--foreground)" }}>Category</h2>
                <button onClick={() => setShowCategoryPicker(false)}><X size={18} style={{ color: "var(--muted-foreground)" }} /></button>
              </div>
              <div className="flex flex-col gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { setForm((f) => ({ ...f, category: cat })); setShowCategoryPicker(false); }}
                    className="flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm"
                    style={{
                      background: form.category === cat ? "var(--primary)" : "var(--background)",
                      color: form.category === cat ? "var(--primary-foreground)" : "var(--foreground)",
                      fontFamily: "var(--font-body)", fontWeight: form.category === cat ? 600 : 400,
                      border: "1px solid var(--border)",
                    }}
                  >
                    {cat}
                    {form.category === cat && <Check size={15} />}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Season bottom sheet */}
      <AnimatePresence>
        {showSeasonPicker && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-30" style={{ background: "rgba(75,59,97,0.4)", backdropFilter: "blur(4px)" }}
              onClick={() => setShowSeasonPicker(false)}
            />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-40 rounded-t-3xl p-5"
              style={{ background: "var(--card)" }}
            >
              <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "var(--border)" }} />
              <div className="flex items-center justify-between mb-4">
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", color: "var(--foreground)" }}>Season</h2>
                <button onClick={() => setShowSeasonPicker(false)}><X size={18} style={{ color: "var(--muted-foreground)" }} /></button>
              </div>
              <div className="flex flex-col gap-2">
                {SEASONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setForm((f) => ({ ...f, season: s })); setShowSeasonPicker(false); }}
                    className="flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm"
                    style={{
                      background: form.season === s ? "var(--primary)" : "var(--background)",
                      color: form.season === s ? "var(--primary-foreground)" : "var(--foreground)",
                      fontFamily: "var(--font-body)", fontWeight: form.season === s ? 600 : 400,
                      border: "1px solid var(--border)",
                    }}
                  >
                    {s}
                    {form.season === s && <Check size={15} />}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
