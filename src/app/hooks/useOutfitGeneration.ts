import { useState } from "react";
import type { AppearanceAnalysis, Outfit } from "../lib/types";
import {
  buildWeatherContext,
  generateOutfit,
  generateTryOn,
} from "../lib/fitzApi";
import { useAuth } from "../lib/AuthContext";
import { useApp } from "../context/AppContext";
import { outfitGarments } from "../context/AppContext";

type GenerateOptions = {
  occasion: string;
  stylePreference: string;
  mustWearItem?: string;
  shopTheLook?: boolean;
  budget?: number;
};

export function useOutfitGeneration() {
  const { token } = useAuth();
  const {
    photoDataUrl,
    appearanceAnalysis,
    weather,
  } = useApp();

  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shoppingSkippedReason, setShoppingSkippedReason] = useState<
    string | null
  >(null);
  const [tryOnImages, setTryOnImages] = useState<Record<number, string>>({});
  const [tryOnNotes, setTryOnNotes] = useState<Record<number, string>>({});
  const [tryOnLoading, setTryOnLoading] = useState<number | null>(null);

  const generate = async (options: GenerateOptions) => {
    if (!token) {
      setError("Sign in to generate outfits.");
      return;
    }

    if (!weather) {
      setError("Weather is still loading. Please wait a moment.");
      return;
    }

    setGenerating(true);
    setError(null);
    setOutfits([]);
    setTryOnImages({});
    setTryOnNotes({});

    try {
      const result = await generateOutfit(token, {
        occasion: options.occasion,
        weather: buildWeatherContext(weather),
        stylePreference: options.stylePreference,
        mustWearItem: options.mustWearItem,
        appearanceAnalysis: appearanceAnalysis as AppearanceAnalysis | null,
        shopTheLook: options.shopTheLook ?? false,
        budget: options.budget ?? 0,
      });
      setOutfits(result.outfits ?? []);
      setShoppingSkippedReason(result.shoppingSkippedReason ?? null);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Could not generate outfits",
      );
    } finally {
      setGenerating(false);
    }
  };

  const visualizeOutfit = async (outfit: Outfit, index: number) => {
    if (!photoDataUrl) {
      setError("Upload a person photo before creating a visualization.");
      return;
    }

    const garments = outfitGarments(outfit);
    if (!garments.length) return;

    setTryOnLoading(index);
    setError(null);

    try {
      const data = await generateTryOn({
        personImage: photoDataUrl,
        garments,
        outfitName: outfit.name,
      });
      if (!data.imageUrl) {
        throw new Error("No image returned");
      }
      setTryOnImages((current) => ({ ...current, [index]: data.imageUrl! }));
      if (data.note) {
        setTryOnNotes((current) => ({ ...current, [index]: data.note! }));
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not generate the visualization",
      );
    } finally {
      setTryOnLoading(null);
    }
  };

  return {
    outfits,
    generating,
    error,
    shoppingSkippedReason,
    tryOnImages,
    tryOnNotes,
    tryOnLoading,
    generate,
    visualizeOutfit,
    setError,
    hasPhoto: Boolean(photoDataUrl),
    hasAnalysis: Boolean(appearanceAnalysis),
  };
}
