import type { Accessor, JSX } from "solid-js";
import { createContext, createSignal, onCleanup, onMount, useContext } from "solid-js";

export type ThemePreference = "light" | "dark" | "system";

type ThemeContextValue = {
  themePreference: Accessor<ThemePreference>;
  setThemePreference: (preference: ThemePreference) => void;
};

const THEME_STORAGE_KEY = "dextop-theme";
const THEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";

const ThemeContext = createContext<ThemeContextValue>();

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia(THEME_MEDIA_QUERY).matches ? "dark" : "light";
}

function resolveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference === "system") {
    return getSystemTheme();
  }

  return preference;
}

function applyTheme(preference: ThemePreference): void {
  if (typeof document === "undefined") {
    return;
  }

  const resolvedTheme = resolveTheme(preference);
  document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  document.documentElement.style.colorScheme = resolvedTheme;
}

export function ThemeProvider(props: { children: JSX.Element }) {
  const [themePreferenceState, setThemePreferenceState] = createSignal<ThemePreference>("system");
  let removeMediaQueryListener: (() => void) | undefined;

  const initializeTheme = () => {
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
      if (themePreferenceState() !== "system") {
        return;
      }

      applyTheme("system");
    };

    mediaQuery.addEventListener("change", handleChange);
    removeMediaQueryListener = () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  };

  const setThemePreference = (preference: ThemePreference) => {
    setThemePreferenceState(preference);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    }

    applyTheme(preference);
  };

  onMount(() => {
    initializeTheme();
  });

  onCleanup(() => {
    removeMediaQueryListener?.();
    removeMediaQueryListener = undefined;
  });

  return (
    <ThemeContext.Provider
      value={{
        themePreference: themePreferenceState,
        setThemePreference,
      }}
    >
      {props.children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}
