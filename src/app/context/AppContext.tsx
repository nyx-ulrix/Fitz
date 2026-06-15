import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { AppearanceAnalysis, Outfit, WeatherData } from "../lib/types";
import { buildWeatherContext, fetchWeather } from "../lib/fitzApi";

type AppContextValue = {
  photoDataUrl: string | null;
  setPhotoDataUrl: (url: string | null) => void;
  appearanceAnalysis: AppearanceAnalysis | null;
  setAppearanceAnalysis: (analysis: AppearanceAnalysis | null) => void;
  weather: WeatherData | null;
  weatherContext: string;
  weatherLoading: boolean;
  weatherError: string | null;
  refreshWeather: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [appearanceAnalysis, setAppearanceAnalysis] =
    useState<AppearanceAnalysis | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const refreshWeather = useCallback(async () => {
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const data = await fetchWeather();
      setWeather(data);
    } catch (error: unknown) {
      setWeatherError(
        error instanceof Error ? error.message : "Could not load weather",
      );
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshWeather();
  }, [refreshWeather]);

  const weatherContext = weather ? buildWeatherContext(weather) : "";

  return (
    <AppContext.Provider
      value={{
        photoDataUrl,
        setPhotoDataUrl,
        appearanceAnalysis,
        setAppearanceAnalysis,
        weather,
        weatherContext,
        weatherLoading,
        weatherError,
        refreshWeather,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function outfitGarments(outfit: Outfit) {
  return [...(outfit.ownedItems ?? []), ...(outfit.shopItems ?? [])].map(
    (item) => ({ name: item.name, imageUrl: item.image_url }),
  );
}

export function outfitPreviewImage(outfit: Outfit) {
  const items = [...(outfit.ownedItems ?? []), ...(outfit.shopItems ?? [])];
  return items[0]?.image_url ?? "";
}
