import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Keep motion off until the device preference is known. */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    let active = true;
    let revision = 0;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      revision++;
      if (active) setReducedMotion(enabled);
    });
    const initialRevision = revision;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        // A preference event can arrive while the initial native query is pending.
        if (active && revision === initialRevision) setReducedMotion(enabled);
      })
      .catch(() => undefined);

    return () => { active = false; subscription.remove(); };
  }, []);

  return reducedMotion;
}
