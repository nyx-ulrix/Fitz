import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type OutfitTryOnSheetProps = {
  open: boolean;
  imageUrl: string | null;
  outfitName?: string | null;
  pieces?: string[];
  note?: string | null;
  onClose: () => void;
};

export function OutfitTryOnSheet({
  open,
  imageUrl,
  outfitName,
  pieces = [],
  note,
  onClose,
}: OutfitTryOnSheetProps) {
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
                alt={outfitName ? `${outfitName} try-on` : "Outfit try-on"}
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
                Your try-on
              </h2>
              {outfitName && (
                <p
                  className="text-sm mt-2"
                  style={{ color: "var(--foreground)", fontFamily: "var(--font-body)", fontWeight: 600 }}
                >
                  {outfitName}
                </p>
              )}
              {pieces.length > 0 && (
                <div className="mt-4">
                  <p
                    className="text-xs mb-2"
                    style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.06em" }}
                  >
                    Pieces in this outfit
                  </p>
                  <div className="flex flex-col gap-2">
                    {pieces.map((piece) => (
                      <div
                        key={piece}
                        className="px-3 py-2 rounded-xl text-sm"
                        style={{ background: "var(--secondary)", color: "var(--foreground)", fontFamily: "var(--font-body)" }}
                      >
                        {piece}
                      </div>
                    ))}
                  </div>
                </div>
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
