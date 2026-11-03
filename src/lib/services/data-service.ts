/**
 * Data service — the single read entry point for the synthetic dataset and its
 * analytical context. Swapping this module for a database/API-backed
 * implementation is the integration seam for real data (see docs/PRODUCT_ARCHITECTURE.md).
 *
 * The dataset is language-independent. The analytical context is built once per
 * interface language so that reference labels (sector names, activities) are
 * localised; ids and all logic values stay identical.
 */
import { buildContext, type Ctx } from "../analytics/context";
import { DEFAULT_SEED, generateDataset } from "../data/generate";
import { getLang, tv, type Lang } from "../i18n";
import type { Dataset } from "../types";

let dataset: Dataset | null = null;
const ctxByLang = new Map<Lang, Ctx>();

export function getDataset(): Dataset {
  if (!dataset) dataset = generateDataset(DEFAULT_SEED);
  return dataset;
}

export function getContext(): Ctx {
  const lang = getLang();
  let ctx = ctxByLang.get(lang);
  if (!ctx) {
    const ds = getDataset();
    ctx = buildContext(lang === "en" ? ds : { ...ds, sectors: ds.sectors.map((s) => ({ ...s, name: tv(s.name), activities: s.activities.map(tv) })) });
    ctxByLang.set(lang, ctx);
  }
  return ctx;
}
