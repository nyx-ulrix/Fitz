import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type OutfitComparisonSheetProps = {
  open: boolean;
  imageUrl: string | null;
  labels: string[];
  note?: string | null;
  mode?: "single" | "compare";
  onClose: () => void;
};

export function OutfitComparisonSheet({
  open,
  imageUrl,
  labels,
  note,
  mode = "compare",
  onClose,
}: OutfitComparisonSheetProps) {
  return (
    <AnimatePresence>
      {open && imageUrl && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(75,59,97,0.5)", backdropFilter: "blur(4px)" }}
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
            style={{ background: "var(--card)", maxHeight: "88vh", overflowY: "auto" }}
          >
            <div className="relative">
              <img
                src={imageUrl}
                alt={mode === "single" ? "Outfit try-on" : "Outfit comparison"}
                className="w-full object-cover"
                style={{ maxHeight: "62vh" }}
              />
              <button
                type="button"
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.9)" }}
                onClick={onClose}
              >
                <X size={14} style={{ color: "var(--foreground)" }} />
              </button>
            </div>
            <div className="px-5 py-4 pb-8">
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.2rem",
                  color: "var(--foreground)",
                  fontWeight: 700,
                }}
              >
                {mode === "single" ? "Your try-on" : "Your outfit comparison"}
              </h2>
              {mode === "compare" && labels.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {labels.map((label) => (
                    <span
                      key={label}
                      className="text-xs px-3 py-1.5 rounded-full"
                      style={{
                        background: "var(--secondary)",
                        color: "var(--foreground)",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              )}
              {mode === "single" && labels[0] && (
                <p
                  className="text-sm mt-2"
                  style={{ color: "var(--foreground)", fontFamily: "var(--font-body)", fontWeight: 600 }}
                >
                  {labels[0]}
                </p>
              )}
              {note && (
                <p
                  className="text-xs mt-3"
                  style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}
                >
                  {note}
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
