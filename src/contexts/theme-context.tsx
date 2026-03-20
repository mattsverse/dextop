import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemePreference = "light" | "dark" | "system";

type ThemeContextValue = {
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
};

const THEME_STORAGE_KEY = "dextop-theme";
const THEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia(THEME_MEDIA_QUERY).matches ? "dark" : "light";
}

function resolveTheme(preference: ThemePreference): "light" | "dark" {
  return preference === "system" ? getSystemTheme() : preference;
}

function applyTheme(preference: ThemePreference): void {
  if (typeof document === "undefined") {
    return;
  }

  const resolvedTheme = resolveTheme(preference);
  document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  document.documentElement.style.colorScheme = resolvedTheme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedThemePreference = window.localStorage.getItem(THEME_STORAGE_KEY);
    const initialThemePreference = isThemePreference(storedThemePreference)
      ? storedThemePreference
      : "system";

    setThemePreferenceState(initialThemePreference);
    applyTheme(initialThemePreference);

    const mediaQuery = window.matchMedia(THEME_MEDIA_QUERY);
    const handleChange = () => {
      if (themePreference !== "system") {
        return;
      }

      applyTheme("system");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [themePreference]);

  const setThemePreference = useCallback((preference: ThemePreference) => {
    setThemePreferenceState(preference);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    }

    applyTheme(preference);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themePreference,
      setThemePreference,
    }),
    [setThemePreference, themePreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}
