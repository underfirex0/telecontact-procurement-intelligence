/**
 * Internationalisation (English / French).
 *
 * - Keys are the English source strings; `FR` maps them to French.
 * - `t()` translates interface and analytical sentences ({var} placeholders).
 * - `tv()` translates data values (statuses, sectors, countries…) and the
 *   generated synthetic data text, using exact matches then patterns.
 * - The current language is module state set by the LocaleProvider before the
 *   tree renders; switching language remounts the tree so every computed
 *   sentence and formatted number is rebuilt in the new language.
 */
import { FR } from "./fr";

export type Lang = "en" | "fr";
export const LANGS: Lang[] = ["en", "fr"];

let current: Lang = "en";
export function getLang(): Lang {
  return current;
}
export function setLang(l: Lang) {
  current = l;
}

type Vars = Record<string, string | number | null | undefined>;

export function fill(tpl: string, vars?: Vars): string {
  if (!vars) return tpl;
  return tpl.replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined || vars[k] === null ? m : String(vars[k])));
}

/** Strip an optional context tag: "Awarded@@view" is shown as "Awarded" in English. */
const base = (key: string) => {
  const i = key.indexOf("@@");
  return i === -1 ? key : key.slice(0, i);
};

/**
 * Translate an interface / analytical string. A key may carry a context tag
 * ("Bid@@amount") when one English word needs different French translations.
 */
export function t(key: string, vars?: Vars): string {
  return fill(current === "fr" ? FR[key] ?? FR[base(key)] ?? base(key) : base(key), vars);
}

/** Marks a module-level string for extraction; translate it with t() at render time. */
export function tk(key: string): string {
  return key;
}

/* ---------------- data values & generated text ---------------- */

const lowerFR = new Map<string, string>();
for (const [k, v] of Object.entries(FR)) lowerFR.set(k.toLowerCase(), v);

function word(v: string): string {
  if (FR[v]) return FR[v];
  const lv = lowerFR.get(v.toLowerCase());
  if (lv) return v === v.toLowerCase() ? lv.toLowerCase() : lv;
  return v;
}
const list = (s: string, sep = ", ") => s.split(sep).map(word).join(sep);

const PATTERNS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^(.+) need published by (\S+) for (.+)\. (Part of a recurring purchasing line at this buyer\.|One-off requirement\.) Estimated contract duration (\d+) months\. Synthetic tender object\.$/,
    (m) => `Besoin « ${word(m[1]).toLowerCase()} » publié par ${m[2]} pour ${m[3]}. ${m[4].startsWith("Part") ? "Fait partie d'une ligne d'achat récurrente de cet acheteur." : "Besoin ponctuel."} Durée estimée du contrat : ${m[5]} mois. Objet de marché synthétique.`],
  [/^Fictional (.+) provider based in (.+), (.+)\. Synthetic profile for network-building demonstrations; capabilities in (.+)\.$/,
    (m) => `Prestataire fictif (${word(m[1]).toLowerCase()}) basé à ${m[2]}, ${word(m[3])}. Profil synthétique pour la démonstration du réseau ; compétences : ${list(m[4]).toLowerCase()}.`],
  [/^Synthetic role to support delivery of fictional opportunities in (.+)\. Requires (\d+)\+ years in (.+)\.$/,
    (m) => `Poste synthétique pour appuyer l'exécution d'opportunités fictives (${word(m[1])}). Exige ${m[2]} ans et plus en ${list(m[3], " and ").replace(/ and /g, " et ").toLowerCase()}.`],
  [/^Joint delivery on (\d+) synthetic project\(s\) in (\d{4})$/, (m) => `Exécution conjointe de ${m[1]} projet(s) synthétique(s) en ${m[2]}`],
  [/^Capacity assessed at (\d)\/5; commercial terms discussed\.$/, (m) => `Capacité évaluée à ${m[1]}/5 ; conditions commerciales discutées.`],
  [/^Lot n°(\d+) — (.+?)( \(zone (\d+)\))?$/, (m) => `Lot n°${m[1]} — ${word(m[2])}${m[4] ? ` (zone ${m[4]})` : ""}`],
  [/^(.+) \(synthetic\)$/, (m) => `${m[1]} (synthétique)`],
  [/^(.+) \(synthetic\)(\.\w+)$/, (m) => `${word(m[1] + " (synthetic)")}${m[2]}`],
  [/^(.+) \(demo entry\)$/, (m) => `${m[1]} (saisie démo)`],
  [/^(.+) \(placeholder — file not stored\)$/, (m) => `${m[1]} (emplacement — fichier non stocké)`],
  [/^Demo (Analyst|BD Lead|Partner Mgr\.|Bid Mgr\.) (.+)$/, (m) => `${{ Analyst: "Analyste démo", "BD Lead": "Resp. développement démo", "Partner Mgr.": "Resp. partenariats démo", "Bid Mgr.": "Resp. offres démo" }[m[1]]} ${m[2]}`],
];

/** Translate a data value or generated data sentence. Unknown text is returned unchanged. */
export function tv(v: string | null | undefined): string {
  if (v === null || v === undefined) return "";
  if (current === "en") return v;
  if (FR[v]) return FR[v];
  for (const [re, fn] of PATTERNS) {
    const m = v.match(re);
    if (m) return fn(m);
  }
  return word(v);
}

/** Translate a list of values. */
export function tvl(vs: string[], sep = ", "): string {
  return vs.map(tv).join(sep);
}
