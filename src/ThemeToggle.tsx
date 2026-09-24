import { Moon, Sun } from "lucide-react";
import { useState } from "react";

type Theme = "light" | "dark";
const themeKey = "pepr-theme";

/** Reads the theme currently applied to the document. */
function readTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

/** Applies a theme and remembers it for the next visit. */
function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(themeKey, theme);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#07090e" : "#f4f6f8");
}

/** Switches the site between the cool light theme and the dark lab theme. */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readTheme);

  /** Flips the active theme. */
  const toggleTheme = (): void => {
    const next = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  };

  const isDark = theme === "dark";
  return (
    <button
      type="button"
      className="icon-button theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
