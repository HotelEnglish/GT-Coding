import { ApiConfig, ReferenceDoc, TerminologyConfig } from '../types';

const KEYS = {
  API_CFG: 'gt_api_cfg',
  REFERENCE_DOCS: 'gt_ref_docs',
  TERMINOLOGY: 'gt_terminology',
};

// ==========================================
// API CONFIG
// ==========================================
export function loadApiConfig(): ApiConfig {
  try {
    const raw = localStorage.getItem(KEYS.API_CFG);
    if (raw) return JSON.parse(raw) as ApiConfig;
  } catch (_) { /* ignore */ }
  return {
    baseurl: 'https://api.anthropic.com',
    model: 'claude-sonnet-4-5',
    apikey: '',
    mode: 'anthropic',
  };
}

export function saveApiConfig(cfg: ApiConfig): void {
  localStorage.setItem(KEYS.API_CFG, JSON.stringify(cfg));
}

// ==========================================
// REFERENCE DOCS
// ==========================================
export function loadReferenceDocs(): ReferenceDoc[] {
  try {
    const raw = localStorage.getItem(KEYS.REFERENCE_DOCS);
    if (raw) return JSON.parse(raw) as ReferenceDoc[];
  } catch (_) { /* ignore */ }
  return [];
}

export function saveReferenceDocs(docs: ReferenceDoc[]): void {
  // Store without rawText to save space (only keep summary + metadata)
  const compact = docs.map((d) => ({ ...d, rawText: '' }));
  try {
    localStorage.setItem(KEYS.REFERENCE_DOCS, JSON.stringify(compact));
  } catch (_) {
    // localStorage quota exceeded — store only metadata
    const minimal = docs.map(({ id, name, size, uploadedAt, summary, summaryStatus }) => ({
      id, name, size, uploadedAt, summary, summaryStatus, rawText: '',
    }));
    localStorage.setItem(KEYS.REFERENCE_DOCS, JSON.stringify(minimal));
  }
}

// ==========================================
// TERMINOLOGY
// ==========================================
export function loadTerminology(): TerminologyConfig {
  try {
    const raw = localStorage.getItem(KEYS.TERMINOLOGY);
    if (raw) return JSON.parse(raw) as TerminologyConfig;
  } catch (_) { /* ignore */ }
  return { styleDescription: '', terms: [] };
}

export function saveTerminology(cfg: TerminologyConfig): void {
  localStorage.setItem(KEYS.TERMINOLOGY, JSON.stringify(cfg));
}
