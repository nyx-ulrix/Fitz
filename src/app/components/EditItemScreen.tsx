import { useRef, useState } from "react";
import { ArrowLeft, Check, ChevronDown, ImagePlus, Trash2, X, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../lib/AuthContext";
import { api } from "../lib/api";
import { readImage } from "../lib/images";
import { uploadGarmentImage, validateGarmentImage } from "../lib/wardrobeStorage";

const CATEGORIES = ["Tops", "Bottoms", "Dresses", "Shoes", "Accessories", "Outerwear", "Bags"];
const SEASONS = ["All seasons", "Spring / Summer", "Autumn / Winter"];
const COLOURS = [
  { name: "Black", hex: "#1a1a1a" },
  { name: "White", hex: "#f5f5f5" },
  { name: "Cream", hex: "#f5f0e8" },
  { name: "Beige", hex: "#d4b896" },
  { name: "Camel", hex: "#c19a6b" },
  { name: "Brown", hex: "#7c5c3e" },
  { name: "Navy", hex: "#1e3a5f" },
  { name: "Blue", hex: "#4a90d9" },
  { name: "Sage", hex: "#8aab8a" },
  { name: "Green", hex: "#4a7c59" },
  { name: "Blush", hex: "#f2b5c0" },
  { name: "Pink", hex: "#e8789a" },
  { name: "Lilac", hex: "#c4a8d4" },
  { name: "Purple", hex: "#7e5fbf" },
  { name: "Red", hex: "#c0392b" },
  { name: "Orange", hex: "#e07b39" },
];

export type EditableWardrobeItem = {
  id: string;
  name: string;
  brand: string;
  category: string;
  colour: string;
  season: string;
  price: number;
  worn: number;
  notes?: string;
  img?: string;
};

type EditItemScreenProps = {
  item: EditableWardrobeItem;
  onClose: () => void;
  onUpdated: (item: EditableWardrobeItem) => void;
  onDeleted: (id: string) => void;
};

function categoryIdToLabel(categoryId: string) {
  const label = CATEGORIES.find(
    (cat) => cat.toLowerCase() === categoryId.toLowerCase(),
  );
  return label ?? "Tops";
}

export function EditItemScreen({
  item,
  onClose,
  onUpdated,
  onDeleted,
}: EditItemScreenProps) {
  const { token, profile } = useAuth();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(item.name);
  const [brand, setBrand] = useState(item.brand === "Wardrobe" ? "" : item.brand);
  const [category, setCategory] = useState(categoryIdToLabel(item.category));
  const [colour, setColour] = useState(item.colour);
  const [season, setSeason] = useState(item.season || "All seasons");
  const [price, setPrice] = useState(item.price ? String(item.price) : "");
  const [notes, setNotes] = useState(item.notes ?? "");
  const [imagePreview, setImagePreview] = useState(item.img ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showSeasonPicker, setShowSeasonPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const canSave = name.trim() && category;

  const handleImageChange = async (file?: File) => {
    if (!file) return;
    const validationError = validateGarmentImage(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setImageFile(file);
    setImagePreview(await readImage(file));
  };

  const handleSave = async () => {
    if (!token || !canSave) return;
    setSaving(true);
    setError("");
    try {
      let imageUrl = item.img;
      if (imageFile && profile?.id) {
        imageUrl = await uploadGarmentImage(profile.id, imageFile);
      }

      const updates = {
        name: name.trim(),
        brand: brand.trim(),
        category: category.toLowerCase(),
        colour,
        season,
        price: parseFloat(price) || 0,
        notes,
        ...(imageUrl
          ? { image_url: imageUrl, img: imageUrl }
          : {}),
      };

      await api.updateWardrobeItem(token, item.id, updates);

      const updated: EditableWardrobeItem = {
        ...item,
        name: updates.name,
        brand: updates.brand || "Wardrobe",
        category: updates.category,
        colour: updates.colour,
        season: updates.season,
        price: updates.price,
        notes: updates.notes,
        img: imageUrl,
      };

      setSaved(true);
      onUpdated(updated);
      setTimeout(onClose, 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!token) return;
    const confirmed = window.confirm(`Remove "${name}" from your wardrobe?`);
    if (!confirmed) return;

    setDeleting(true);
    setError("");
    try {
      await api.deleteWardrobeItem(token, item.id);
      onDeleted(item.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete item");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "var(--background)" }}
    >
      <div className="px-5 pt-6 pb-4 flex items-center gap-3 flex-shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <ArrowLeft size={16} style={{ color: "var(--foreground)" }} />
        </button>
        <div className="flex-1 min-w-0">
          <h1
            className="truncate"
            style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700, color: "var(--foreground)" }}
          >
            Edit item
          </h1>
          <p className="text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>
            Update details for this wardrobe piece
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8 flex flex-col gap-4">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void handleImageChange(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          className="relative flex items-center justify-center rounded-3xl overflow-hidden w-full"
          style={{ height: 180, background: "var(--card)", border: "1.5px solid var(--border)" }}
        >
          {imagePreview ? (
            <img src={imagePreview} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <ImagePlus size={24} style={{ color: "var(--muted-foreground)" }} />
              <p className="text-sm" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>
                Add or change photo
              </p>
            </div>
          )}
        </button>

        <div className="rounded-2xl p-4" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
          <p className="text-xs mb-2" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Item name *
          </p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-transparent outline-none text-sm"
            style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}
          />
        </div>

        <div className="rounded-2xl p-4" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
          <p className="text-xs mb-2" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Brand
          </p>
          <input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="e.g. Arket"
            className="w-full bg-transparent outline-none text-sm"
            style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}
          />
        </div>

        <button
          type="button"
          className="rounded-2xl p-4 flex items-center justify-between text-left w-full"
          style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}
          onClick={() => setShowCategoryPicker(true)}
        >
          <div>
            <p className="text-xs mb-1" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Category *
            </p>
            <p className="text-sm" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>
              {category}
            </p>
          </div>
          <ChevronDown size={16} style={{ color: "var(--muted-foreground)" }} />
        </button>

        <div className="rounded-2xl p-4" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
          <p className="text-xs mb-3" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Colour
          </p>
          <div className="flex flex-wrap gap-2.5">
            {COLOURS.map((c) => {
              const isSelected = colour === c.name;
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setColour(c.name)}
                  title={c.name}
                >
                  <div
                    className="w-8 h-8 rounded-full"
                    style={{
                      background: c.hex,
                      border: isSelected ? "2.5px solid var(--accent)" : "2px solid var(--border)",
                      transform: isSelected ? "scale(1.12)" : "scale(1)",
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          className="rounded-2xl p-4 flex items-center justify-between text-left w-full"
          style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}
          onClick={() => setShowSeasonPicker(true)}
        >
          <div>
            <p className="text-xs mb-1" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Season
            </p>
            <p className="text-sm" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>
              {season}
            </p>
          </div>
          <ChevronDown size={16} style={{ color: "var(--muted-foreground)" }} />
        </button>

        <div className="rounded-2xl p-4" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
          <p className="text-xs mb-2" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Price paid (£)
          </p>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full bg-transparent outline-none text-sm"
            style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}
          />
        </div>

        <div className="rounded-2xl p-4" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
          <p className="text-xs mb-2" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Notes
          </p>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Fit notes, styling ideas…"
            className="w-full bg-transparent outline-none text-sm resize-none"
            style={{ color: "var(--foreground)", fontFamily: "var(--font-body)", lineHeight: 1.5 }}
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 px-4 py-3 rounded-xl" style={{ background: "rgba(232,93,135,0.1)", border: "1px solid rgba(232,93,135,0.3)" }}>
            <AlertCircle size={16} style={{ color: "#e85d87", flexShrink: 0, marginTop: 1 }} />
            <p className="text-xs" style={{ color: "#e85d87", fontFamily: "var(--font-body)" }}>{error}</p>
          </div>
        )}

        {saved ? (
          <div className="w-full py-4 rounded-full flex items-center justify-center gap-2" style={{ background: "#dcfce7" }}>
            <Check size={18} style={{ color: "#16a34a" }} />
            <span style={{ fontFamily: "var(--font-body)", fontWeight: 600, color: "#16a34a" }}>Changes saved</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!canSave || saving || deleting}
            className="w-full py-4 rounded-full text-sm"
            style={{
              background: canSave && !saving ? "linear-gradient(135deg, var(--accent), #7e5fbf)" : "var(--muted)",
              color: canSave && !saving ? "white" : "var(--muted-foreground)",
              fontFamily: "var(--font-body)",
              fontWeight: 700,
            }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        )}

        <button
          type="button"
          onClick={() => void handleDelete()}
          disabled={saving || deleting}
          className="w-full py-3.5 rounded-full text-sm flex items-center justify-center gap-2"
          style={{
            background: "rgba(232,93,135,0.08)",
            color: "#e85d87",
            fontFamily: "var(--font-body)",
            fontWeight: 600,
            border: "1px solid rgba(232,93,135,0.25)",
          }}
        >
          <Trash2 size={15} />
          {deleting ? "Removing…" : "Remove from wardrobe"}
        </button>
      </div>

      <AnimatePresence>
        {showCategoryPicker && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60]"
              style={{ background: "rgba(75,59,97,0.4)", backdropFilter: "blur(4px)" }}
              onClick={() => setShowCategoryPicker(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-3xl p-5"
              style={{ background: "var(--card)" }}
            >
              <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "var(--border)" }} />
              <div className="flex items-center justify-between mb-4">
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", color: "var(--foreground)" }}>Category</h2>
                <button type="button" onClick={() => setShowCategoryPicker(false)}>
                  <X size={18} style={{ color: "var(--muted-foreground)" }} />
                </button>
              </div>
              <div className="flex flex-col gap-2 pb-4">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCategory(cat);
                      setShowCategoryPicker(false);
                    }}
                    className="w-full text-left px-4 py-3 rounded-2xl"
                    style={{
                      background: category === cat ? "var(--secondary)" : "var(--background)",
                      border: category === cat ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
                      fontFamily: "var(--font-body)",
                      color: "var(--foreground)",
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSeasonPicker && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60]"
              style={{ background: "rgba(75,59,97,0.4)", backdropFilter: "blur(4px)" }}
              onClick={() => setShowSeasonPicker(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-3xl p-5"
              style={{ background: "var(--card)" }}
            >
              <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "var(--border)" }} />
              <div className="flex items-center justify-between mb-4">
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", color: "var(--foreground)" }}>Season</h2>
                <button type="button" onClick={() => setShowSeasonPicker(false)}>
                  <X size={18} style={{ color: "var(--muted-foreground)" }} />
                </button>
              </div>
              <div className="flex flex-col gap-2 pb-4">
                {SEASONS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setSeason(value);
                      setShowSeasonPicker(false);
                    }}
                    className="w-full text-left px-4 py-3 rounded-2xl"
                    style={{
                      background: season === value ? "var(--secondary)" : "var(--background)",
                      border: season === value ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
                      fontFamily: "var(--font-body)",
                      color: "var(--foreground)",
                    }}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
