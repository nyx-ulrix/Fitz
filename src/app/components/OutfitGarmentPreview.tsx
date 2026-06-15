import type { DisplayGarment } from "../lib/outfitDisplay";
import { getOutfitPreviewGarments } from "../lib/outfitDisplay";

type OutfitGarmentPreviewProps = {
  garments: DisplayGarment[];
  width: number;
  height: number;
  alt: string;
};

function GarmentTile({
  garment,
  label,
}: {
  garment: DisplayGarment;
  label: string;
}) {
  return (
    <div className="relative flex-1 min-h-0 overflow-hidden" style={{ background: "var(--muted)" }}>
      {garment.img ? (
        <img
          src={garment.img}
          alt={garment.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center px-2 text-center text-xs"
          style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}
        >
          {garment.name}
        </div>
      )}
      <span
        className="absolute bottom-1 left-1 text-[0.6rem] px-1.5 py-0.5 rounded-full"
        style={{
          background: "rgba(255,255,255,0.9)",
          color: "var(--foreground)",
          fontFamily: "var(--font-body)",
          fontWeight: 600,
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function OutfitGarmentPreview({
  garments,
  width,
  height,
  alt,
}: OutfitGarmentPreviewProps) {
  const { top, bottom } = getOutfitPreviewGarments(garments);

  if (top && bottom && top.name !== bottom.name) {
    return (
      <div
        className="flex flex-col overflow-hidden"
        style={{ width, height }}
        aria-label={alt}
      >
        <GarmentTile garment={top} label="Top" />
        <div style={{ height: 1, background: "var(--border)", flexShrink: 0 }} />
        <GarmentTile garment={bottom} label="Bottom" />
      </div>
    );
  }

  const fallback = top ?? bottom ?? garments[0];
  return (
    <div className="overflow-hidden" style={{ width, height, background: "var(--muted)" }}>
      {fallback?.img ? (
        <img src={fallback.img} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center px-3 text-center text-sm"
          style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-body)" }}
        >
          {fallback?.name ?? alt}
        </div>
      )}
    </div>
  );
}
