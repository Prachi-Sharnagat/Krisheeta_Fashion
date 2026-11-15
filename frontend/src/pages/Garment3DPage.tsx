import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GarmentViewer, GarmentViewerHandle } from '../features/garment3d/components/GarmentViewer';
import { ViewerControls } from '../features/garment3d/components/ViewerControls';
import { GarmentInfoPanel } from '../features/garment3d/components/GarmentInfoPanel';
import { GarmentCategoryNav } from '../features/garment3d/components/GarmentCategoryNav';
import { PatternWindow2D } from '../features/garment3d/components/PatternWindow2D';
import { AvatarMeasureDrawer } from '../features/garment3d/components/AvatarMeasureDrawer';
import {
  ProductWith3D,
  VariantData,
  GarmentCategoryKey,
  ViewMode,
  AvatarMeasurements,
  AvatarProfile,
  AvatarStyle,
  AvatarPose,
  StudioLayoutMode,
  FitZone,
} from '../features/garment3d/types';
import { PRESET_GARMENTS } from '../features/garment3d/data/garment3d';
import { evaluateFit, AVATAR_PROFILES } from '../features/garment3d/data/fitEngine';
import { getToken, getUser } from '../utils/auth';
import {
  Box,
  RefreshCw,
  Sparkles,
  User,
  Scissors,
  SplitSquareVertical,
  Activity,
  Flame,
  Ruler,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Garment3DPage = () => {
  const viewerRef = useRef<GarmentViewerHandle>(null);
  const [dbProducts, setDbProducts] = useState<ProductWith3D[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Category & Navigation state
  const [selectedCategory, setSelectedCategory] = useState<GarmentCategoryKey>('ALL');
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Studio Display options
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('TECHNICAL');
  const [selectedColor, setSelectedColor] = useState<string>('#06b6d4');
  const [selectedSize, setSelectedSize] = useState<string>('M');
  const [selectedVariant, setSelectedVariant] = useState<VariantData | null>(null);

  // CLO3D & GRIZAS Virtual Try-On & Avatar State
  const [tryOnMode, setTryOnMode] = useState<boolean>(true);
  const [showFitBands, setShowFitBands] = useState<boolean>(true);
  const [tensionHeatmap, setTensionHeatmap] = useState<boolean>(false);
  const [layoutMode, setLayoutMode] = useState<StudioLayoutMode>('DUAL_CLO3D');
  const [activeZone, setActiveZone] = useState<FitZone | null>(null);
  const [isMeasureModalOpen, setIsMeasureModalOpen] = useState<boolean>(false);

  // Avatar Measurements & Profiles
  const [avatarProfile, setAvatarProfile] = useState<AvatarProfile>('STANDARD');
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>('MANNEQUIN');
  const [avatarPose, setAvatarPose] = useState<AvatarPose>('A_POSE');
  const [measurements, setMeasurements] = useState<AvatarMeasurements>({
    height: 172,
    bust: 88,
    waist: 68,
    hips: 94,
    shoulders: 40,
    inseam: 78,
  });

  const user = getUser();

  // Fetch items from backend API
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/3d-garments', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.products && Array.isArray(data.products)) {
          setDbProducts(data.products);
        }
      }
    } catch (err) {
      console.error('API fetch error, using preset catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Merge DB products with Preset catalogue to ensure complete category coverage
  const allProducts = useMemo(() => {
    const list: ProductWith3D[] = [];

    // First add db products that have 3D configs
    dbProducts.forEach((p) => {
      if (p.product3dModel?.modelUrl) {
        list.push(p);
      }
    });

    // Fill missing categories or add presets if list is small
    PRESET_GARMENTS.forEach((preset) => {
      const existsInDb = list.some(
        (p) => p.category?.toLowerCase() === preset.category?.toLowerCase()
      );
      if (!existsInDb || list.length < 5) {
        if (!list.some((p) => p.id === preset.id)) {
          list.push(preset);
        }
      }
    });

    return list.length > 0 ? list : PRESET_GARMENTS;
  }, [dbProducts]);

  // Filter products by selected category
  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'ALL') return allProducts;
    return allProducts.filter(
      (p) => p.category?.toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [allProducts, selectedCategory]);

  // Category counts map
  const countsPerCategory = useMemo(() => {
    const counts: Record<string, number> = { ALL: allProducts.length };
    allProducts.forEach((p) => {
      const cat = p.category || 'General';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [allProducts]);

  // Keep index within bounds when category changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [selectedCategory]);

  const currentProduct = filteredProducts[currentIndex] || filteredProducts[0] || null;

  // Real-time Fit Recommendation Calculation
  const fitRecommendation = useMemo(() => {
    const category = currentProduct?.category || selectedCategory || 'Dress';
    return evaluateFit(category, selectedSize, measurements);
  }, [currentProduct?.category, selectedCategory, selectedSize, measurements]);

  // Sync color & variant when active product changes
  useEffect(() => {
    if (currentProduct) {
      if (currentProduct.product3dModel?.defaultColor) {
        setSelectedColor(currentProduct.product3dModel.defaultColor);
      } else {
        setSelectedColor('#06b6d4');
      }

      if (currentProduct.variants && currentProduct.variants.length > 0) {
        const firstVar = currentProduct.variants[0];
        setSelectedVariant(firstVar);
        if (firstVar.color) setSelectedColor(firstVar.color);
        if (firstVar.size) setSelectedSize(firstVar.size);
      } else {
        setSelectedVariant(null);
      }
    }
  }, [currentProduct?.id]);

  const handlePrevGarment = () => {
    if (filteredProducts.length === 0) return;
    const prevIdx = (currentIndex - 1 + filteredProducts.length) % filteredProducts.length;
    setCurrentIndex(prevIdx);
  };

  const handleNextGarment = () => {
    if (filteredProducts.length === 0) return;
    const nextIdx = (currentIndex + 1) % filteredProducts.length;
    setCurrentIndex(nextIdx);
  };

  return (
    <div className="min-h-screen bg-[#050814] text-slate-100 p-3 sm:p-5 md:p-8 space-y-6 select-none">
      {/* Studio Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-950/80 backdrop-blur-md border border-cyan-900/40 p-4 sm:p-5 rounded-3xl shadow-2xl">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-[10px] font-mono font-bold text-cyan-300">
              3D VISUALIZATION ENGINE v2.5
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-950 border border-purple-500/40 text-[10px] font-mono font-bold text-purple-300">
              CLO3D & GRIZAS FIT ENGINE
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700/60 text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              SIMULATION READY
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            3D Garment Studio & Virtual Try-On
            <Sparkles className="h-6 w-6 text-cyan-400 animate-pulse" />
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Real-time parametric avatar try-on, tension fit bands, CLO3D dual-pane 2D pattern blueprints, and ERP variant sync.
          </p>
        </div>

        {/* Top-Right Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Workspace Mode Quick Switcher */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-900/90 border border-cyan-900/40 p-1 rounded-2xl">
            <button
              onClick={() => setLayoutMode('3D_VIEW')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition ${
                layoutMode === '3D_VIEW'
                  ? 'bg-cyan-950 border border-cyan-400 text-cyan-300 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              3D Only
            </button>
            <button
              onClick={() => setLayoutMode('DUAL_CLO3D')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                layoutMode === 'DUAL_CLO3D'
                  ? 'bg-purple-950 border border-purple-400 text-purple-300 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <SplitSquareVertical className="h-3.5 w-3.5" />
              CLO3D Dual View
            </button>
            <button
              onClick={() => setLayoutMode('2D_PATTERN')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                layoutMode === '2D_PATTERN'
                  ? 'bg-blue-950 border border-blue-400 text-blue-300 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Scissors className="h-3.5 w-3.5" />
              2D Pattern
            </button>
          </div>

          {/* Edit Measurements Trigger */}
          <button
            onClick={() => setIsMeasureModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 font-mono text-xs font-bold rounded-2xl shadow transition"
          >
            <Ruler className="h-4 w-4 text-cyan-400" />
            Avatar Fit & Measurements
          </button>

          {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
            <Link
              to="/3d-garment/manage"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold rounded-2xl shadow-lg shadow-cyan-500/20 transition"
            >
              <Box className="h-4 w-4" /> Manage 3D Models
            </Link>
          )}
        </div>
      </div>

      {loading && dbProducts.length === 0 ? (
        <div className="bg-slate-950/80 rounded-3xl border border-cyan-900/40 p-12 flex flex-col items-center justify-center min-h-[450px]">
          <RefreshCw className="h-8 w-8 text-cyan-400 animate-spin mb-3" />
          <p className="text-xs font-mono font-bold text-cyan-300">Initializing 3D Simulation Environment...</p>
        </div>
      ) : (
        /* MAIN STUDIO LAYOUT: Left Rail + Center Stage (3D / Dual Split / 2D Pattern) + Right Specs Panel */
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* LEFT: Category Navigation Rail */}
          <GarmentCategoryNav
            selectedCategory={selectedCategory}
            onSelectCategory={(cat) => setSelectedCategory(cat)}
            countsPerCategory={countsPerCategory}
          />

          {/* CENTER STAGE: DYNAMIC BASED ON LAYOUT MODE */}
          <div className="flex-1 w-full space-y-4 min-w-0">
            {/* Mode 1: STANDARD 3D VIEW */}
            {layoutMode === '3D_VIEW' && (
              <>
                <GarmentViewer
                  ref={viewerRef}
                  modelUrl={currentProduct?.product3dModel?.modelUrl}
                  color={selectedColor}
                  scale={currentProduct?.product3dModel?.scale || 1.0}
                  autoRotate={autoRotate}
                  onToggleAutoRotate={() => setAutoRotate(!autoRotate)}
                  viewMode={viewMode}
                  onToggleViewMode={() =>
                    setViewMode(viewMode === 'TECHNICAL' ? 'REALISTIC' : 'TECHNICAL')
                  }
                  onPrevGarment={handlePrevGarment}
                  onNextGarment={handleNextGarment}
                  currentIndex={currentIndex}
                  totalGarments={filteredProducts.length}
                  onSelectIndex={(idx) => setCurrentIndex(idx)}
                  categoryName={currentProduct?.category || selectedCategory}
                  productName={currentProduct?.name}
                  tryOnMode={tryOnMode}
                  onToggleTryOn={() => setTryOnMode(!tryOnMode)}
                  showFitBands={showFitBands}
                  onToggleFitBands={() => setShowFitBands(!showFitBands)}
                  tensionHeatmap={tensionHeatmap}
                  onToggleTensionHeatmap={() => setTensionHeatmap(!tensionHeatmap)}
                  measurements={measurements}
                  avatarStyle={avatarStyle}
                  avatarPose={avatarPose}
                  fitRecommendation={fitRecommendation}
                  selectedSize={selectedSize}
                  activeZone={activeZone}
                  onSelectZone={(z) => setActiveZone(z)}
                  onOpenMeasurements={() => setIsMeasureModalOpen(true)}
                />

                <ViewerControls
                  autoRotate={autoRotate}
                  onToggleAutoRotate={() => setAutoRotate(!autoRotate)}
                  onFrontView={() => viewerRef.current?.setFrontView()}
                  onBackView={() => viewerRef.current?.setBackView()}
                  onResetView={() => viewerRef.current?.resetView()}
                  onZoomIn={() => viewerRef.current?.zoomIn()}
                  onZoomOut={() => viewerRef.current?.zoomOut()}
                  onPrevGarment={handlePrevGarment}
                  onNextGarment={handleNextGarment}
                  currentIndex={currentIndex}
                  totalGarments={filteredProducts.length}
                />
              </>
            )}

            {/* Mode 2: CLO3D DUAL-PANE VIEW (3D Avatar Simulation on Left + 2D Pattern Window on Right) */}
            {layoutMode === 'DUAL_CLO3D' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {/* Pane A: 3D Simulation Viewport */}
                  <div className="w-full">
                    <GarmentViewer
                      ref={viewerRef}
                      modelUrl={currentProduct?.product3dModel?.modelUrl}
                      color={selectedColor}
                      scale={currentProduct?.product3dModel?.scale || 1.0}
                      autoRotate={autoRotate}
                      onToggleAutoRotate={() => setAutoRotate(!autoRotate)}
                      viewMode={viewMode}
                      onToggleViewMode={() =>
                        setViewMode(viewMode === 'TECHNICAL' ? 'REALISTIC' : 'TECHNICAL')
                      }
                      onPrevGarment={handlePrevGarment}
                      onNextGarment={handleNextGarment}
                      currentIndex={currentIndex}
                      totalGarments={filteredProducts.length}
                      onSelectIndex={(idx) => setCurrentIndex(idx)}
                      categoryName={currentProduct?.category || selectedCategory}
                      productName={currentProduct?.name}
                      tryOnMode={tryOnMode}
                      onToggleTryOn={() => setTryOnMode(!tryOnMode)}
                      showFitBands={showFitBands}
                      onToggleFitBands={() => setShowFitBands(!showFitBands)}
                      tensionHeatmap={tensionHeatmap}
                      onToggleTensionHeatmap={() => setTensionHeatmap(!tensionHeatmap)}
                      measurements={measurements}
                      avatarStyle={avatarStyle}
                      avatarPose={avatarPose}
                      fitRecommendation={fitRecommendation}
                      selectedSize={selectedSize}
                      activeZone={activeZone}
                      onSelectZone={(z) => setActiveZone(z)}
                      onOpenMeasurements={() => setIsMeasureModalOpen(true)}
                    />
                  </div>

                  {/* Pane B: 2D Pattern Cutting Window */}
                  <div className="w-full h-full min-h-[520px] md:min-h-[620px]">
                    <PatternWindow2D
                      category={currentProduct?.category || selectedCategory || 'Dress'}
                      selectedColor={selectedColor}
                      selectedSize={selectedSize}
                    />
                  </div>
                </div>

                <ViewerControls
                  autoRotate={autoRotate}
                  onToggleAutoRotate={() => setAutoRotate(!autoRotate)}
                  onFrontView={() => viewerRef.current?.setFrontView()}
                  onBackView={() => viewerRef.current?.setBackView()}
                  onResetView={() => viewerRef.current?.resetView()}
                  onZoomIn={() => viewerRef.current?.zoomIn()}
                  onZoomOut={() => viewerRef.current?.zoomOut()}
                  onPrevGarment={handlePrevGarment}
                  onNextGarment={handleNextGarment}
                  currentIndex={currentIndex}
                  totalGarments={filteredProducts.length}
                />
              </div>
            )}

            {/* Mode 3: 2D PATTERN FULL BLUEPRINT VIEW */}
            {layoutMode === '2D_PATTERN' && (
              <div className="w-full min-h-[620px]">
                <PatternWindow2D
                  category={currentProduct?.category || selectedCategory || 'Dress'}
                  selectedColor={selectedColor}
                  selectedSize={selectedSize}
                />
              </div>
            )}
          </div>

          {/* RIGHT: Garment Details, Sizing, Color, and Fit Engine Spec Panel */}
          <div className="w-full lg:w-80 xl:w-96 shrink-0">
            <GarmentInfoPanel
              product={currentProduct}
              selectedColor={selectedColor}
              onSelectColor={(col) => setSelectedColor(col)}
              selectedSize={selectedSize}
              onSelectSize={(sz) => setSelectedSize(sz)}
              selectedVariant={selectedVariant}
              onSelectVariant={(v) => {
                setSelectedVariant(v);
                if (v.color) setSelectedColor(v.color);
                if (v.size) setSelectedSize(v.size);
              }}
              viewMode={viewMode}
              onToggleViewMode={() =>
                setViewMode(viewMode === 'TECHNICAL' ? 'REALISTIC' : 'TECHNICAL')
              }
              userRole={user?.role}
              recommendation={fitRecommendation}
              onOpenMeasurements={() => setIsMeasureModalOpen(true)}
              layoutMode={layoutMode}
              onChangeLayoutMode={(m) => setLayoutMode(m)}
              tryOnMode={tryOnMode}
              onToggleTryOn={() => setTryOnMode(!tryOnMode)}
              activeZone={activeZone}
              onSelectZone={(z) => setActiveZone(z)}
            />
          </div>
        </div>
      )}

      {/* Avatar Measurements & Fit Modal */}
      <AvatarMeasureDrawer
        isOpen={isMeasureModalOpen}
        onClose={() => setIsMeasureModalOpen(false)}
        measurements={measurements}
        onChangeMeasurements={(m) => setMeasurements(m)}
        avatarProfile={avatarProfile}
        onSelectProfile={(p) => setAvatarProfile(p)}
        avatarStyle={avatarStyle}
        onChangeStyle={(s) => setAvatarStyle(s)}
        avatarPose={avatarPose}
        onChangePose={(p) => setAvatarPose(p)}
        recommendation={fitRecommendation}
        selectedSize={selectedSize}
        onSelectSize={(s) => setSelectedSize(s)}
        activeZone={activeZone}
        onSelectZone={(z) => setActiveZone(z)}
      />
    </div>
  );
};
