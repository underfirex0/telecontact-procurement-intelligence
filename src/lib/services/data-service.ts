/**
 * Data service — the single read entry point for the synthetic dataset and its
 * analytical context. Swapping this module for a database/API-backed
 * implementation is the integration seam for real data (see docs/PRODUCT_ARCHITECTURE.md).
 */
import { buildContext, type Ctx } from "../analytics/context";
import { DEFAULT_SEED, generateDataset } from "../data/generate";
import type { Dataset } from "../types";

let dataset: Dataset | null = null;
let ctx: Ctx | null = null;

export function getDataset(): Dataset {
  if (!dataset) dataset = generateDataset(DEFAULT_SEED);
  return dataset;
}

export function getContext(): Ctx {
  if (!ctx) ctx = buildContext(getDataset());
  return ctx;
}
