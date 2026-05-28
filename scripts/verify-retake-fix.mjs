/**
 * Standalone verification of the retake-loop bug fix.
 *
 * Inlines the (post-fix) `classifyScanUsability` function and runs it
 * against a battery of inputs that model real-world scan AI responses.
 * If any assertion fails, the script exits non-zero.
 *
 * Run: `node scripts/verify-retake-fix.mjs`
 *
 * Why inline: the real module imports from `@/...` paths and relative
 * neighbors. Inlining keeps the test dependency-free.
 * IMPORTANT: when the function in
 * `src/services/scanResults/translateAnalysis.ts` changes, update this
 * mirror or run the in-app translator instead.
 */

const AI_ISSUE_TO_USER = {
  blurry: 'blur',
  low_light: 'low_light',
  angled: 'angle',
  partial_face: 'partial_face',
  occluded: 'obstruction',
};

function mapIssues(raw) {
  const out = [];
  for (const r of raw) {
    const mapped = AI_ISSUE_TO_USER[r];
    if (mapped && !out.includes(mapped)) out.push(mapped);
  }
  return out;
}

// Mirror of post-fix classifyScanUsability in translateAnalysis.ts.
function classifyScanUsability(input) {
  const reasons = [];
  const issues = mapIssues(input.issues);

  if (!input.hasAnalysis) {
    reasons.push('Analysis service did not return a structured result');
    return { usability: 'retake_required', reasons, issues };
  }

  if (!input.faceDetected && input.rawConfidence < 0.2) {
    reasons.push('No face detected in the photo');
    return { usability: 'retake_required', reasons, issues };
  }

  const severeBlur =
    input.issues.includes('blurry') && input.rawConfidence < 0.15;
  const majorZonesMissing =
    input.issues.includes('partial_face') && input.rawConfidence < 0.15;
  const extremeExposure =
    (input.issues.includes('low_light') || input.issues.includes('harsh_light')) &&
    input.rawConfidence < 0.12;

  if (severeBlur) {
    reasons.push('Photo is too blurry to read');
    return { usability: 'retake_required', reasons, issues };
  }
  if (majorZonesMissing) {
    reasons.push('Most of the face is outside the frame');
    return { usability: 'retake_required', reasons, issues };
  }
  if (extremeExposure) {
    reasons.push('Lighting makes the photo unreadable');
    return { usability: 'retake_required', reasons, issues };
  }

  const moderateConfidence = input.rawConfidence < 0.5;
  const moderateBlur = input.issues.includes('blurry');
  const offAngle = input.issues.includes('angled');
  const unevenLighting =
    input.issues.includes('low_light') || input.issues.includes('harsh_light');
  const partialFace = input.issues.includes('partial_face');
  const occluded = input.issues.includes('occluded');

  const limitedSignals = [
    moderateBlur,
    offAngle,
    unevenLighting,
    partialFace,
    occluded,
    moderateConfidence,
  ].filter(Boolean).length;

  if (limitedSignals > 0) {
    if (moderateBlur) reasons.push('Photo is a little soft');
    if (offAngle) reasons.push('Face is slightly off-angle');
    if (unevenLighting) reasons.push('Lighting is uneven');
    if (partialFace) reasons.push('Part of the face is out of frame');
    if (occluded) reasons.push('Part of the face is covered');
    if (reasons.length === 0) reasons.push('Some areas were harder to read');
    return { usability: 'limited_results', reasons, issues };
  }

  return { usability: 'full_results', reasons: [], issues };
}

const cases = [
  {
    name: 'A. Clear everyday selfie with normal findings',
    input: {
      hasAnalysis: true,
      faceDetected: true,
      rawConfidence: 0.78,
      issues: [],
      findingCount: 3,
      supportedFindingCount: 2,
    },
    expect: 'full_results',
  },
  {
    name: 'B. Clear face, zero findings (genuinely clean skin)',
    input: {
      hasAnalysis: true,
      faceDetected: true,
      rawConfidence: 0.72,
      issues: [],
      findingCount: 0,
      supportedFindingCount: 0,
    },
    expect: 'full_results',
  },
  {
    name: 'C. Clear face, AI returned analysis but no face_overlay (validator stripped)',
    input: {
      hasAnalysis: true,
      // New buildQuality maps hasAnalysis -> faceDetected so this is true.
      faceDetected: true,
      rawConfidence: 0.7,
      issues: [],
      findingCount: 0,
      supportedFindingCount: 0,
    },
    expect: 'full_results',
  },
  {
    name: 'D. Mild shadow, real findings',
    input: {
      hasAnalysis: true,
      faceDetected: true,
      rawConfidence: 0.45,
      issues: ['low_light'],
      findingCount: 2,
      supportedFindingCount: 1,
    },
    expect: 'limited_results',
  },
  {
    name: 'E. Slight off-angle, ordinary photo',
    input: {
      hasAnalysis: true,
      faceDetected: true,
      rawConfidence: 0.58,
      issues: ['angled'],
      findingCount: 2,
      supportedFindingCount: 1,
    },
    expect: 'limited_results',
  },
  {
    name: 'F. Severe blur, very low confidence',
    input: {
      hasAnalysis: true,
      faceDetected: true,
      rawConfidence: 0.1,
      issues: ['blurry'],
      findingCount: 0,
      supportedFindingCount: 0,
    },
    expect: 'retake_required',
  },
  {
    name: 'G. Extremely dark, very low confidence',
    input: {
      hasAnalysis: true,
      faceDetected: true,
      rawConfidence: 0.08,
      issues: ['low_light'],
      findingCount: 0,
      supportedFindingCount: 0,
    },
    expect: 'retake_required',
  },
  {
    name: 'H. No analysis returned (translator only — real service errors go via ScanServiceErrorScreen)',
    input: {
      hasAnalysis: false,
      faceDetected: false,
      rawConfidence: 0,
      issues: [],
      findingCount: 0,
      supportedFindingCount: 0,
    },
    expect: 'retake_required',
  },
  {
    name: 'I. No face detected AND extremely low confidence',
    input: {
      hasAnalysis: true,
      faceDetected: false,
      rawConfidence: 0.05,
      issues: [],
      findingCount: 0,
      supportedFindingCount: 0,
    },
    expect: 'retake_required',
  },
  {
    name: 'J. Borderline confidence with mild lighting (previously rejected pre-fix at 0.22 cutoff)',
    input: {
      hasAnalysis: true,
      faceDetected: true,
      rawConfidence: 0.3,
      issues: ['low_light'],
      findingCount: 1,
      supportedFindingCount: 1,
    },
    expect: 'limited_results',
  },
  {
    name: 'K. Mild blur, but face detected and findings present (previously failed pre-fix at 0.25 cutoff)',
    input: {
      hasAnalysis: true,
      faceDetected: true,
      rawConfidence: 0.2,
      issues: ['blurry'],
      findingCount: 1,
      supportedFindingCount: 1,
    },
    expect: 'limited_results',
  },
  {
    name: 'L. Average phone selfie, confidence 0.6, no issues',
    input: {
      hasAnalysis: true,
      faceDetected: true,
      rawConfidence: 0.6,
      issues: [],
      findingCount: 2,
      supportedFindingCount: 2,
    },
    expect: 'full_results',
  },
];

let passed = 0;
let failed = 0;
for (const c of cases) {
  const result = classifyScanUsability(c.input);
  const ok = result.usability === c.expect;
  if (ok) {
    passed += 1;
    console.log(`PASS  ${c.name}`);
    console.log(`      usability=${result.usability}`);
  } else {
    failed += 1;
    console.error(`FAIL  ${c.name}`);
    console.error(`      expected=${c.expect} got=${result.usability}`);
    console.error(`      reasons=${JSON.stringify(result.reasons)}`);
  }
}

console.log(`\nResult: ${passed} passed, ${failed} failed.`);
process.exit(failed > 0 ? 1 : 0);
