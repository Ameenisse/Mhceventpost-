import {
  BrandingLogoAsset,
  EventConfiguration,
  OrganizationProfile,
  PhotoOrientation,
  TemporaryPhotoItem,
} from '../types/studio';

/**
 * Check whether a string contains Dhivehi (Thaana) Unicode characters (U+0780 to U+07BF)
 */
export function isThaanaText(text: string | undefined | null): boolean {
  if (!text) return false;
  return /[\u0780-\u07BF]/.test(text);
}

/**
 * Returns a font stack prioritizing 'Mv_Eamaan_XP' and 'Faruma' whenever Dhivehi/Thaana is present,
 * or honoring the user-customized font choice.
 */
export function resolveFarumaFontStack(
  customFamily: string | undefined | null,
  textSample?: string,
  forceRtl = false
): string {
  if (forceRtl || (textSample && isThaanaText(textSample))) {
    if (customFamily && customFamily.trim()) {
      return `${customFamily}, 'Mv_Eamaan_XP', 'Faruma', 'Noto Sans Thaana', sans-serif`;
    }
    return `'Mv_Eamaan_XP', 'Faruma', 'Noto Sans Thaana', sans-serif`;
  }
  return customFamily || "'Outfit', 'Mv_Eamaan_XP', 'Faruma', 'Noto Sans Thaana', sans-serif";
}

/**
 * Cache of decoded HTMLImageElement for reusable branding logos (small assets)
 */
const logoImageCache = new Map<string, HTMLImageElement>();

export function clearLogoImageCache() {
  logoImageCache.clear();
}

/**
 * Optimizes SVG data URLs so the browser rasterizes them at high resolution (HD/4K)
 * rather than tiny default dimensions (e.g. 300x150).
 */
function optimizeSvgDataUrlForCrispRendering(dataUrl: string): string {
  if (!dataUrl || !dataUrl.startsWith('data:image/svg+xml')) return dataUrl;
  try {
    let svgText = '';
    if (dataUrl.includes(';base64,')) {
      const base64Part = dataUrl.split(';base64,')[1];
      svgText = atob(base64Part);
    } else {
      svgText = decodeURIComponent(dataUrl.split(',')[1]);
    }

    const svgTagMatch = svgText.match(/<svg\b([^>]*)>/i);
    if (svgTagMatch) {
      let attrs = svgTagMatch[1];
      const viewBoxMatch = attrs.match(/viewBox=["']([^"']+)["']/i);
      let targetW = 2400;
      let targetH = 800;

      if (viewBoxMatch) {
        const parts = viewBoxMatch[1].trim().split(/[\s,]+/).map(Number);
        if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
          const aspect = parts[2] / parts[3];
          targetW = 2400;
          targetH = Math.round(targetW / aspect);
        }
      }

      if (/width=["'][^"']*["']/i.test(attrs)) {
        attrs = attrs.replace(/width=["'][^"']*["']/i, `width="${targetW}"`);
      } else {
        attrs = ` width="${targetW}"` + attrs;
      }
      if (/height=["'][^"']*["']/i.test(attrs)) {
        attrs = attrs.replace(/height=["'][^"']*["']/i, `height="${targetH}"`);
      } else {
        attrs = ` height="${targetH}"` + attrs;
      }

      const updatedSvg = svgText.replace(/<svg\b[^>]*>/i, `<svg${attrs}>`);
      return `data:image/svg+xml;utf8,${encodeURIComponent(updatedSvg.trim())}`;
    }
  } catch {
    // Non-critical fallback to original dataUrl
  }
  return dataUrl;
}

export async function loadLogoImage(logo: BrandingLogoAsset): Promise<HTMLImageElement | null> {
  if (!logo || !logo.dataUrl) return null;
  if (logoImageCache.has(logo.id)) {
    return logoImageCache.get(logo.id)!;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      logoImageCache.set(logo.id, img);
      resolve(img);
    };
    img.onerror = () => {
      console.warn(`Failed to decode logo asset: ${logo.name}`);
      resolve(null);
    };
    img.src = optimizeSvgDataUrlForCrispRendering(logo.dataUrl);
  });
}

/**
 * Draws an uploaded logo with pristine 1:1 original quality on target canvas.
 * Applies high-fidelity bicubic multi-step downsampling when scaling down from high-res source files,
 * eliminating jagged edges, aliasing, blurriness, and color bleed.
 */
export function drawLogoCrisp(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number
) {
  if (!img || dw <= 0 || dh <= 0) return;

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;

  // Step-down scaling if source image is more than 2x larger than destination box
  if (srcW > dw * 2 || srcH > dh * 2) {
    let curW = srcW;
    let curH = srcH;

    let stepCanvas = document.createElement('canvas');
    stepCanvas.width = curW;
    stepCanvas.height = curH;
    let stepCtx = stepCanvas.getContext('2d')!;
    stepCtx.imageSmoothingEnabled = true;
    stepCtx.imageSmoothingQuality = 'high';
    stepCtx.drawImage(img, 0, 0);

    while (curW > dw * 2 || curH > dh * 2) {
      const nextW = Math.max(Math.round(dw), Math.round(curW * 0.5));
      const nextH = Math.max(Math.round(dh), Math.round(curH * 0.5));

      const nextCanvas = document.createElement('canvas');
      nextCanvas.width = nextW;
      nextCanvas.height = nextH;
      const nextCtx = nextCanvas.getContext('2d')!;
      nextCtx.imageSmoothingEnabled = true;
      nextCtx.imageSmoothingQuality = 'high';
      nextCtx.drawImage(stepCanvas, 0, 0, curW, curH, 0, 0, nextW, nextH);

      stepCanvas.width = 1;
      stepCanvas.height = 1;

      stepCanvas = nextCanvas;
      stepCtx = nextCtx;
      curW = nextW;
      curH = nextH;
    }

    ctx.drawImage(stepCanvas, 0, 0, curW, curH, dx, dy, dw, dh);
    stepCanvas.width = 1;
    stepCanvas.height = 1;
  } else {
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  ctx.restore();
}

export function hexToRgba(hex: string, alphaPercent: number): string {
  const clean = (hex || '#142F4D').replace('#', '');
  let r = 20,
    g = 47,
    b = 77;
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else if (clean.length >= 6) {
    r = parseInt(clean.slice(0, 2), 16);
    g = parseInt(clean.slice(2, 4), 16);
    b = parseInt(clean.slice(4, 6), 16);
  }
  const a = Math.max(0, Math.min(1, alphaPercent / 100));
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
}

export function resolveSponsorCategoryLabel(
  config: any,
  logos?: BrandingLogoAsset[]
): string {
  if (!config) return 'Participant / Partner';
  if (config.showSponsorLabel === false) return '';

  // If user configured custom mode and custom label is entered, respect it
  if (
    config.sponsorCategoryMode === 'custom' &&
    config.sponsorLabelText &&
    String(config.sponsorLabelText).trim().length > 0
  ) {
    return String(config.sponsorLabelText).trim();
  }

  // Filter out any organization logos
  const activeLogos = (logos || []).filter(
    (l) => l && l.category !== 'organization'
  );

  // Default is 'Participant / Partner' when no logos are selected yet or list is empty
  if (activeLogos.length === 0) {
    return 'Participant / Partner';
  }

  const hasSponsor = activeLogos.some((l) => l.category === 'sponsor');
  const hasParticipant = activeLogos.some(
    (l) => l.category === 'participant' || !l.category
  );
  const hasCoOrg = activeLogos.some((l) => l.category === 'co-organizer');

  // Check if any other category logo is included:
  if (hasSponsor && hasParticipant && hasCoOrg) {
    return 'Sponsors, Partners & Co-Organizers';
  }
  if (hasSponsor && hasParticipant) {
    return 'Sponsors & Partners';
  }
  if (hasSponsor && hasCoOrg) {
    return 'Sponsors & Co-Organizers';
  }
  if (hasParticipant && hasCoOrg) {
    return 'Partners & Co-Organizers';
  }
  if (hasSponsor) {
    return 'Official Sponsors';
  }
  if (hasCoOrg) {
    return 'Co-Organizers';
  }

  // Default when only participants or no other category:
  return 'Participant / Partner';
}

export function detectOrientation(width: number, height: number): PhotoOrientation {
  const ratio = width / height;
  if (Math.abs(ratio - 1) < 0.06) return 'square';
  return width > height ? 'landscape' : 'portrait';
}

/**
 * Quickly inspect dimensions of an imported File using a temporary ImageBitmap or Image
 * without storing thumbnails persistently.
 */
export async function probePhotoDimensions(
  file: File,
  objectUrl: string
): Promise<{ width: number; height: number; orientation: PhotoOrientation }> {
  if ('createImageBitmap' in window) {
    try {
      const bmp = await createImageBitmap(file);
      const w = bmp.width;
      const h = bmp.height;
      bmp.close(); // Immediately release bitmap memory
      return { width: w, height: h, orientation: detectOrientation(w, h) };
    } catch {
      // Fallback to HTMLImageElement below
    }
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || 1920;
      const h = img.naturalHeight || 1080;
      resolve({ width: w, height: h, orientation: detectOrientation(w, h) });
    };
    img.onerror = () => {
      resolve({ width: 1920, height: 1080, orientation: 'landscape' });
    };
    img.src = objectUrl;
  });
}

/**
 * Core rendering function that paints onto a target HTMLCanvasElement.
 *
 * CRITICAL QUALITY & HD OVERLAY ARCHITECTURE:
 * 1. Original Photo Quality & Size: Exported photos keep their exact original resolution
 *    (when resolutionMode === 'original', which is default) and high encoding quality.
 * 2. HD Vector/Logo Overlay Layer: Even when an imported photograph has low resolution
 *    (e.g., 640×480 or 800×600), all branding overlays (Organization Header, Linear Gradient Banner,
 *    Dhivehi RTL / Custom Typography, and Sponsor/Participant Logos) are rendered on an
 *    HD minimum-1920px internal canvas with `imageSmoothingQuality = 'high'` so that
 *    logos and text are always crisp, sharp, and never pixelated.
 * 3. Top-Right Organization Lockup: Places Organization Name & Address (right-aligned)
 *    with Main Logo 1 and Main Logo 2 in the top-right corner by default.
 * 4. Gradient Opacity Separation: Linear gradient opacity affects ONLY the banner background,
 *    never dimming the Event Title or Sponsor/Participant Logos.
 */
export async function renderBrandedPhotoToCanvas(
  canvas: HTMLCanvasElement,
  sourceImage: ImageBitmap | HTMLImageElement,
  sourceWidth: number,
  sourceHeight: number,
  eventConfig: EventConfiguration,
  allLogos: BrandingLogoAsset[],
  targetMaxDimension?: number,
  enforceHdOverlayFloor = true,
  activeOrganization?: OrganizationProfile
): Promise<void> {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // 1. Resolve output resolution
  let outW = sourceWidth;
  let outH = sourceHeight;

  const maxDim =
    targetMaxDimension ??
    (eventConfig.exportConfig.resolutionMode === '4k'
      ? 3840
      : eventConfig.exportConfig.resolutionMode === '2k'
      ? 2560
      : eventConfig.exportConfig.resolutionMode === '1080p'
      ? 1920
      : Math.max(sourceWidth, sourceHeight));

  if (Math.max(outW, outH) > maxDim) {
    const scale = maxDim / Math.max(outW, outH);
    outW = Math.round(outW * scale);
    outH = Math.round(outH * scale);
  }

  const longestEdge = Math.max(outW, outH);
  const hdFloorDim = 1920;
  const workScale =
    enforceHdOverlayFloor && longestEdge < hdFloorDim ? hdFloorDim / longestEdge : 1;
  const workW = Math.round(outW * workScale);
  const workH = Math.round(outH * workScale);

  if (canvas.width !== outW || canvas.height !== outH) {
    canvas.width = outW;
    canvas.height = outH;
  }

  const workCanvas = workScale > 1 ? document.createElement('canvas') : canvas;
  if (workScale > 1) {
    workCanvas.width = workW;
    workCanvas.height = workH;
  }

  const wCtx = workCanvas.getContext('2d')!;
  wCtx.imageSmoothingEnabled = true;
  wCtx.imageSmoothingQuality = 'high';
  wCtx.clearRect(0, 0, workW, workH);

  // Reference scale: 1920px wide canvas for landscape, 1080px wide canvas for portrait (standard 9:16)
  // This guarantees elements (logos, font, gaps, paddings) maintain the exact same arrangements and sizes
  const orientation = detectOrientation(workW, workH);
  const isPortrait = orientation === 'portrait';
  const baseScale = isPortrait ? workW / 1080 : workW / 1920;

  const sameAsLandscape = eventConfig.orientationConfig?.portraitSameAsLandscape ?? true;

  const bannerHeightMultiplier = isPortrait
    ? (sameAsLandscape ? 1.0 : (eventConfig.orientationConfig?.portraitBannerHeightScale ?? 1.0))
    : (eventConfig.orientationConfig?.landscapeBannerHeightScale ?? 1.0);
  const fontScaleMultiplier = isPortrait
    ? (sameAsLandscape ? 1.0 : (eventConfig.orientationConfig?.portraitFontSizeScale ?? 1.0))
    : (eventConfig.orientationConfig?.landscapeFontSizeScale ?? 1.0);
  const logoScaleMultiplier = isPortrait
    ? (sameAsLandscape ? 1.0 : (eventConfig.orientationConfig?.portraitLogoScale ?? 1.0))
    : (eventConfig.orientationConfig?.landscapeLogoScale ?? 1.0);

  // 2. Apply Lightroom-inspired Photo Adjustments when enabled
  const adj = eventConfig.photoAdjustments;
  wCtx.save();
  if (adj.enabled) {
    const brightnessExtra = (adj.brightness || 0) * 0.5;
    const brightnessVal =
      100 +
      brightnessExtra +
      adj.exposure * 0.6 +
      adj.shadows * 0.15 +
      adj.highlights * 0.1;
    const contrastVal =
      100 + adj.contrast * 0.65 + adj.clarity * 0.25 + (adj.whites - adj.blacks) * 0.15;
    const saturateVal = 100 + adj.saturation * 0.8 + adj.vibrance * 0.5;
    wCtx.filter = `brightness(${Math.max(25, brightnessVal)}%) contrast(${Math.max(
      25,
      contrastVal
    )}%) saturate(${Math.max(0, saturateVal)}%)`;
  } else {
    wCtx.filter = 'none';
  }

  const rotDeg = adj.rotationDegrees || 0;
  if (rotDeg !== 0) {
    wCtx.save();
    wCtx.translate(workW / 2, workH / 2);
    wCtx.rotate((rotDeg * Math.PI) / 180);
    if (rotDeg === 90 || rotDeg === 270) {
      wCtx.drawImage(sourceImage, -workH / 2, -workW / 2, workH, workW);
    } else {
      wCtx.drawImage(sourceImage, -workW / 2, -workH / 2, workW, workH);
    }
    wCtx.restore();
  } else {
    wCtx.drawImage(sourceImage, 0, 0, workW, workH);
  }
  wCtx.restore();

  // Optional Temperature / Tint & Vignette overlays
  if (adj.enabled) {
    if (adj.temperature !== 0 || adj.tint !== 0) {
      wCtx.save();
      wCtx.globalCompositeOperation = 'soft-light';
      if (adj.temperature > 0) {
        wCtx.fillStyle = `rgba(255, 160, 40, ${(Math.abs(adj.temperature) / 100) * 0.28})`;
        wCtx.fillRect(0, 0, workW, workH);
      } else if (adj.temperature < 0) {
        wCtx.fillStyle = `rgba(40, 140, 255, ${(Math.abs(adj.temperature) / 100) * 0.28})`;
        wCtx.fillRect(0, 0, workW, workH);
      }
      if (adj.tint !== 0) {
        wCtx.fillStyle =
          adj.tint > 0
            ? `rgba(230, 60, 190, ${(Math.abs(adj.tint) / 100) * 0.2})`
            : `rgba(50, 210, 110, ${(Math.abs(adj.tint) / 100) * 0.2})`;
        wCtx.fillRect(0, 0, workW, workH);
      }
      wCtx.restore();
    }

    if (adj.vignetteAmount > 0) {
      wCtx.save();
      const radiusOuter = Math.hypot(workW, workH) * 0.55;
      const radiusInner = radiusOuter * Math.max(0.1, (100 - adj.vignetteFeather) / 100);
      const radGrad = wCtx.createRadialGradient(
        workW / 2,
        workH / 2,
        radiusInner,
        workW / 2,
        workH / 2,
        radiusOuter
      );
      radGrad.addColorStop(0, 'rgba(0,0,0,0)');
      radGrad.addColorStop(1, `rgba(0,0,0,${(adj.vignetteAmount / 100) * 0.72})`);
      wCtx.fillStyle = radGrad;
      wCtx.fillRect(0, 0, workW, workH);
      wCtx.restore();
    }
  }

  // 3. Apply Organization Header in Top-Right Corner (or selected layout mode)
  const logoMap = new Map(allLogos.map((l) => [l.id, l]));
  const headerDisplayMode = eventConfig.headerDisplayMode || 'both-logos';

  if (headerDisplayMode !== 'hide-header') {
    const mainLogo1Asset = logoMap.get(eventConfig.mainLogo1Id);
    const mainLogo2Asset =
      headerDisplayMode === 'both-logos' ? logoMap.get(eventConfig.mainLogo2Id) : undefined;
    const [mainLogo1Img, mainLogo2Img] = await Promise.all([
      mainLogo1Asset ? loadLogoImage(mainLogo1Asset) : Promise.resolve(null),
      mainLogo2Asset ? loadLogoImage(mainLogo2Asset) : Promise.resolve(null),
    ]);

    const padX = (eventConfig.headerPaddingX + (eventConfig.headerOffsetX || 0)) * baseScale;
    const padY = (eventConfig.headerPaddingY + (eventConfig.headerOffsetY || 0)) * baseScale;

    if (
      eventConfig.headerScrimOpacity > 0 &&
      (mainLogo1Img || mainLogo2Img || eventConfig.orgNameOverride)
    ) {
      wCtx.save();
      const topScrimH = Math.round(workH * 0.16);
      const topGrad = wCtx.createLinearGradient(0, 0, 0, topScrimH);
      const hdrColor = eventConfig.headerBgColor || '#030712';
      topGrad.addColorStop(0, hexToRgba(hdrColor, eventConfig.headerScrimOpacity * 0.85));
      topGrad.addColorStop(1, hexToRgba(hdrColor, 0));
      wCtx.fillStyle = topGrad;
      wCtx.fillRect(0, 0, workW, topScrimH);
      wCtx.restore();
    }

    const baseHeaderLogoH = 68 * baseScale * logoScaleMultiplier;
    const headerLogoGap = (eventConfig.headerLogoGap ?? 16) * baseScale;
    const headerStyle = eventConfig.headerStyle || 'logos-beside-text';

    if (
      eventConfig.headerPosition === 'top-right' ||
      eventConfig.headerPosition === 'top-corners' ||
      eventConfig.headerPosition === 'top-bar'
    ) {
      let rightCursorX = workW - padX;
      let maxLogoHeightInHeader = baseHeaderLogoH;

      if (headerStyle === 'logos-above-text') {
        // Draw logos at top-right, and organization text directly underneath them
        let logoRowRightX = rightCursorX;
        if (mainLogo2Img && mainLogo2Asset) {
          const h2 = baseHeaderLogoH * (eventConfig.logo2Scale / 100);
          const w2 = h2 * mainLogo2Asset.aspectRatio;
          maxLogoHeightInHeader = Math.max(maxLogoHeightInHeader, h2);
          logoRowRightX -= w2;
          drawLogoCrisp(wCtx, mainLogo2Img, logoRowRightX, padY, w2, h2);
          logoRowRightX -= headerLogoGap;
        }
        if (mainLogo1Img && mainLogo1Asset) {
          const h1 = baseHeaderLogoH * (eventConfig.logo1Scale / 100);
          const w1 = h1 * mainLogo1Asset.aspectRatio;
          maxLogoHeightInHeader = Math.max(maxLogoHeightInHeader, h1);
          logoRowRightX -= w1;
          drawLogoCrisp(wCtx, mainLogo1Img, logoRowRightX, padY, w1, h1);
        }

        if (eventConfig.orgNameOverride || eventConfig.orgAddressOverride) {
          wCtx.save();
          wCtx.textAlign = 'right';
          wCtx.shadowColor = 'rgba(0, 0, 0, 0.75)';
          wCtx.shadowBlur = 8 * baseScale;
          const nameFontPx = Math.round(
            (eventConfig.headerTextSize || 22) * baseScale * fontScaleMultiplier
          );
          const addrFontPx = Math.round(14 * baseScale * fontScaleMultiplier);
          let textY = padY + maxLogoHeightInHeader + nameFontPx + 6 * baseScale;

          if (eventConfig.orgNameOverride) {
            const fontStack = resolveFarumaFontStack(
              eventConfig.headerFontFamily || activeOrganization?.headerFontFamily,
              eventConfig.orgNameOverride
            );
            wCtx.font = `700 ${nameFontPx}px ${fontStack}`;
            wCtx.fillStyle = eventConfig.headerTextColor || '#FFFFFF';
            wCtx.fillText(eventConfig.orgNameOverride, rightCursorX, textY);
            textY += addrFontPx + 6 * baseScale;
          }
          if (eventConfig.orgAddressOverride) {
            const fontStack = resolveFarumaFontStack(
              eventConfig.headerFontFamily || activeOrganization?.headerFontFamily,
              eventConfig.orgAddressOverride
            );
            wCtx.font = `400 ${addrFontPx}px ${fontStack}`;
            wCtx.fillStyle = 'rgba(226, 232, 240, 0.92)';
            wCtx.fillText(eventConfig.orgAddressOverride, rightCursorX, textY);
          }
          wCtx.restore();
        }
      } else {
        // Default: Top-Right Corner Lockup (Logos on right, Organization Name & Address beside them)
        if (mainLogo2Img && mainLogo2Asset) {
          const h2 = baseHeaderLogoH * (eventConfig.logo2Scale / 100);
          const w2 = h2 * mainLogo2Asset.aspectRatio;
          maxLogoHeightInHeader = Math.max(maxLogoHeightInHeader, h2);
          rightCursorX -= w2;
          drawLogoCrisp(wCtx, mainLogo2Img, rightCursorX, padY, w2, h2);
          rightCursorX -= headerLogoGap;
        }

        if (mainLogo1Img && mainLogo1Asset) {
          const h1 = baseHeaderLogoH * (eventConfig.logo1Scale / 100);
          const w1 = h1 * mainLogo1Asset.aspectRatio;
          maxLogoHeightInHeader = Math.max(maxLogoHeightInHeader, h1);
          rightCursorX -= w1;
          drawLogoCrisp(wCtx, mainLogo1Img, rightCursorX, padY, w1, h1);
          rightCursorX -= headerLogoGap * 1.25;
        }

        if (eventConfig.orgNameOverride || eventConfig.orgAddressOverride) {
          wCtx.save();
          wCtx.textAlign = 'right';
          wCtx.shadowColor = 'rgba(0, 0, 0, 0.75)';
          wCtx.shadowBlur = 8 * baseScale;
          wCtx.shadowOffsetX = 0;
          wCtx.shadowOffsetY = 2 * baseScale;

          const rawHeaderFont =
            eventConfig.headerFontFamily ||
            activeOrganization?.headerFontFamily ||
            "'Mv_Eamaan_XP', 'Faruma', 'Noto Sans Thaana', sans-serif";
          const nameFontFamily = resolveFarumaFontStack(rawHeaderFont, eventConfig.orgNameOverride);
          const addrFontFamily = resolveFarumaFontStack(rawHeaderFont, eventConfig.orgAddressOverride);
          const nameFontWeight =
            eventConfig.headerTextWeight ||
            activeOrganization?.headerTextWeight ||
            '700';
          const nameFontPx = Math.round(
            (eventConfig.headerTextSize || activeOrganization?.headerTextSize || 24) *
              baseScale *
              fontScaleMultiplier
          );
          const addrFontPx = Math.round(
            (eventConfig.headerAddressSize || activeOrganization?.headerAddressSize || 15) *
              baseScale *
              fontScaleMultiplier
          );
          const nameColor =
            eventConfig.headerTextColor ||
            activeOrganization?.headerTextColor ||
            '#FFFFFF';
          const addrColor =
            eventConfig.headerAddressColor ||
            activeOrganization?.headerAddressColor ||
            'rgba(226, 232, 240, 0.92)';
          const centerBlockY = padY + maxLogoHeightInHeader / 2;

          if (eventConfig.orgNameOverride && eventConfig.orgAddressOverride) {
            wCtx.font = `${nameFontWeight} ${nameFontPx}px ${nameFontFamily}`;
            wCtx.fillStyle = nameColor;
            wCtx.fillText(
              eventConfig.orgNameOverride,
              rightCursorX,
              centerBlockY - 4 * baseScale
            );

            wCtx.font = `400 ${addrFontPx}px ${addrFontFamily}`;
            wCtx.fillStyle = addrColor;
            wCtx.fillText(
              eventConfig.orgAddressOverride,
              rightCursorX,
              centerBlockY + addrFontPx + 2 * baseScale
            );
          } else if (eventConfig.orgNameOverride) {
            wCtx.font = `${nameFontWeight} ${nameFontPx}px ${nameFontFamily}`;
            wCtx.fillStyle = nameColor;
            wCtx.fillText(
              eventConfig.orgNameOverride,
              rightCursorX,
              centerBlockY + nameFontPx * 0.35
            );
          }
          wCtx.restore();
        }
      }

      // Optional Social Media Links under Header when placement is header-below or top-left
      const socCfg = eventConfig.socialOverlay;
      const socialLinks = (activeOrganization?.socialLinks || []).filter((s) => s.visible);
      if (
        socCfg?.enabled &&
        socCfg.displayMode !== 'hide' &&
        socialLinks.length > 0 &&
        socCfg.placement !== 'footer-top'
      ) {
        wCtx.save();
        const socTextPx = Math.round((socCfg.textSize || 14) * baseScale * fontScaleMultiplier);
        wCtx.font = `600 ${socTextPx}px 'Public Sans', sans-serif`;
        wCtx.fillStyle = socCfg.color || '#E2E8F0';
        wCtx.textAlign = 'right';
        wCtx.shadowColor = 'rgba(0,0,0,0.75)';
        wCtx.shadowBlur = 6 * baseScale;

        const formattedItems = socialLinks.map((item) => {
          const badge = item.platform.toUpperCase().slice(0, 2);
          if (socCfg.displayMode === 'icon-only') return `[${badge}]`;
          if (socCfg.displayMode === 'text-only') return item.displayName;
          return `${badge}: ${item.displayName}`;
        });
        const joinedSocial = formattedItems.join('   ·   ');
        const socY =
          socCfg.placement === 'top-left'
            ? padY + socTextPx + 8 * baseScale
            : padY + maxLogoHeightInHeader + socTextPx + 14 * baseScale;
        const socX = socCfg.placement === 'top-left' ? padX : workW - padX;
        if (socCfg.placement === 'top-left') wCtx.textAlign = 'left';
        wCtx.fillText(joinedSocial, socX, socY);
        wCtx.restore();
      }
    } else if (eventConfig.headerPosition === 'top-center') {
      if (mainLogo1Img && mainLogo1Asset) {
        const h1 = baseHeaderLogoH * (eventConfig.logo1Scale / 100);
        const w1 = h1 * mainLogo1Asset.aspectRatio;
        const x1 = (workW - w1) / 2;
        drawLogoCrisp(wCtx, mainLogo1Img, x1, padY, w1, h1);
      }
    }
  }

  // 4. Apply Footer Banner & Interactive Linear Gradient Transparency
  // CRITICAL: Gradient opacity affects ONLY the banner background, NEVER the Event Title or Logos.
  const fb = eventConfig.footerBanner;
  const bannerH = Math.round(workH * (fb.heightPercent / 100) * bannerHeightMultiplier);
  const bannerW = Math.round(workW * (fb.widthPercent / 100));
  const bannerX = Math.round((workW - bannerW) / 2);
  const bottomOffset = Math.round(fb.bottomOffsetPx * baseScale);
  const bannerY =
    fb.position === 'top'
      ? 0
      : fb.position === 'floating-bottom' || fb.bannerMode === 'floating'
      ? workH - bannerH - Math.max(24 * baseScale, bottomOffset)
      : workH - bannerH;

  if (fb.enabled && bannerH > 0) {
    wCtx.save();

    if (
      fb.position === 'floating-bottom' ||
      fb.bannerMode === 'floating' ||
      (fb.cornerRadiusPx && fb.cornerRadiusPx > 0)
    ) {
      const r = (fb.cornerRadiusPx ?? 16) * baseScale;
      const padFloat =
        fb.position === 'floating-bottom' || fb.bannerMode === 'floating'
          ? 28 * baseScale
          : 0;
      wCtx.beginPath();
      wCtx.roundRect(
        bannerX + padFloat,
        bannerY,
        bannerW - padFloat * 2,
        bannerH,
        r
      );
      wCtx.clip();
    }

    // Calculate gradient vector based on direction:
    // 0 deg = Up (Bottom -> Top)
    // 180 deg = Down (Top -> Bottom)
    // 90 deg = Right (Left -> Right)
    // 270 deg = Left (Right -> Left)
    const dir = fb.gradientDirection;
    const cx = bannerX + bannerW / 2;
    const cy = bannerY + bannerH / 2;

    let gx0 = bannerX;
    let gy0 = bannerY + bannerH;
    let gx1 = bannerX;
    let gy1 = bannerY;

    if (dir === 0) {
      // Fade Up: starts at bottom (gy0 = bannerY + bannerH), fades to top (gy1 = bannerY)
      gx0 = cx;
      gy0 = bannerY + bannerH;
      gx1 = cx;
      gy1 = bannerY;
    } else if (dir === 180) {
      // Fade Down: starts at top, fades to bottom
      gx0 = cx;
      gy0 = bannerY;
      gx1 = cx;
      gy1 = bannerY + bannerH;
    } else if (dir === 90) {
      // Fade Right: starts at left, fades to right
      gx0 = bannerX;
      gy0 = cy;
      gx1 = bannerX + bannerW;
      gy1 = cy;
    } else if (dir === 270) {
      // Fade Left: starts at right, fades to left
      gx0 = bannerX + bannerW;
      gy0 = cy;
      gx1 = bannerX;
      gy1 = cy;
    } else {
      const rad = ((dir - 90) * Math.PI) / 180;
      const halfLen = Math.max(bannerW, bannerH) / 2;
      gx0 = cx - Math.cos(rad) * halfLen;
      gy0 = cy - Math.sin(rad) * halfLen;
      gx1 = cx + Math.cos(rad) * halfLen;
      gy1 = cy + Math.sin(rad) * halfLen;
    }

    if (fb.reverseGradient) {
      const tx = gx0,
        ty = gy0;
      gx0 = gx1;
      gy0 = gy1;
      gx1 = tx;
      gy1 = ty;
    }

    const linGrad = wCtx.createLinearGradient(gx0, gy0, gx1, gy1);
    const overallOpacityFactor = (fb.gradientOpacity ?? 100) / 100;
    const startPos = Math.max(0, Math.min(1, (fb.gradientStartPos ?? 0) / 100));
    const endPos = Math.max(startPos + 0.01, Math.min(1, (fb.gradientEndPos ?? 100) / 100));

    // Support direct Interactive Gradient Settings (Start Opacity, End Opacity, Fade Starts At, Fade Ends At, Background Color)
    if (typeof fb.startOpacity === 'number' && typeof fb.endOpacity === 'number') {
      const startAlpha =
        fb.startOpacity * overallOpacityFactor * (1 - (fb.baseTransparency || 0) / 100);
      const endAlpha =
        fb.endOpacity * overallOpacityFactor * (1 - (fb.baseTransparency || 0) / 100);
      const startHex = fb.backgroundColor || '#142F4D';
      const endHex = fb.endColor || startHex;

      if (startPos > 0) {
        linGrad.addColorStop(0, hexToRgba(startHex, startAlpha));
      }
      linGrad.addColorStop(startPos, hexToRgba(startHex, startAlpha));

      if (typeof fb.midpointPercent === 'number') {
        const midRatio = Math.max(0.05, Math.min(0.95, fb.midpointPercent / 100));
        const midStopPos = startPos + (endPos - startPos) * midRatio;
        const midAlpha = (startAlpha + endAlpha) * 0.5;
        linGrad.addColorStop(midStopPos, hexToRgba(startHex, midAlpha));
      }

      linGrad.addColorStop(endPos, hexToRgba(endHex, endAlpha));
      if (endPos < 1) {
        linGrad.addColorStop(1, hexToRgba(endHex, endAlpha));
      }
    } else {
      const sortedStops = [...fb.gradientStops].sort((a, b) => a.offset - b.offset);
      if (sortedStops.length === 0) {
        linGrad.addColorStop(0, hexToRgba(fb.backgroundColor, 95 * overallOpacityFactor));
        linGrad.addColorStop(1, hexToRgba(fb.backgroundColor, 0));
      } else {
        for (const stop of sortedStops) {
          const rawRatio = Math.max(0, Math.min(1, stop.offset / 100));
          const mappedPos = startPos + rawRatio * (endPos - startPos);
          const effectiveAlpha =
            stop.opacity * overallOpacityFactor * (1 - (fb.baseTransparency || 0) / 100);
          linGrad.addColorStop(
            Math.max(0, Math.min(1, mappedPos)),
            hexToRgba(stop.color, effectiveAlpha)
          );
        }
      }
    }

    wCtx.fillStyle = linGrad;
    wCtx.fillRect(bannerX, bannerY, bannerW, bannerH);

    if (fb.borderWidthPx && fb.borderWidthPx > 0) {
      wCtx.strokeStyle = fb.borderColor || 'rgba(255,255,255,0.2)';
      wCtx.lineWidth = fb.borderWidthPx * baseScale;
      wCtx.strokeRect(bannerX, bannerY, bannerW, bannerH);
    }

    wCtx.restore();
  }

  // 5. Apply Event Title & Dhivehi RTL Typography + Sponsor & Participant Logos inside Footer Banner
  const tc = eventConfig.textConfig;
  const sc = eventConfig.sponsorsConfig;
  const groupMode = sc.displayGroupMode || 'both';

  const sponsorAssets =
    groupMode === 'both' || groupMode === 'sponsors-only'
      ? sc.selectedSponsorIds
          .map((id) => logoMap.get(id))
          .filter((a): a is BrandingLogoAsset => Boolean(a))
      : [];
  const participantAssets =
    groupMode === 'both' || groupMode === 'participants-only'
      ? sc.selectedParticipantIds
          .map((id) => logoMap.get(id))
          .filter((a): a is BrandingLogoAsset => Boolean(a))
      : [];
  const coOrgAssets =
    groupMode !== 'neither' && sc.selectedCoOrganizerIds
      ? sc.selectedCoOrganizerIds
          .map((id) => logoMap.get(id))
          .filter((a): a is BrandingLogoAsset => Boolean(a))
      : [];

  const combinedPartnerAssets = [...sponsorAssets, ...participantAssets, ...coOrgAssets];
  const partnerImages = await Promise.all(combinedPartnerAssets.map((a) => loadLogoImage(a)));

  const footerPadX = sc.paddingX * baseScale;
  const footerPadY = sc.paddingY * baseScale;

  const stackVertically =
    isPortrait && !sameAsLandscape && Boolean(eventConfig.orientationConfig?.portraitStackLogos);

  // Render Event Title & Subtitle in Crisp HD (100% independent of banner gradient opacity)
  if (tc.eventTitle.trim()) {
    wCtx.save();
    wCtx.direction = tc.direction;
    wCtx.textAlign = tc.alignment;
    wCtx.globalAlpha = (tc.textOpacity ?? 100) / 100;

    let titleFontPx = Math.round(tc.fontSize * baseScale * fontScaleMultiplier);
    const subFontPx = Math.round(tc.subtitleFontSize * baseScale * fontScaleMultiplier);
    const weight = tc.fontWeight || '700';
    const italicPrefix = tc.italic ? 'italic ' : '';

    const effectiveTitleFont = resolveFarumaFontStack(
      tc.fontFamily,
      tc.eventTitle,
      tc.direction === 'rtl'
    );
    wCtx.font = `${italicPrefix}${weight} ${titleFontPx}px ${effectiveTitleFont}`;

    // Optional Fit-to-Banner automatic scaling
    if (tc.fitToBanner) {
      const maxAllowedWidth = workW - footerPadX * 2;
      const measured = wCtx.measureText(tc.eventTitle).width;
      if (measured > maxAllowedWidth && measured > 0) {
        titleFontPx = Math.max(
          18,
          Math.floor(titleFontPx * (maxAllowedWidth / measured))
        );
        wCtx.font = `${italicPrefix}${weight} ${titleFontPx}px ${effectiveTitleFont}`;
      }
    }

    const anchorX =
      tc.alignment === 'right'
        ? workW - footerPadX + tc.textPositionX * baseScale
        : tc.alignment === 'left'
        ? footerPadX + tc.textPositionX * baseScale
        : workW / 2 + tc.textPositionX * baseScale;

    const titleY = stackVertically
      ? bannerY + Math.max(footerPadY + titleFontPx, bannerH * 0.42) - tc.textPositionY * baseScale
      : bannerY +
        bannerH -
        footerPadY -
        (tc.subtitle ? subFontPx + 14 * baseScale : 10 * baseScale) -
        tc.textPositionY * baseScale;

    if (tc.shadowEnabled) {
      wCtx.shadowColor = tc.shadowColor;
      wCtx.shadowBlur = tc.shadowBlur * baseScale;
      wCtx.shadowOffsetX = 0;
      wCtx.shadowOffsetY = 2 * baseScale;
    }

    if (tc.strokeEnabled && tc.strokeWidth > 0) {
      wCtx.strokeStyle = tc.strokeColor;
      wCtx.lineWidth = tc.strokeWidth * baseScale;
      wCtx.strokeText(tc.eventTitle, anchorX, titleY);
    }

    wCtx.fillStyle = tc.textColor;
    wCtx.fillText(tc.eventTitle, anchorX, titleY);

    if (tc.subtitle.trim()) {
      const subFontStack = resolveFarumaFontStack(
        tc.fontFamily || "'Outfit', 'Public Sans', sans-serif",
        tc.subtitle
      );
      wCtx.font = `600 ${subFontPx}px ${subFontStack}`;
      wCtx.fillStyle = tc.subtitleColor;
      wCtx.direction = isThaanaText(tc.subtitle) ? 'rtl' : 'ltr';
      const subY = titleY + subFontPx + 10 * baseScale;
      wCtx.fillText(tc.subtitle, anchorX, subY);
    }
    wCtx.restore();
  }

  // Render Sponsor & Participant Logos in Crisp HD
  if (combinedPartnerAssets.length > 0 && groupMode !== 'neither') {
    wCtx.save();
    const targetLogoH = sc.logoHeight * baseScale * logoScaleMultiplier;
    const maxLogoW = (sc.logoMaxWidth || sc.logoHeight * 3.2) * baseScale * logoScaleMultiplier;
    const gapX = sc.gapBetweenLogos * baseScale;
    const rowGapY = (sc.rowGap || 14) * baseScale;

    const drawnDims = combinedPartnerAssets.map((asset) => {
      const isPart = asset.category === 'participant';
      const baseH =
        isPart && sc.participantLogoHeight
          ? sc.participantLogoHeight * baseScale * logoScaleMultiplier
          : targetLogoH;
      const override = sc.individualOverrides?.[asset.id];
      let h = baseH * (override?.heightScale ?? 1);
      let w = h * asset.aspectRatio;
      if (w > maxLogoW * (override?.heightScale ?? 1)) {
        w = maxLogoW * (override?.heightScale ?? 1);
        h = w / asset.aspectRatio;
      }
      return { w, h, asset };
    });

    const numRows =
      sc.arrangement === '2-rows'
        ? 2
        : sc.arrangement === '3-rows'
        ? 3
        : 1;

    const itemsPerRow = Math.ceil(drawnDims.length / numRows);
    const rows: (typeof drawnDims)[] = [];
    for (let r = 0; r < numRows; r++) {
      const slice = drawnDims.slice(r * itemsPerRow, (r + 1) * itemsPerRow);
      if (slice.length > 0) rows.push(slice);
    }

    let currentBottomY = workH - footerPadY;

    for (let rIdx = rows.length - 1; rIdx >= 0; rIdx--) {
      const rowItems = rows[rIdx];
      const rowWidth =
        rowItems.reduce((acc, d) => acc + d.w, 0) +
        Math.max(0, rowItems.length - 1) * gapX;
      const rowMaxH = Math.max(...rowItems.map((d) => d.h), targetLogoH);

      let startX = footerPadX;
      let effectiveGapX = gapX;
      const availableRowW = workW - footerPadX * 2;

      if (sc.alignment === 'center') {
        startX = (workW - rowWidth) / 2;
      } else if (sc.alignment === 'right') {
        startX = workW - footerPadX - rowWidth;
      } else if (sc.alignment === 'space-between' && rowItems.length > 1) {
        const sumLogosW = rowItems.reduce((acc, d) => acc + d.w, 0);
        effectiveGapX = Math.max(gapX, (availableRowW - sumLogosW) / (rowItems.length - 1));
        startX = footerPadX;
      } else if (sc.alignment === 'space-evenly' && rowItems.length > 0) {
        const sumLogosW = rowItems.reduce((acc, d) => acc + d.w, 0);
        effectiveGapX = Math.max(gapX, (availableRowW - sumLogosW) / (rowItems.length + 1));
        startX = footerPadX + effectiveGapX;
      } else {
        // default 'left'
        startX = footerPadX;
      }

      const categoryLabel = resolveSponsorCategoryLabel(sc, combinedPartnerAssets);

      if (rIdx === 0 && sc.showSponsorLabel !== false && categoryLabel) {
        wCtx.font = `600 ${Math.round(11 * baseScale)}px 'Outfit', sans-serif`;
        wCtx.fillStyle = 'rgba(203, 213, 225, 0.92)';
        wCtx.textAlign =
          sc.alignment === 'center'
            ? 'center'
            : sc.alignment === 'right'
            ? 'right'
            : 'left';
        const labelX =
          sc.alignment === 'center'
            ? workW / 2
            : sc.alignment === 'right'
            ? workW - footerPadX
            : startX;
        wCtx.fillText(
          categoryLabel.toUpperCase(),
          labelX,
          currentBottomY - rowMaxH - 12 * baseScale
        );
      }

      let cursorX = startX;
      for (let i = 0; i < rowItems.length; i++) {
        const item = rowItems[i];
        const globalIdx = combinedPartnerAssets.findIndex((a) => a.id === item.asset.id);
        const img = partnerImages[globalIdx];
        const { w, h } = item;
        const drawY = currentBottomY - h;

        if (sc.backdropPillOpacity > 0) {
          wCtx.fillStyle = `rgba(15, 23, 42, ${(sc.backdropPillOpacity / 100) * 0.65})`;
          wCtx.beginPath();
          wCtx.roundRect(
            cursorX - 6 * baseScale,
            drawY - 4 * baseScale,
            w + 12 * baseScale,
            h + 8 * baseScale,
            6 * baseScale
          );
          wCtx.fill();
        }

        if (img) {
          drawLogoCrisp(wCtx, img, cursorX, drawY, w, h);
        }
        cursorX += w + effectiveGapX;
      }

      currentBottomY -= rowMaxH + rowGapY;
    }

    wCtx.restore();
  }

  // 6. Banner Bottom-Right: Venue & Date (in two lines of text if marked to show)
  // 7. Banner Bottom-Center: Social Media Handles
  if (fb.enabled && bannerH > 0) {
    const showDate = tc.showDateOnPhoto && Boolean(eventConfig.date);
    const showVenue = tc.showVenueOnPhoto && Boolean(eventConfig.venue);

    if (showDate || showVenue) {
      wCtx.save();
      wCtx.textAlign = 'right';
      wCtx.direction = 'ltr';
      wCtx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      wCtx.shadowBlur = 8 * baseScale;
      wCtx.shadowOffsetX = 0;
      wCtx.shadowOffsetY = 2 * baseScale;

      const dateFontPx = Math.round((tc.dateFontSize || 15) * baseScale * fontScaleMultiplier);
      const venueFontPx = Math.round((tc.venueFontSize || 16) * baseScale * fontScaleMultiplier);
      const rightX = workW - footerPadX;
      const bottomY = workH - footerPadY;
      const venueFontStack = resolveFarumaFontStack(
        "'Outfit', 'Public Sans', sans-serif",
        eventConfig.venue
      );

      if (showVenue && showDate) {
        // Line 2 (bottom): Date
        wCtx.font = `600 ${dateFontPx}px 'Outfit', 'Public Sans', sans-serif`;
        wCtx.fillStyle = tc.dateColor || '#94A3B8';
        wCtx.fillText(eventConfig.date, rightX, bottomY);

        // Line 1 (above date): Venue
        wCtx.font = `700 ${venueFontPx}px ${venueFontStack}`;
        wCtx.fillStyle = tc.venueColor || '#F8FAFC';
        wCtx.fillText(eventConfig.venue, rightX, bottomY - dateFontPx - 5 * baseScale);
      } else if (showVenue) {
        wCtx.font = `700 ${venueFontPx}px ${venueFontStack}`;
        wCtx.fillStyle = tc.venueColor || '#F8FAFC';
        wCtx.fillText(eventConfig.venue, rightX, bottomY);
      } else if (showDate) {
        wCtx.font = `600 ${dateFontPx}px 'Outfit', 'Public Sans', sans-serif`;
        wCtx.fillStyle = tc.dateColor || '#94A3B8';
        wCtx.fillText(eventConfig.date, rightX, bottomY);
      }
      wCtx.restore();
    }

    // Social Media Handles in Bottom Center of Banner
    const socCfg = eventConfig.socialOverlay;
    const socialLinks = (activeOrganization?.socialLinks || []).filter((s) => s.visible);
    if (
      socCfg?.enabled &&
      socCfg.displayMode !== 'hide' &&
      socialLinks.length > 0 &&
      (socCfg.placement === 'footer-top' || !socCfg.placement || socCfg.placement === 'header-below')
    ) {
      wCtx.save();
      const socTextPx = Math.round((socCfg.textSize || 14) * baseScale * fontScaleMultiplier);
      wCtx.font = `600 ${socTextPx}px 'Public Sans', 'Outfit', sans-serif`;
      wCtx.fillStyle = socCfg.color || '#E2E8F0';
      wCtx.textAlign = 'center';
      wCtx.direction = 'ltr';
      wCtx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      wCtx.shadowBlur = 6 * baseScale;
      wCtx.shadowOffsetY = 1.5 * baseScale;

      const formattedItems = socialLinks.map((item) => {
        const badge = item.platform.toUpperCase().slice(0, 2);
        if (socCfg.displayMode === 'icon-only') return `[${badge}]`;
        if (socCfg.displayMode === 'text-only') return item.displayName;
        return `${badge}: ${item.displayName}`;
      });
      const joinedSocial = formattedItems.join('   ·   ');
      const bottomCenterY = workH - footerPadY;
      wCtx.fillText(joinedSocial, workW / 2, bottomCenterY);
      wCtx.restore();
    }
  }

  // Copy HD working canvas onto target canvas if supersampled
  if (workScale > 1) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, outW, outH);
    ctx.drawImage(workCanvas, 0, 0, outW, outH);
    workCanvas.width = 1;
    workCanvas.height = 1;
  }
}

/**
 * Memory-safe rendering of a single TemporaryPhotoItem to a Blob.
 * Immediately closes decoded ImageBitmap and zeroes out the scratch canvas after encoding.
 */
export async function renderPhotoItemToBlob(
  photo: TemporaryPhotoItem,
  eventConfig: EventConfiguration,
  allLogos: BrandingLogoAsset[],
  activeOrganization?: OrganizationProfile
): Promise<Blob> {
  let bitmap: ImageBitmap | null = null;
  let fallbackImg: HTMLImageElement | null = null;

  try {
    if ('createImageBitmap' in window) {
      bitmap = await createImageBitmap(photo.file);
    } else {
      fallbackImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Unable to decode image ${photo.filename}`));
        img.src = photo.previewObjectUrl;
      });
    }

    const source = bitmap || fallbackImg!;
    const srcW = bitmap ? bitmap.width : fallbackImg!.naturalWidth;
    const srcH = bitmap ? bitmap.height : fallbackImg!.naturalHeight;

    // Merge optional temporary photo-specific adjustments if present
    const mergedEventConfig: EventConfiguration = photo.tempAdjustmentsOverride
      ? {
          ...eventConfig,
          photoAdjustments: {
            ...eventConfig.photoAdjustments,
            ...photo.tempAdjustmentsOverride,
          },
        }
      : eventConfig;

    const scratchCanvas = document.createElement('canvas');
    await renderBrandedPhotoToCanvas(
      scratchCanvas,
      source,
      srcW,
      srcH,
      mergedEventConfig,
      allLogos,
      undefined,
      true,
      activeOrganization
    );

    const mimeType = eventConfig.exportConfig.format;
    const quality = Math.max(0.96, eventConfig.exportConfig.quality ?? 0.96);

    const blob = await new Promise<Blob>((resolve, reject) => {
      scratchCanvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error(`Canvas encoding failed for ${photo.filename}`));
        },
        mimeType,
        quality
      );
    });

    // Release scratch canvas backing store immediately
    scratchCanvas.width = 1;
    scratchCanvas.height = 1;

    return blob;
  } finally {
    if (bitmap) {
      bitmap.close();
    }
  }
}
