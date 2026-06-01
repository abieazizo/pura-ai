/**
 * v28 — Export the user's Pura data as a JSON file.
 *
 * Honest + dependency-free: no extra file-system or sharing library is
 * installed, so we use what each platform already provides —
 *   • web    → a real Blob download via an anchor click.
 *   • native → the OS share sheet (react-native core `Share`) with the
 *              JSON as the shared payload.
 *
 * Heavy image data (the raw scan photo + composite data URIs) is stripped
 * so the export stays a portable, human-readable record rather than a
 * multi-megabyte blob. Returns true on success; callers surface a toast.
 */

import { Platform, Share } from 'react-native';
import { useAppStore } from '@/store/useAppStore';

export type ExportScope = 'profile' | 'all';

function buildPayload(scope: ExportScope) {
  const s = useAppStore.getState();

  const profile = {
    skinType: s.skinType,
    concerns: s.concerns,
    sensitivity: s.sensitivity,
    goal: s.goal,
    sunExposure: s.sunExposure,
    effort: s.effort,
    ageRange: s.agePreferNotToSay ? 'prefer_not_to_say' : s.ageRange,
    hormoneContext: s.hormoneContext,
    preferences: {
      fragranceFree: s.fragranceSensitive === 'yes',
      pregnancySafeOnly: s.pregnancyCaution === 'yes',
      avoidIngredients: s.avoidIngredients,
    },
  };

  if (scope === 'profile') {
    return {
      app: 'Pura AI',
      kind: 'skin-profile',
      exportedAt: new Date().toISOString(),
      profile,
    };
  }

  // Full export — strip the bulky image data URIs from each scan but
  // keep every analyzed result the user actually owns.
  // `photoUri` is a heavy data URI — drop it from every scan so the export
  // stays a portable, human-readable record rather than a multi-megabyte
  // blob. (The composite preview URI lives on the result, not on Scan.)
  const scans = s.scans.map(({ photoUri, ...rest }) => rest);

  return {
    app: 'Pura AI',
    kind: 'full-export',
    exportedAt: new Date().toISOString(),
    profile,
    scanCount: s.scans.length,
    scans,
    routine: {
      morning: s.userRoutineMorning,
      evening: s.userRoutineEvening,
      saved: s.wishlist,
    },
  };
}

export async function exportUserData(
  scope: ExportScope = 'all',
): Promise<boolean> {
  try {
    const json = JSON.stringify(buildPayload(scope), null, 2);
    const filename = `pura-${scope === 'profile' ? 'profile' : 'data'}-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;

    if (Platform.OS === 'web') {
      if (typeof document === 'undefined') return false;
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    }

    const result = await Share.share({
      title: 'Pura data export',
      message: json,
    });
    return result.action !== Share.dismissedAction;
  } catch {
    return false;
  }
}
