import { useMemo, useState } from "react";
import { Sparkles, Wand2, RefreshCw, Heart, Share2, ShoppingBag, X, ImageIcon, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useOutfitGeneration } from "../hooks/useOutfitGeneration";
import { useApp } from "../context/AppContext";
import { outfitToDisplay, type DisplayOutfit } from "../lib/outfitDisplay";
import { OutfitTryOnSheet } from "./OutfitTryOnSheet";

const PROMPT_SUGGESTIONS = [
  "Y2K aesthetic with blue jeans",
  "Smart casual for Friday meeting",
  "Cosy autumn layers",
  "Minimalist neutral tones",
];

export function OutfitGeneratorScreen() {
  const { weather } = useApp();
  const {
    outfits: apiOutfits,
    generating,
    error,
    generate,
    selectedOutfitIndex,
    selectOutfit,
    visualizeSelectedOutfit,
    tryOnImage,
    tryOnOutfitName,
    tryOnPieces,
    tryOnNote,
    tryOnLoading,
    clearTryOn,
    hasPhoto,
  } = useOutfitGeneration();

  const [prompt, setPrompt] = useState("");
  const [selectedOutfit, setSelectedOutfit] = useState<DisplayOutfit | null>(null);
  const [shopToggle, setShopToggle] = useState(false);
  const [budget, setBudget] = useState("150");
  const [showBudgetInput, setShowBudgetInput] = useState(false);
  const [liked, setLiked] = useState<number[]>([]);

  const outfits = useMemo(
    () => apiOutfits.map((o, i) => outfitToDisplay(o, i)),
    [apiOutfits],
  );

  const handleGenerate = async () => {
    await generate({
      occasion: prompt.trim() || "Everyday",
      stylePreference: prompt.trim() || "Clean casual",
      shopTheLook: shopToggle,
      budget: Number(budget) || 0,
    });
  };

  const toggleLike = (id: number) => {
    setLiked((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  return (
    <div className="flex flex-col pb-8">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 700, color: "var(--foreground)" }}>
          AI Stylist
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>
          Describe your vibe or occasion
        </p>
      </div>

      {/* Prompt Input */}
      <div className="px-5 mb-4">
        <div
          className="rounded-2xl p-4"
          style={{ background: "var(--card)", boxShadow: "0 4px 16px rgba(169,139,227,0.12)", border: "1px solid var(--border)" }}
        >
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder='e.g. "Give me a Y2K aesthetic using my blue jeans"'
            rows={3}
            className="w-full bg-transparent outline-none text-sm resize-none"
            style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}
          />
          <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
            <div className="flex gap-2 flex-wrap">
              {PROMPT_SUGGESTIONS.slice(0, 2).map((s) => (
                <button
                  key={s}
                  onClick={() => setPrompt(s)}
                  className="text-xs px-3 py-1 rounded-full"
                  style={{ background: "var(--secondary)", color: "var(--foreground)", fontFamily: "var(--font-body)" }}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              onClick={() => void handleGenerate()}
              disabled={generating}
              className="flex items-center gap-2 px-5 py-2 rounded-full text-sm transition-all"
              style={{
                background: generating ? "var(--muted)" : "var(--primary)",
                color: generating ? "var(--muted-foreground)" : "var(--primary-foreground)",
                fontFamily: "var(--font-body)",
                fontWeight: 600,
              }}
            >
              {generating ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Styling…
                </>
              ) : (
                <>
                  <Wand2 size={14} />
                  Generate
                </>
              )}
            </button>
          </div>
        </div>

        {/* Shop Toggle */}
        <div
          className="mt-3 p-4 rounded-2xl flex items-center justify-between"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div>
            <p className="text-sm" style={{ fontFamily: "var(--font-body)", fontWeight: 600, color: "var(--foreground)" }}>
              <ShoppingBag size={14} className="inline mr-1.5" style={{ color: "var(--accent)" }} />
              Shop the Look
            </p>
            <p className="text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>
              Include marketplace items in suggestions
            </p>
          </div>
          <button
            onClick={() => { setShopToggle(!shopToggle); setShowBudgetInput(!shopToggle); }}
            className="w-11 h-6 rounded-full relative transition-all"
            style={{ background: shopToggle ? "var(--accent)" : "var(--muted)" }}
          >
            <div
              className="w-4 h-4 rounded-full absolute top-1 transition-all"
              style={{ background: "white", left: shopToggle ? "calc(100% - 1.25rem)" : "0.25rem" }}
            />
          </button>
        </div>

        {showBudgetInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-2 px-4 py-3 rounded-2xl flex items-center gap-3"
            style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}
          >
            <span className="text-sm" style={{ color: "var(--foreground)", fontFamily: "var(--font-body)" }}>Max budget: £</span>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: "var(--foreground)", fontFamily: "var(--font-body)", fontWeight: 600 }}
            />
          </motion.div>
        )}
      </div>

      {/* Suggestions row */}
      <div className="px-5 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {PROMPT_SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setPrompt(s)}
              className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full"
              style={{
                background: prompt === s ? "var(--primary)" : "var(--card)",
                color: prompt === s ? "var(--primary-foreground)" : "var(--muted-foreground)",
                fontFamily: "var(--font-body)",
                border: "1px solid var(--border)",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Generated Outfits */}
      <div className="px-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={15} style={{ color: "var(--accent)" }} />
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", color: "var(--foreground)" }}>
                {generating ? "Generating outfits…" : "Your Outfits"}
              </h2>
              {!generating && outfits.length > 0 && (
                <p className="text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>
                  Select one outfit to visualize on your photo
                </p>
              )}
            </div>
          </div>
          <button
            className="text-xs px-3 py-1 rounded-full flex items-center gap-1"
            style={{ background: "var(--card)", color: "var(--muted-foreground)", fontFamily: "var(--font-body)", border: "1px solid var(--border)" }}
            onClick={() => void handleGenerate()}
          >
            <RefreshCw size={11} />
            More
          </button>
        </div>

        {error && (
          <p className="px-5 text-xs mb-2" style={{ color: "#e85d87", fontFamily: "var(--font-body)" }}>{error}</p>
        )}

        <div className="flex flex-col gap-4">
          {outfits.map((outfit, i) => {
            const isSelected = selectedOutfitIndex === i;
            return (
            <motion.div
              key={outfit.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-3xl overflow-hidden cursor-pointer"
              style={{
                background: "var(--card)",
                boxShadow: isSelected
                  ? "0 4px 20px rgba(169,139,227,0.28)"
                  : "0 4px 20px rgba(169,139,227,0.15)",
                border: isSelected
                  ? "2px solid var(--accent)"
                  : "1.5px solid var(--border)",
              }}
              onClick={() => selectOutfit(i)}
            >
              <div
                className="px-4 py-2.5 flex items-center justify-between"
                style={{ background: "var(--secondary)", borderBottom: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: isSelected ? "var(--accent)" : "var(--card)",
                      border: isSelected ? "none" : "1.5px solid var(--border)",
                    }}
                  >
                    {isSelected && <Check size={10} color="white" />}
                  </div>
                  <h3 className="truncate" style={{ fontFamily: "var(--font-display)", fontSize: "1rem", fontWeight: 700, color: "var(--foreground)" }}>
                    {outfit.name}
                  </h3>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "var(--card)", color: "var(--foreground)", fontFamily: "var(--font-body)" }}>
                  {outfit.vibe}
                </span>
              </div>
              <div className="flex">
                <div className="relative flex-shrink-0" style={{ width: 140, height: 180 }}>
                  <img src={outfit.img} alt={outfit.name} className="w-full h-full object-cover" />
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(to right, transparent 70%, var(--card))" }}
                  />
                </div>
                <div className="flex-1 p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-end">
                      <button onClick={(e) => { e.stopPropagation(); toggleLike(outfit.id); }}>
                        <Heart
                          size={18}
                          style={{ color: liked.includes(outfit.id) ? "#e85d87" : "var(--muted-foreground)" }}
                          fill={liked.includes(outfit.id) ? "#e85d87" : "none"}
                        />
                      </button>
                    </div>
                    <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Pieces
                    </p>
                    <div className="flex flex-col gap-1.5 mt-1.5">
                      {outfit.items.map((item) => (
                        <span key={item} className="text-sm px-2.5 py-1 rounded-xl" style={{ background: "var(--background)", color: "var(--foreground)", fontFamily: "var(--font-body)" }}>
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 gap-2">
                    <p className="text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>
                      {outfit.shopCount > 0
                        ? `${outfit.shopCount} item${outfit.shopCount > 1 ? "s" : ""} to buy`
                        : "All from your wardrobe"}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedOutfit(outfit); }}
                      className="text-xs"
                      style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}
                    >
                      Details
                    </button>
                    <div
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: "var(--accent)", color: "white", fontFamily: "var(--font-body)", fontWeight: 600 }}
                    >
                      {outfit.score}%
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );})}
        </div>

        {outfits.length > 0 && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => void visualizeSelectedOutfit()}
              disabled={
                tryOnLoading ||
                selectedOutfitIndex === null ||
                !hasPhoto
              }
              className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2"
              style={{
                background: tryOnLoading || selectedOutfitIndex === null || !hasPhoto
                  ? "var(--muted)"
                  : "linear-gradient(135deg, var(--accent) 0%, #7e5fbf 100%)",
                color: tryOnLoading || selectedOutfitIndex === null || !hasPhoto
                  ? "var(--muted-foreground)"
                  : "white",
                fontFamily: "var(--font-body)",
                fontWeight: 700,
              }}
            >
              <ImageIcon size={16} />
              {tryOnLoading
                ? "Creating try-on…"
                : selectedOutfitIndex === null
                  ? "Select an outfit to visualize"
                  : !hasPhoto
                    ? "Add a profile photo to visualize"
                    : "Visualize outfit"}
            </button>
          </div>
        )}
      </div>

      <OutfitTryOnSheet
        open={Boolean(tryOnImage)}
        imageUrl={tryOnImage}
        outfitName={tryOnOutfitName}
        pieces={tryOnPieces}
        note={tryOnNote}
        onClose={clearTryOn}
      />

      {/* Outfit Detail Sheet */}
      <AnimatePresence>
        {selectedOutfit && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30"
              style={{ background: "rgba(75,59,97,0.4)", backdropFilter: "blur(4px)" }}
              onClick={() => setSelectedOutfit(null)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-40 rounded-t-3xl overflow-hidden"
              style={{ background: "var(--card)", maxHeight: "85vh", overflowY: "auto" }}
            >
              <div className="relative">
                <img
                  src={selectedOutfit.img}
                  alt={selectedOutfit.name}
                  className="w-full object-cover"
                  style={{ height: 300 }}
                />
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(to top, var(--card) 5%, transparent 60%)" }}
                />
                <button
                  className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.8)" }}
                  onClick={() => setSelectedOutfit(null)}
                >
                  <X size={14} style={{ color: "var(--foreground)" }} />
                </button>
                <div className="absolute bottom-4 left-5 right-5">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "var(--accent)", color: "white", fontFamily: "var(--font-body)" }}
                  >
                    {selectedOutfit.vibe}
                  </span>
                  <h2 className="mt-1" style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--foreground)", fontWeight: 700 }}>
                    {selectedOutfit.name}
                  </h2>
                </div>
              </div>

              <div className="px-5 pb-8 pt-2">
                <p className="text-sm mb-4" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>
                  {selectedOutfit.reason ?? `${weather?.temperature ?? "—"} · ${prompt.trim() || "Everyday"}`}
                </p>

                <h3 className="mb-3" style={{ fontFamily: "var(--font-display)", fontSize: "1rem", color: "var(--foreground)" }}>Pieces</h3>
                <div className="flex flex-col gap-3 mb-6">
                  {selectedOutfit.garmentItems.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center gap-3 p-3 rounded-2xl"
                      style={{ background: "var(--background)", border: "1px solid var(--border)" }}
                    >
                      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                        <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm" style={{ fontFamily: "var(--font-body)", fontWeight: 600, color: "var(--foreground)" }}>{item.name}</p>
                        <p className="text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}>
                          {item.owned ? "Your wardrobe" : "Shop item"}
                        </p>
                      </div>
                      {item.owned ? (
                        <span className="text-xs px-2 py-1 rounded-full" style={{ background: "var(--secondary)", color: "var(--foreground)", fontFamily: "var(--font-body)" }}>
                          Owned
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full" style={{ background: "#fce4ec", color: "#e85d87", fontFamily: "var(--font-body)", fontWeight: 600 }}>
                          £{(item as any).price}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    className="flex-1 py-3.5 rounded-full flex items-center justify-center gap-2 text-sm"
                    style={{ background: "var(--primary)", color: "var(--primary-foreground)", fontFamily: "var(--font-body)", fontWeight: 600 }}
                  >
                    <Sparkles size={15} /> Try On Virtually
                  </button>
                  <button
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ background: "var(--secondary)", color: "var(--foreground)" }}
                  >
                    <Share2 size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
