import { useState, useCallback } from 'react';
import {
  ApiConfig,
  ReferenceDoc,
  TerminologyConfig,
  TheoryParadigm,
  CodingResult,
  MemoItem,
  ActiveModule,
  CodingDepth,
} from '../types';
import {
  loadApiConfig,
  saveApiConfig,
  loadReferenceDocs,
  saveReferenceDocs,
  loadTerminology,
  saveTerminology,
} from '../utils/storage';

// We use a simple React state pattern (no external lib needed for MVP)
// This hook is meant to be used at the App level and props-drilled down.

export function useAppStore() {
  // ── API CONFIG ──────────────────────────────
  const [apiConfig, setApiConfigState] = useState<ApiConfig>(loadApiConfig);

  const saveApiConfigAndPersist = useCallback((cfg: ApiConfig) => {
    setApiConfigState(cfg);
    saveApiConfig(cfg);
  }, []);

  // ── REFERENCE LIBRARY ───────────────────────
  const [referenceDocs, setReferenceDocsState] = useState<ReferenceDoc[]>(loadReferenceDocs);

  const setReferenceDocs = useCallback((docs: ReferenceDoc[] | ((prev: ReferenceDoc[]) => ReferenceDoc[])) => {
    setReferenceDocsState((prev) => {
      const next = typeof docs === 'function' ? docs(prev) : docs;
      saveReferenceDocs(next);
      return next;
    });
  }, []);

  // ── TERMINOLOGY ──────────────────────────────
  const [terminology, setTerminologyState] = useState<TerminologyConfig>(loadTerminology);

  const setTerminology = useCallback((cfg: TerminologyConfig) => {
    setTerminologyState(cfg);
    saveTerminology(cfg);
  }, []);

  // ── THEORY SELECTION ─────────────────────────
  const [selectedTheory, setSelectedTheory] = useState<TheoryParadigm | null>(null);

  // ── CODING STATE ─────────────────────────────
  const [codingResult, setCodingResult] = useState<CodingResult | null>(null);
  const [codingDepth, setCodingDepth] = useState<CodingDepth>('std');
  const [domain, setDomain] = useState('');
  const [memos, setMemos] = useState<MemoItem[]>([]);

  const addMemo = useCallback((text: string, isAI = false, theory?: TheoryParadigm) => {
    const item: MemoItem = {
      id: Date.now().toString(),
      text,
      timestamp: new Date().toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      isAI,
      theory,
    };
    setMemos((prev) => [...prev, item]);
  }, []);

  const clearMemos = useCallback(() => setMemos([]), []);

  // ── NAVIGATION ───────────────────────────────
  const [activeModule, setActiveModule] = useState<ActiveModule>(() => {
    // First visit lands on the researcher workbench; the legacy coding
    // snapshot module is no longer reachable from navigation.
    return 'workbench';
  });

  return {
    // API
    apiConfig,
    saveApiConfig: saveApiConfigAndPersist,

    // Library
    referenceDocs,
    setReferenceDocs,

    // Terminology
    terminology,
    setTerminology,

    // Theory
    selectedTheory,
    setSelectedTheory,

    // Coding
    codingResult,
    setCodingResult,
    codingDepth,
    setCodingDepth,
    domain,
    setDomain,
    memos,
    addMemo,
    clearMemos,

    // Nav
    activeModule,
    setActiveModule,
  };
}

export type AppStore = ReturnType<typeof useAppStore>;
