"use client";
import { useEffect, useMemo, useState } from "react";
import type { TemplateRecord, TemplateSearchInput } from "../services/templateService";

export function useDebouncedTemplateSearch(input: TemplateSearchInput, delay = 250) {
  const [debounced, setDebounced] = useState(input);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(input), delay);
    return () => clearTimeout(timer);
  }, [input, delay]);
  return useMemo(() => debounced, [debounced]);
}

export function useTemplateSelection(initial: TemplateRecord[] = []) {
  const [selected, setSelected] = useState<TemplateRecord[]>(initial);
  return { selected, setSelected, clear: () => setSelected([]) };
}
