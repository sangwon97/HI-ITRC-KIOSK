import { useDeferredValue, useMemo } from 'react';
import { searchBooths } from '../data/booths';

export default function useBoothSearch(query) {
  const deferredQuery = useDeferredValue(query);
  const hasSearched = query.trim().length >= 1;

  const results = useMemo(() => {
    if (deferredQuery.trim().length < 1) {
      return [];
    }

    return searchBooths(deferredQuery.trim());
  }, [deferredQuery]);

  return {
    hasSearched,
    results,
  };
}
