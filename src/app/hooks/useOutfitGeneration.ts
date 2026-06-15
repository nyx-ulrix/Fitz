import { useState } from "react";
import type { AppearanceAnalysis, Outfit } from "../lib/types";
import {
  buildWeatherContext,
  generateOutfit,
  generateTryOn,
} from "../lib/fitzApi";
import { useAuth } from "../lib/AuthContext";
import { useApp } from "../context/AppContext";
import {
  outfitItemsForTryOn,
  validateOutfitForVisualization,
} from "../lib/outfitValidation";

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
  const [selectedOutfitIndex, setSelectedOutfitIndex] = useState<number | null>(
    null,
  );
  const [tryOnImage, setTryOnImage] = useState<string | null>(null);
  const [tryOnOutfitName, setTryOnOutfitName] = useState<string | null>(null);
  const [tryOnPieces, setTryOnPieces] = useState<string[]>([]);
  const [tryOnNote, setTryOnNote] = useState<string | null>(null);
  const [tryOnLoading, setTryOnLoading] = useState(false);

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
    setSelectedOutfitIndex(null);
    setTryOnImage(null);
    setTryOnOutfitName(null);
    setTryOnPieces([]);
    setTryOnNote(null);

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

  const selectOutfit = (index: number) => {
    setSelectedOutfitIndex((current) => (current === index ? null : index));
  };

  const visualizeSelectedOutfit = async () => {
    if (!photoDataUrl) {
      setError("Upload a person photo before creating a visualization.");
      return;
    }

    if (selectedOutfitIndex === null) {
      setError("Select an outfit to visualize.");
      return;
    }

    const outfit = outfits[selectedOutfitIndex];
    if (!outfit) {
      setError("Selected outfit is no longer available.");
      return;
    }

    const validationError = validateOutfitForVisualization(outfit);
    if (validationError) {
      setError(validationError);
      return;
    }

    const outfitName = outfit.name ?? `Outfit ${selectedOutfitIndex + 1}`;
    const pieces = outfitItemsForTryOn(outfit).map((item) => item.name);

    setTryOnLoading(true);
    setError(null);
    setTryOnImage(null);
    setTryOnOutfitName(null);
    setTryOnPieces([]);
    setTryOnNote(null);

    try {
      const data = await generateTryOn({
        personImage: photoDataUrl,
        outfitName,
        garments: outfitItemsForTryOn(outfit),
      });

      if (!data.imageUrl) {
        throw new Error("No image returned");
      }

      setTryOnImage(data.imageUrl);
      setTryOnOutfitName(outfitName);
      setTryOnPieces(pieces);
      setTryOnNote(data.note ?? null);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not generate the visualization",
      );
    } finally {
      setTryOnLoading(false);
    }
  };

  const clearTryOn = () => {
    setTryOnImage(null);
    setTryOnOutfitName(null);
    setTryOnPieces([]);
    setTryOnNote(null);
  };

  return {
    outfits,
    generating,
    error,
    shoppingSkippedReason,
    selectedOutfitIndex,
    tryOnImage,
    tryOnOutfitName,
    tryOnPieces,
    tryOnNote,
    tryOnLoading,
    generate,
    selectOutfit,
    visualizeSelectedOutfit,
    clearTryOn,
    setError,
    hasPhoto: Boolean(photoDataUrl),
    hasAnalysis: Boolean(appearanceAnalysis),
  };
}
