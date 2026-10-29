import { useEffect, useState } from 'react';
import type { CommunityImpact, CommunityImpactSource } from '../lib/communityImpact';

// Reads the community totals whenever a source is supplied (T-081). The App passes one only while
// the Impact screen is open, so each visit shows a fresh number and closed screens cost nothing.
// A failure leaves null and the screen keeps its honest note. The totals are decoration, never a
// reason to show an error.
export function useCommunityImpact(source: CommunityImpactSource | null): CommunityImpact | null {
  const [impact, setImpact] = useState<CommunityImpact | null>(null);

  useEffect(() => {
    if (source === null) return;
    let cancelled = false;
    source
      .fetch()
      .then((found) => {
        if (!cancelled) setImpact(found);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [source]);

  return source === null ? null : impact;
}
