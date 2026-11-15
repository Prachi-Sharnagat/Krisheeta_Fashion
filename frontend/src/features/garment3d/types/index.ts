export interface VariantData {
  id: string;
  name: string;
  sku?: string | null;
  color?: string | null;
  size?: string | null;
  price?: number | null;
  finishedGoodsStock?: number | null;
  status?: string;
}

export interface Product3DModelData {
  id: string;
  productId: string;
  modelUrl: string;
  thumbnailUrl?: string | null;
  defaultColor?: string | null;
  scale?: number;
  status: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductWith3D {
  id: string;
  name: string;
  description?: string | null;
  sku?: string | null;
  category?: string | null;
  garmentType?: string | null;
  finishedGoodsStock?: number | null;
  status: string;
  product3dModel?: Product3DModelData | null;
  variants?: VariantData[];
}

export type GarmentCategoryKey = 'ALL' | 'Dress' | 'T-Shirt' | 'Jeans' | 'Blazer' | 'Shirt' | 'Hoodie' | 'Cap';

export type ViewMode = 'TECHNICAL' | 'REALISTIC';

export interface GarmentCategoryItem {
  key: GarmentCategoryKey;
  label: string;
  iconName: string;
}

// ==========================================
// AVATAR & FIT-CHECK SYSTEM TYPES
// ==========================================

export interface AvatarMeasurements {
  height: number;     // cm (e.g. 175)
  bust: number;       // cm circumference (e.g. 90)
  waist: number;      // cm circumference (e.g. 68)
  hips: number;       // cm circumference (e.g. 96)
  shoulders: number;  // cm breadth (e.g. 40)
  inseam: number;     // cm leg inseam (e.g. 80)
}

export type AvatarProfile =
  | 'STANDARD'
  | 'HOURGLASS'
  | 'ATHLETIC'
  | 'PEAR'
  | 'INVERTED_TRIANGLE'
  | 'PETITE'
  | 'PLUS_SIZE';

export type AvatarPose = 'A_POSE' | 'T_POSE';

export type AvatarStyle = 'MANNEQUIN' | 'NATURAL' | 'WIREFRAME';

export type FitZone = 'bust' | 'waist' | 'hips' | 'shoulders' | 'inseam';

export type FitStatus = 'OPTIMAL' | 'SNUG' | 'TIGHT' | 'LOOSE';

export interface FitEvaluation {
  zone: FitZone;
  bodyCm: number;
  garmentCm: number;
  easeCm: number;
  status: FitStatus;
  statusText: string;
}

export interface SizeRecommendation {
  bestSize: string;
  summary: string;
  evaluations: Record<FitZone, FitEvaluation>;
  sizeBreakdown: Record<string, { status: FitStatus; label: string; score: number }>;
}

export interface FabricProperties {
  name: string;
  category: string;
  gsm: number;
  warpStretch: number; // percentage %
  weftStretch: number; // percentage %
  bendingRigidity: number; // gf·cm
  drapeCoefficient: number; // percentage %
  thicknessMm: number;
  sheer: boolean;
}

export interface PatternPiece2D {
  id: string;
  name: string;
  type: 'front' | 'back' | 'sleeve' | 'collar' | 'waistband' | 'pocket' | 'cuff';
  path: string; // SVG path
  viewBox: string;
  widthCm: number;
  heightCm: number;
  grainLineAngle: number;
  seamNotches: { x: number; y: number; label: string }[];
  darts?: { x1: number; y1: number; x2: number; y2: number }[];
}

export type StudioLayoutMode = '3D_VIEW' | 'DUAL_CLO3D' | '2D_PATTERN';
