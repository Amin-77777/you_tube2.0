import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import axiosInstance from "./axiosinstance";

export type ThemePreference = "auto" | "light" | "dark";
export type EffectiveTheme = "light" | "dark";

interface ThemeContextType {
  themePreference: ThemePreference;
  effectiveTheme: EffectiveTheme;
  setThemePreference: (pref: ThemePreference) => Promise<void>;
  toggleTheme: () => void;
  istTimeString: string;
}

const ThemeContext = createContext<ThemeContextType>({
  themePreference: "auto",
  effectiveTheme: "light",
  setThemePreference: async () => {},
  toggleTheme: () => {},
  istTimeString: "",
});

/**
 * Calculates effective theme based on Asia/Kolkata (IST) time:
 * - 05:00:00 IST to 11:59:59 IST => 'light'
 * - 12:00:00 IST to 04:59:59 IST => 'dark'
 */
export function calculateISTEffectiveTheme(date = new Date()): EffectiveTheme {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      hour12: false,
    });
    const hour = parseInt(formatter.format(date), 10) % 24;
    if (hour >= 5 && hour < 12) {
      return "light";
    }
    return "dark";
  } catch (_) {
    return "light";
  }
}

export function getISTDisplayString(date = new Date()): string {
  try {
    return (
      new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "medium",
      }).format(date) + " IST"
    );
  } catch (_) {
    return "";
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themePreference, setPreferenceState] = useState<ThemePreference>("auto");
  const [effectiveTheme, setEffectiveThemeState] = useState<EffectiveTheme>("light");
  const [istTimeString, setIstTimeString] = useState<string>("");

  // Apply class to HTML and Body
  const applyThemeToDOM = useCallback((eff: EffectiveTheme) => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    if (eff === "dark") {
      root.classList.add("dark");
      document.body.classList.add("dark");
    } else {
      root.classList.remove("dark");
      document.body.classList.remove("dark");
    }
  }, []);

  // Recalculates effective theme based on preference and IST
  const updateEffectiveTheme = useCallback(
    (pref: ThemePreference) => {
      let effective: EffectiveTheme = "light";
      if (pref === "light") {
        effective = "light";
      } else if (pref === "dark") {
        effective = "dark";
      } else {
        effective = calculateISTEffectiveTheme();
      }

      setEffectiveThemeState(effective);
      applyThemeToDOM(effective);
      setIstTimeString(getISTDisplayString());
    },
    [applyThemeToDOM]
  );

  // Initialize theme from storage on mount
  useEffect(() => {
    let savedPref: ThemePreference = "auto";
    try {
      const stored = localStorage.getItem("yt_theme_pref") as ThemePreference;
      if (stored && ["auto", "light", "dark"].includes(stored)) {
        savedPref = stored;
      }
    } catch (_) {}

    setPreferenceState(savedPref);
    updateEffectiveTheme(savedPref);

    // Periodically update IST time and check theme every 60s
    const timer = setInterval(() => {
      setIstTimeString(getISTDisplayString());
      if (savedPref === "auto") {
        updateEffectiveTheme("auto");
      }
    }, 60000);

    return () => clearInterval(timer);
  }, [updateEffectiveTheme]);

  // Sync preference with backend if logged in
  useEffect(() => {
    const syncFromBackend = async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) return;

      try {
        const res = await axiosInstance.get("/user/preferences");
        if (res.data?.themePreference) {
          const pref = res.data.themePreference as ThemePreference;
          setPreferenceState(pref);
          localStorage.setItem("yt_theme_pref", pref);
          updateEffectiveTheme(pref);
        }
      } catch (_) {
        // Silently keep local preference if backend not reachable
      }
    };

    syncFromBackend();
  }, [updateEffectiveTheme]);

  // Set new theme preference and persist
  const setThemePreference = async (pref: ThemePreference) => {
    setPreferenceState(pref);
    try {
      localStorage.setItem("yt_theme_pref", pref);
    } catch (_) {}
    updateEffectiveTheme(pref);

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
      try {
        await axiosInstance.patch("/user/preferences", { themePreference: pref });
      } catch (err) {
        console.warn("Failed to persist theme to server profile:", err);
      }
    }
  };

  const toggleTheme = () => {
    if (effectiveTheme === "dark") {
      setThemePreference("light");
    } else {
      setThemePreference("dark");
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        themePreference,
        effectiveTheme,
        setThemePreference,
        toggleTheme,
        istTimeString,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
