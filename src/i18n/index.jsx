import React, { createContext, useContext, useState, useCallback } from "react";
import en from "./en.js";
import it from "./it.js";

export const DICTIONARIES = { en, it };
export const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "it", label: "IT" },
];
const STORAGE_KEY = "amc_lang";

// Browser storage can be unavailable (privacy modes, sandboxed previews): always degrade to "en".
function readStoredLang() {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v && DICTIONARIES[v] ? v : "en";
  } catch {
    return "en";
  }
}

// Pure lookup, exported for tests: missing keys fall back to English, then to the key itself,
// so an untranslated string is visible instead of silently blank. `params` fills {name}
// placeholders in the resolved string; a placeholder with no matching param is left as-is
// rather than silently dropped, so a missing translation key is still visible.
export function translate(lang, key, params) {
  const template = DICTIONARIES[lang]?.[key] ?? DICTIONARIES.en[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
}

const LanguageContext = createContext({ lang: "en", setLang: () => {}, t: (k) => k });

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readStoredLang);
  const setLang = useCallback((next) => {
    if (!DICTIONARIES[next]) return;
    setLangState(next);
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* non-critical */ }
  }, []);
  const t = useCallback((key, params) => translate(lang, key, params), [lang]);
  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}

export const useI18n = () => useContext(LanguageContext);
