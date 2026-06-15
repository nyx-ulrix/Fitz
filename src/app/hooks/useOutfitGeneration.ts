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

const MAX_VISUALIZE_OUTFITS = 3;

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
  const [selectedOutfitIndices, setSelectedOutfitIndices] = useState<number[]>(
    [],
  );
  const [comparisonImage, setComparisonImage] = useState<string | null>(null);
  const [comparisonLabels, setComparisonLabels] = useState<string[]>([]);
  const [comparisonNote, setComparisonNote] = useState<string | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);

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
    setSelectedOutfitIndices([]);
    setComparisonImage(null);
    setComparisonLabels([]);
    setComparisonNote(null);

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

  const toggleOutfitSelection = (index: number) => {
    setSelectedOutfitIndices((current) => {
      if (current.includes(index)) {
        return current.filter((value) => value !== index);
      }
      if (current.length >= MAX_VISUALIZE_OUTFITS) {
        return current;
      }
      return [...current, index];
    });
  };

  const visualizeSelectedOutfits = async () => {
    if (!photoDataUrl) {
      setError("Upload a person photo before creating a visualization.");
      return;
    }

    const selected = selectedOutfitIndices
      .slice()
      .sort((a, b) => a - b)
      .map((index) => outfits[index])
      .filter(Boolean);

    if (selected.length === 0) {
      setError("Select at least one outfit to visualize.");
      return;
    }

    setComparisonLoading(true);
    setError(null);
    setComparisonImage(null);
    setComparisonLabels([]);
    setComparisonNote(null);

    try {
      const data = await generateTryOn({
        personImage: photoDataUrl,
        outfits: selected.map((outfit, index) => ({
          outfitName: outfit.name ?? `Outfit ${index + 1}`,
          garments: outfitGarments(outfit),
        })),
      });

      if (!data.imageUrl) {
        throw new Error("No image returned");
      }

      setComparisonImage(data.imageUrl);
      setComparisonLabels(
        data.outfitNames ??
          selected.map((outfit, index) => outfit.name ?? `Outfit ${index + 1}`),
      );
      setComparisonNote(data.note ?? null);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not generate the visualization",
      );
    } finally {
      setComparisonLoading(false);
    }
  };

  const clearComparison = () => {
    setComparisonImage(null);
    setComparisonLabels([]);
    setComparisonNote(null);
  };

  return {
    outfits,
    generating,
    error,
    shoppingSkippedReason,
    selectedOutfitIndices,
    comparisonImage,
    comparisonLabels,
    comparisonNote,
    comparisonLoading,
    generate,
    toggleOutfitSelection,
    visualizeSelectedOutfits,
    clearComparison,
    setError,
    hasPhoto: Boolean(photoDataUrl),
    hasAnalysis: Boolean(appearanceAnalysis),
    maxVisualizeOutfits: MAX_VISUALIZE_OUTFITS,
  };
}
