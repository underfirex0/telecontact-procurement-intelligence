"use client";
import { createContext, Fragment, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { FR } from "./fr";
import { getLang, setLang as setGlobalLang, type Lang } from "./index";

const KEY = "tci.lang";
const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "en", setLang: () => {} });

/**
 * Holds the interface language. The server renders English; the stored choice is
 * applied after mount. Children are keyed on the language so that every page
 * re-computes its sentences, dates and numbers in the selected language.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      if (saved === "fr" || saved === "en") setLangState(saved);
    } catch {
      /* storage unavailable */
    }
  }, []);
  // Set synchronously so every child render in this pass uses the right language.
  setGlobalLang(lang);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = useCallback((l: Lang) => {
    try {
      window.localStorage.setItem(KEY, l);
    } catch {
      /* ignore */
    }
    setLangState(l);
  }, []);
  return (
    <Ctx.Provider value={{ lang, setLang }}>
      <Fragment key={lang}>{children}</Fragment>
    </Ctx.Provider>
  );
}

export function useLocale() {
  return useContext(Ctx);
}

/**
 * Translate a sentence whose placeholders are React nodes (e.g. bold figures):
 * tn("Leads with {n} publications.", { n: <b>14</b> })
 */
export function tn(key: string, vars: Record<string, ReactNode>): ReactNode {
  const tpl = getLang() === "fr" ? FR[key] ?? key : key;
  const parts = tpl.split(/(\{\w+\})/g);
  return parts.map((p, i) => {
    const m = p.match(/^\{(\w+)\}$/);
    if (m && m[1] in vars) return <Fragment key={i}>{vars[m[1]]}</Fragment>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}
