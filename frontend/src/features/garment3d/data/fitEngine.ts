import {
  AvatarMeasurements,
  AvatarProfile,
  FitEvaluation,
  FitStatus,
  FitZone,
  SizeRecommendation,
  FabricProperties,
  PatternPiece2D,
} from '../types';

export const AVATAR_PROFILES: Record<AvatarProfile, AvatarMeasurements & { label: string; description: string }> = {
  STANDARD: {
    label: 'Standard Female (EU 38 / US 6)',
    description: 'Balanced proportions with natural posture',
    height: 172,
    bust: 88,
    waist: 68,
    hips: 94,
    shoulders: 40,
    inseam: 78,
  },
  HOURGLASS: {
    label: 'Hourglass Silhouette',
    description: 'Defined waist with matching bust & hip curves',
    height: 170,
    bust: 94,
    waist: 64,
    hips: 98,
    shoulders: 39,
    inseam: 77,
  },
  ATHLETIC: {
    label: 'Athletic / Toned',
    description: 'Broader shoulders, toned torso, and straight hips',
    height: 176,
    bust: 90,
    waist: 72,
    hips: 92,
    shoulders: 43,
    inseam: 81,
  },
  PEAR: {
    label: 'Pear Shape',
    description: 'Gentle torso with pronounced hip and thigh volume',
    height: 168,
    bust: 84,
    waist: 68,
    hips: 102,
    shoulders: 38,
    inseam: 76,
  },
  INVERTED_TRIANGLE: {
    label: 'Inverted Triangle',
    description: 'Athletic shoulder breadth tapering to narrow hips',
    height: 174,
    bust: 96,
    waist: 70,
    hips: 90,
    shoulders: 44,
    inseam: 79,
  },
  PETITE: {
    label: 'Petite Frame',
    description: 'Compact vertical stature under 162cm',
    height: 158,
    bust: 82,
    waist: 62,
    hips: 88,
    shoulders: 37,
    inseam: 70,
  },
  PLUS_SIZE: {
    label: 'Curvy / Plus (EU 46 / US 14)',
    description: 'Full-figured comfort curve with generous ease',
    height: 172,
    bust: 112,
    waist: 96,
    hips: 120,
    shoulders: 44,
    inseam: 77,
  },
};

// Standard garment size grading chart in cm (Circumferences)
export const GARMENT_SIZE_CHARTS: Record<string, Record<string, Record<FitZone, number>>> = {
  Dress: {
    S: { bust: 86, waist: 66, hips: 92, shoulders: 38, inseam: 76 },
    M: { bust: 92, waist: 72, hips: 98, shoulders: 40, inseam: 78 },
    L: { bust: 98, waist: 78, hips: 104, shoulders: 42, inseam: 80 },
    XL: { bust: 106, waist: 86, hips: 112, shoulders: 44, inseam: 81 },
    XXL: { bust: 114, waist: 94, hips: 120, shoulders: 46, inseam: 82 },
  },
  Hoodie: {
    S: { bust: 104, waist: 96, hips: 98, shoulders: 46, inseam: 76 },
    M: { bust: 110, waist: 102, hips: 104, shoulders: 48, inseam: 78 },
    L: { bust: 116, waist: 108, hips: 110, shoulders: 50, inseam: 80 },
    XL: { bust: 124, waist: 116, hips: 118, shoulders: 52, inseam: 81 },
    XXL: { bust: 132, waist: 124, hips: 126, shoulders: 54, inseam: 82 },
  },
  Jeans: {
    S: { bust: 88, waist: 68, hips: 92, shoulders: 38, inseam: 76 },
    M: { bust: 94, waist: 74, hips: 98, shoulders: 40, inseam: 78 },
    L: { bust: 100, waist: 80, hips: 104, shoulders: 42, inseam: 80 },
    XL: { bust: 108, waist: 88, hips: 112, shoulders: 44, inseam: 81 },
    XXL: { bust: 116, waist: 96, hips: 120, shoulders: 46, inseam: 82 },
  },
  'T-Shirt': {
    S: { bust: 94, waist: 90, hips: 94, shoulders: 42, inseam: 76 },
    M: { bust: 100, waist: 96, hips: 100, shoulders: 44, inseam: 78 },
    L: { bust: 106, waist: 102, hips: 106, shoulders: 46, inseam: 80 },
    XL: { bust: 114, waist: 110, hips: 114, shoulders: 48, inseam: 81 },
    XXL: { bust: 122, waist: 118, hips: 122, shoulders: 50, inseam: 82 },
  },
  Shirt: {
    S: { bust: 96, waist: 88, hips: 94, shoulders: 42, inseam: 76 },
    M: { bust: 102, waist: 94, hips: 100, shoulders: 44, inseam: 78 },
    L: { bust: 108, waist: 100, hips: 106, shoulders: 46, inseam: 80 },
    XL: { bust: 116, waist: 108, hips: 114, shoulders: 48, inseam: 81 },
    XXL: { bust: 124, waist: 116, hips: 122, shoulders: 50, inseam: 82 },
  },
  Blazer: {
    S: { bust: 96, waist: 84, hips: 96, shoulders: 43, inseam: 76 },
    M: { bust: 102, waist: 90, hips: 102, shoulders: 45, inseam: 78 },
    L: { bust: 108, waist: 96, hips: 108, shoulders: 47, inseam: 80 },
    XL: { bust: 116, waist: 104, hips: 116, shoulders: 49, inseam: 81 },
    XXL: { bust: 124, waist: 112, hips: 124, shoulders: 51, inseam: 82 },
  },
};

// Fabric Physical Attributes
export const FABRIC_LIBRARY: Record<string, FabricProperties> = {
  Dress: {
    name: 'Fluid Mulberry Silk Bias-Cut',
    category: 'Silk & Luxury Wovens',
    gsm: 95,
    warpStretch: 3.5,
    weftStretch: 12.0,
    bendingRigidity: 0.08,
    drapeCoefficient: 24.5,
    thicknessMm: 0.18,
    sheer: false,
  },
  Hoodie: {
    name: 'French Terry Organic Cotton Fleece',
    category: 'Heavyweight Knits',
    gsm: 450,
    warpStretch: 15.0,
    weftStretch: 28.0,
    bendingRigidity: 0.65,
    drapeCoefficient: 62.0,
    thicknessMm: 1.85,
    sheer: false,
  },
  Jeans: {
    name: '14oz Japanese Selvedge Twill Denim',
    category: 'Structured Heavy Woven',
    gsm: 475,
    warpStretch: 1.2,
    weftStretch: 3.5,
    bendingRigidity: 1.25,
    drapeCoefficient: 78.0,
    thicknessMm: 1.15,
    sheer: false,
  },
  'T-Shirt': {
    name: '240 GSM Combed Ring-Spun Cotton',
    category: 'Single Jersey Knit',
    gsm: 240,
    warpStretch: 18.0,
    weftStretch: 35.0,
    bendingRigidity: 0.14,
    drapeCoefficient: 38.0,
    thicknessMm: 0.52,
    sheer: false,
  },
  Shirt: {
    name: 'Egyptian Cotton Poplin 100/2',
    category: 'Crisp Shirting Woven',
    gsm: 135,
    warpStretch: 2.0,
    weftStretch: 4.5,
    bendingRigidity: 0.22,
    drapeCoefficient: 45.0,
    thicknessMm: 0.26,
    sheer: false,
  },
  Blazer: {
    name: 'Super 120s Worsted Wool Flannel',
    category: 'Tailored Suiting Wool',
    gsm: 320,
    warpStretch: 4.0,
    weftStretch: 8.5,
    bendingRigidity: 0.85,
    drapeCoefficient: 55.0,
    thicknessMm: 0.78,
    sheer: false,
  },
  Cap: {
    name: 'Hydrophobic Ripstop Technical Twill',
    category: 'Performance Technical Canvas',
    gsm: 210,
    warpStretch: 2.0,
    weftStretch: 5.0,
    bendingRigidity: 1.1,
    drapeCoefficient: 82.0,
    thicknessMm: 0.65,
    sheer: false,
  },
};

/**
 * Evaluates the fit between an avatar's measurements and a selected garment category + size.
 */
export function evaluateFit(
  category: string,
  size: string,
  avatar: AvatarMeasurements
): SizeRecommendation {
  const chart = GARMENT_SIZE_CHARTS[category] || GARMENT_SIZE_CHARTS['Dress'];
  const sizes = ['S', 'M', 'L', 'XL', 'XXL'];

  const evaluateForSize = (s: string) => {
    const garmentDims = chart[s] || chart['M'];
    const zones: FitZone[] = ['bust', 'waist', 'hips', 'shoulders', 'inseam'];

    const evals: Record<FitZone, FitEvaluation> = {} as any;
    let totalScore = 0;

    zones.forEach((zone) => {
      const bodyVal = avatar[zone];
      const garmentVal = garmentDims[zone];
      const ease = garmentVal - bodyVal;

      let status: FitStatus = 'OPTIMAL';
      let statusText = 'Good Fit';

      // Custom thresholds by zone & garment type
      const isOversized = category === 'Hoodie' || category === 'T-Shirt';
      const minOptimalEase = isOversized ? 6 : 2;
      const maxOptimalEase = isOversized ? 24 : 8;

      if (ease < (isOversized ? 2 : 0)) {
        status = 'TIGHT';
        statusText = 'Tight (High Tension)';
      } else if (ease >= (isOversized ? 2 : 0) && ease < minOptimalEase) {
        status = 'SNUG';
        statusText = 'Snug Fit';
      } else if (ease >= minOptimalEase && ease <= maxOptimalEase) {
        status = 'OPTIMAL';
        statusText = 'Good Fit / Optimal';
      } else {
        status = 'LOOSE';
        statusText = 'Relaxed / Loose Drape';
      }

      evals[zone] = {
        zone,
        bodyCm: bodyVal,
        garmentCm: garmentVal,
        easeCm: ease,
        status,
        statusText,
      };

      // Score for finding best size (closer to center of optimal range is best)
      const idealEase = (minOptimalEase + maxOptimalEase) / 2;
      const deviation = Math.abs(ease - idealEase);
      totalScore += deviation;
    });

    return { evals, score: totalScore };
  };

  // Evaluate all sizes to determine Best Option
  let bestSize = 'M';
  let bestScore = Infinity;
  const sizeBreakdown: Record<string, { status: FitStatus; label: string; score: number }> = {};

  sizes.forEach((s) => {
    const { evals, score } = evaluateForSize(s);
    let overallStatus: FitStatus = 'OPTIMAL';

    const hasTight = Object.values(evals).some((e) => e.status === 'TIGHT');
    const hasLoose = Object.values(evals).every((e) => e.status === 'LOOSE');
    const hasSnug = Object.values(evals).some((e) => e.status === 'SNUG');

    if (hasTight) overallStatus = 'TIGHT';
    else if (hasSnug) overallStatus = 'SNUG';
    else if (hasLoose) overallStatus = 'LOOSE';
    else overallStatus = 'OPTIMAL';

    sizeBreakdown[s] = {
      status: overallStatus,
      label:
        overallStatus === 'OPTIMAL'
          ? 'Recommended Fit'
          : overallStatus === 'SNUG'
          ? 'Form Fitting'
          : overallStatus === 'TIGHT'
          ? 'Compression'
          : 'Relaxed Oversized',
      score,
    };

    if (score < bestScore) {
      bestScore = score;
      bestSize = s;
    }
  });

  const currentSizeEvals = evaluateForSize(size).evals;

  const currentSummary =
    size === bestSize
      ? `Size ${size} is your optimal match with ergonomic ease across bust, waist, and hips.`
      : `Size ${size} gives a ${sizeBreakdown[size]?.label.toLowerCase()} drape. Size ${bestSize} is recommended for standard fit.`;

  return {
    bestSize,
    summary: currentSummary,
    evaluations: currentSizeEvals,
    sizeBreakdown,
  };
}

/**
 * 2D Pattern Blueprints for CLO3D Style Technical Pattern Cutting View
 */
export const PATTERN_PIECES_CATALOG: Record<string, PatternPiece2D[]> = {
  Dress: [
    {
      id: 'pattern-dress-front',
      name: 'Front Bodice & Skirt (Cut 1 on Fold)',
      type: 'front',
      viewBox: '0 0 320 600',
      path: 'M 160,20 Q 200,60 215,85 L 265,110 L 245,210 Q 210,230 195,290 L 250,560 Q 160,575 70,560 L 125,290 Q 110,230 75,210 L 55,110 L 105,85 Q 120,60 160,20 Z',
      widthCm: 56,
      heightCm: 115,
      grainLineAngle: 90,
      seamNotches: [
        { x: 265, y: 110, label: 'Armhole Front' },
        { x: 195, y: 290, label: 'Waist Dart Front' },
        { x: 250, y: 560, label: 'Side Hem' },
      ],
      darts: [
        { x1: 195, y1: 290, x2: 180, y2: 240 },
        { x1: 125, y1: 290, x2: 140, y2: 240 },
      ],
    },
    {
      id: 'pattern-dress-back',
      name: 'Back Bodice & Skirt (Cut 2 Pairs with Zipper)',
      type: 'back',
      viewBox: '0 0 320 600',
      path: 'M 160,45 Q 205,65 215,85 L 265,110 L 245,210 Q 210,230 195,290 L 250,560 Q 160,570 70,560 L 125,290 Q 110,230 75,210 L 55,110 L 105,85 Q 115,65 160,45 Z',
      widthCm: 56,
      heightCm: 115,
      grainLineAngle: 90,
      seamNotches: [
        { x: 160, y: 45, label: 'Center Back Seam' },
        { x: 265, y: 110, label: 'Armhole Back' },
        { x: 195, y: 290, label: 'Waist Dart Back' },
      ],
      darts: [
        { x1: 190, y1: 300, x2: 185, y2: 230 },
        { x1: 130, y1: 300, x2: 135, y2: 230 },
      ],
    },
    {
      id: 'pattern-dress-sleeve',
      name: 'Cap Sleeve / Shoulder Drape (Cut 2)',
      type: 'sleeve',
      viewBox: '0 0 240 220',
      path: 'M 20,160 Q 120,20 220,160 L 180,195 Q 120,180 60,195 Z',
      widthCm: 32,
      heightCm: 22,
      grainLineAngle: 90,
      seamNotches: [
        { x: 120, y: 45, label: 'Shoulder Notch' },
        { x: 60, y: 195, label: 'Hem Underarm' },
      ],
    },
  ],
  Hoodie: [
    {
      id: 'pattern-hoodie-front',
      name: 'Oversized Front Panel with Kangaroo Pocket (Cut 1)',
      type: 'front',
      viewBox: '0 0 340 500',
      path: 'M 170,30 Q 220,70 240,80 L 310,120 L 285,250 L 280,440 Q 170,450 60,440 L 55,250 L 30,120 L 100,80 Q 120,70 170,30 Z',
      widthCm: 64,
      heightCm: 76,
      grainLineAngle: 90,
      seamNotches: [
        { x: 170, y: 30, label: 'Center Neck' },
        { x: 310, y: 120, label: 'Shoulder Drop' },
        { x: 285, y: 250, label: 'Underarm Joint' },
      ],
    },
    {
      id: 'pattern-hoodie-hood',
      name: 'Double-Layered Ergonomic Hood (Cut 2 Pairs)',
      type: 'collar',
      viewBox: '0 0 280 340',
      path: 'M 40,290 Q 70,300 130,295 L 240,285 L 240,110 Q 230,20 130,25 Q 40,30 35,130 L 40,290 Z',
      widthCm: 38,
      heightCm: 44,
      grainLineAngle: 0,
      seamNotches: [
        { x: 130, y: 295, label: 'Neck Seam Line' },
        { x: 240, y: 110, label: 'Face Opening Drawstring' },
      ],
    },
    {
      id: 'pattern-hoodie-sleeve',
      name: 'Drop-Shoulder Ribbed Sleeve (Cut 2)',
      type: 'sleeve',
      viewBox: '0 0 280 440',
      path: 'M 20,80 Q 140,15 260,80 L 220,400 L 60,400 Z',
      widthCm: 48,
      heightCm: 62,
      grainLineAngle: 90,
      seamNotches: [
        { x: 140, y: 30, label: 'Drop Shoulder Match' },
        { x: 140, y: 400, label: 'Wrist Rib Join' },
      ],
    },
    {
      id: 'pattern-hoodie-pocket',
      name: 'Front Kangaroo Pouch Pocket (Cut 1)',
      type: 'pocket',
      viewBox: '0 0 240 180',
      path: 'M 60,20 L 180,20 L 220,100 L 210,160 L 30,160 L 20,100 Z',
      widthCm: 36,
      heightCm: 24,
      grainLineAngle: 90,
      seamNotches: [{ x: 120, y: 20, label: 'Center Front Alignment' }],
    },
  ],
  Jeans: [
    {
      id: 'pattern-jeans-front',
      name: 'Front Leg Panel with Coin & Curve Pocket (Cut 2)',
      type: 'front',
      viewBox: '0 0 280 620',
      path: 'M 50,30 L 190,30 L 185,150 Q 230,210 240,240 L 220,590 L 70,590 L 60,280 Q 40,210 40,140 Z',
      widthCm: 44,
      heightCm: 106,
      grainLineAngle: 90,
      seamNotches: [
        { x: 50, y: 30, label: 'Fly Front' },
        { x: 240, y: 240, label: 'Crotch Apex' },
        { x: 220, y: 590, label: 'Inseam Hem' },
      ],
    },
    {
      id: 'pattern-jeans-back',
      name: 'Back Leg Panel with Back Yoke Curve (Cut 2)',
      type: 'back',
      viewBox: '0 0 300 620',
      path: 'M 40,30 L 200,30 L 210,140 Q 260,230 270,270 L 230,590 L 70,590 L 60,300 Q 30,220 30,130 Z',
      widthCm: 48,
      heightCm: 108,
      grainLineAngle: 90,
      seamNotches: [
        { x: 200, y: 30, label: 'Back Yoke Seam' },
        { x: 270, y: 270, label: 'Back Crotch Inseam' },
      ],
    },
    {
      id: 'pattern-jeans-yoke',
      name: 'Ergonomic Denim Back Yoke (Cut 2)',
      type: 'waistband',
      viewBox: '0 0 220 100',
      path: 'M 20,25 L 200,20 L 190,75 L 20,65 Z',
      widthCm: 38,
      heightCm: 12,
      grainLineAngle: 45,
      seamNotches: [{ x: 110, y: 22, label: 'Waistband Join' }],
    },
  ],
  'T-Shirt': [
    {
      id: 'pattern-tshirt-front',
      name: 'Front Relaxed Crewneck (Cut 1 on Fold)',
      type: 'front',
      viewBox: '0 0 300 480',
      path: 'M 150,40 Q 190,75 210,85 L 270,110 L 250,210 L 245,430 L 55,430 L 50,210 L 30,110 L 90,85 Q 110,75 150,40 Z',
      widthCm: 56,
      heightCm: 72,
      grainLineAngle: 90,
      seamNotches: [
        { x: 150, y: 40, label: 'Center Front Rib' },
        { x: 270, y: 110, label: 'Shoulder Drop' },
      ],
    },
    {
      id: 'pattern-tshirt-back',
      name: 'Back Panel (Cut 1 on Fold)',
      type: 'back',
      viewBox: '0 0 300 480',
      path: 'M 150,55 Q 190,75 210,85 L 270,110 L 250,210 L 245,430 L 55,430 L 50,210 L 30,110 L 90,85 Q 110,75 150,55 Z',
      widthCm: 56,
      heightCm: 72,
      grainLineAngle: 90,
      seamNotches: [{ x: 150, y: 55, label: 'Center Back Rib' }],
    },
    {
      id: 'pattern-tshirt-sleeve',
      name: 'Elbow-Length Sleeve (Cut 2)',
      type: 'sleeve',
      viewBox: '0 0 240 280',
      path: 'M 20,80 Q 120,20 220,80 L 195,250 L 45,250 Z',
      widthCm: 44,
      heightCm: 32,
      grainLineAngle: 90,
      seamNotches: [{ x: 120, y: 35, label: 'Shoulder Notch' }],
    },
  ],
};

