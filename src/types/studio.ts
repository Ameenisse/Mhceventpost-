/**
 * Complete Type Definitions for Event Photo Branding Studio
 * STRICT SEPARATION:
 * 1. Persistent Models (Users, Organizations, Events, Logos, Fonts, Templates) -> Synced to Firebase Firestore (scoped to user UID)
 * 2. Volatile Session Models (TemporaryPhotoItem, RenderProgress, BatchExportResult) -> Kept strictly in RAM; NEVER persisted
 */

export type PhotoOrientation = 'landscape' | 'portrait' | 'square';

export type LogoCategory = 'organization' | 'sponsor' | 'participant' | 'co-organizer';

export type SocialPlatformType =
  | 'facebook'
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'x'
  | 'whatsapp'
  | 'viber'
  | 'website'
  | 'custom';

export interface SocialMediaRecord {
  id: string;
  platform: SocialPlatformType;
  displayName: string; // e.g., "@maldivestourism" or "+960 332-3228"
  urlOrContact: string;
  icon: string;
  visible: boolean;
}

export interface BrandingLogoAsset {
  id: string;
  ownerUid?: string;
  name: string;
  category: LogoCategory;
  organizationId?: string;
  eventId?: string; // Optional event scope so each event can have its own dedicated sponsor logos
  dataUrl: string; // SVG or PNG data URL for reusable branding logo
  storagePath?: string; // Optional Firebase Cloud Storage path
  aspectRatio: number; // width / height
  createdAt: string;
}

export interface CustomFontAsset {
  id: string;
  ownerUid?: string;
  name: string;
  family: string;
  isRtlOptimized: boolean;
  dataUrl?: string; // Optional base64 font file or web font identifier
  storagePath?: string;
  createdAt: string;
}

export interface OrganizationProfile {
  id: string;
  ownerUid?: string;
  name: string;
  shortName?: string;
  nameDhivehi?: string;
  address: string;
  phone?: string;
  email?: string;
  website?: string;
  socialLinks?: SocialMediaRecord[];
  mainLogo1Id: string;
  mainLogo2Id?: string;
  additionalLogoIds?: string[];
  headerPosition: 'top-right' | 'top-bar' | 'top-corners' | 'top-center' | 'top-right-left';
  headerStyle?: 'side-by-side' | 'logos-above-text' | 'logos-beside-text' | 'compact-horizontal' | 'custom';
  headerDisplayMode?: 'both-logos' | 'one-logo' | 'hide-header';
  logo1Scale: number; // 20 - 150
  logo2Scale: number; // 20 - 150
  headerLogoGap?: number; // px gap between Main Logo 1 and Main Logo 2
  headerPaddingX: number; // px relative to 1920 reference
  headerPaddingY: number;
  headerBgColor?: string;
  headerScrimOpacity: number; // 0 - 100
  headerFontFamily?: string;
  headerTextColor?: string;
  headerTextSize?: number; // 14 - 48
  headerTextWeight?: '400' | '500' | '600' | '700' | '800';
  headerAddressSize?: number; // 10 - 32
  headerAddressColor?: string;
  defaultTitleFont?: string;
  defaultDirection?: 'rtl' | 'ltr';
  defaultTitleColor?: string;
  primaryColor?: string;
  secondaryColor?: string;
  defaultLogoHeight?: number;
  defaultLogoGap?: number;
  archived?: boolean;
  preferences: {
    defaultFormat: 'image/jpeg' | 'image/png' | 'image/webp';
    defaultQuality: number;
    autoApplyHeader: boolean;
  };
  updatedAt: string;
}

export interface GradientStop {
  id: string;
  offset: number; // 0 to 100 (%)
  color: string; // hex #000000
  opacity: number; // 0 to 100 (%)
}

export interface FooterBannerConfig {
  enabled: boolean;
  bannerMode?: 'bottom-overlay' | 'bottom-extension' | 'floating' | 'transparent-overlay';
  heightPercent: number; // 0 to 60%, default 32%
  widthPercent: number; // e.g., 100%
  position: 'bottom' | 'floating-bottom' | 'top';
  bottomOffsetPx: number;
  paddingTopPx?: number;
  paddingBottomPx?: number;
  paddingLeftPx?: number;
  paddingRightPx?: number;
  borderColor?: string;
  borderWidthPx?: number;
  cornerRadiusPx?: number;
  backgroundColor: string; // e.g. #142F4D
  endColor?: string;
  baseTransparency: number; // 0 - 100
  gradientDirection: number; // 90 = Right, 270 = Left, 0 = Up, 180 = Down, or custom angle
  fadeDirectionPreset?: 'right' | 'left' | 'up' | 'down' | 'custom';
  startOpacity?: number; // 0 - 100%, default 95%
  endOpacity?: number; // 0 - 100%, default 0%
  gradientStartPos: number; // Fade Starts At: 0 - 100%, default 0%
  gradientEndPos: number; // Fade Ends At: 0 - 100%, default 100%
  midpointPercent?: number; // 10 - 90%, default 50%
  reverseGradient?: boolean;
  gradientOpacity: number; // 0 - 100%
  gradientStops: GradientStop[];
}

export interface EventTextConfig {
  eventTitle: string;
  subtitle: string;
  fontFamily: string;
  fontWeight?: '400' | '500' | '600' | '700' | '800';
  italic?: boolean;
  fontSize: number; // px on 1920 reference width
  subtitleFontSize: number;
  textColor: string;
  subtitleColor: string;
  textOpacity?: number; // 0 - 100
  lineHeight?: number; // 1.0 - 2.0
  textPositionX: number; // horizontal offset
  textPositionY: number; // vertical offset inside banner
  direction: 'rtl' | 'ltr';
  alignment: 'right' | 'center' | 'left';
  shadowEnabled: boolean;
  shadowBlur: number;
  shadowColor: string;
  strokeEnabled: boolean;
  strokeWidth: number;
  strokeColor: string;
  letterSpacing: number;
  autoWrap?: boolean;
  fitToBanner?: boolean;
  showDateOnPhoto?: boolean;
  dateDisplayFormat?: 'YYYY-MM-DD' | 'DD MMM YYYY' | 'FULL';
  dateFontSize?: number;
  dateColor?: string;
  showVenueOnPhoto?: boolean;
  venueFontSize?: number;
  venueColor?: string;
}

export interface IndividualLogoOverride {
  heightScale?: number; // 0.5 to 2.0
  opacity?: number; // 0 to 100
  rotation?: number; // -180 to 180
  visible?: boolean;
}

export interface SponsorsParticipantsConfig {
  selectedSponsorIds: string[]; // Ordered array of sponsor logo IDs
  selectedParticipantIds: string[]; // Ordered array of participant logo IDs
  selectedCoOrganizerIds?: string[]; // Ordered array of co-organizer logo IDs
  displayGroupMode?: 'both' | 'sponsors-only' | 'participants-only' | 'neither';
  logoHeight: number; // Default 60px (range 10 - 300px)
  logoMaxWidth: number; // px on 1920 reference
  gapBetweenLogos: number; // Default 20px (range 0 - 200px)
  participantLogoHeight?: number; // Independent height for participants
  participantLogoGap?: number; // Independent gap for participants
  coOrganizerLogoHeight?: number;
  coOrganizerLogoGap?: number;
  rowGap: number; // px
  paddingX: number; // px
  paddingY: number; // px
  arrangement?: '1-row' | '2-rows' | '3-rows' | 'auto-wrap';
  alignment: 'left' | 'center' | 'right' | 'space-between' | 'space-evenly';
  showSponsorLabel: boolean;
  sponsorLabelText: string;
  sponsorCategoryMode?: 'auto' | 'custom';
  sponsorBackdropEnabled?: boolean;
  sponsorBackdropColor?: string;
  backdropPillOpacity: number; // 0 - 100
  individualOverrides?: Record<string, IndividualLogoOverride>;
}

export interface SocialPhotoOverlayConfig {
  enabled: boolean;
  displayMode: 'icon-and-username' | 'icon-only' | 'text-only' | 'hide';
  placement: 'header-below' | 'footer-top' | 'top-left';
  iconSize: number; // 14 - 40px
  textSize: number; // 12 - 32px
  color: string;
  gap: number; // 8 - 40px
}

export interface LightroomAdjustments {
  enabled: boolean;
  brightness?: number; // -100 to +100
  exposure: number; // -100 to +100
  contrast: number; // -100 to +100
  highlights: number; // -100 to +100
  shadows: number; // -100 to +100
  whites: number; // -100 to +100
  blacks: number; // -100 to +100
  temperature: number; // -100 (cool) to +100 (warm)
  tint: number; // -100 (green) to +100 (magenta)
  vibrance: number; // -100 to +100
  saturation: number; // -100 to +100
  clarity: number; // 0 to +100
  vignetteAmount: number; // 0 to 100
  vignetteFeather: number; // 10 to 100
  sharpening: number; // 0 to 100
  rotationDegrees?: 0 | 90 | 180 | 270;
  cropPreset?: 'original' | '16:9' | '4:3' | '4:5' | '1:1';
}

export interface OrientationOverrideConfig {
  portraitBannerHeightScale: number; // e.g., 1.0x
  portraitFontSizeScale: number; // e.g., 1.0x
  portraitLogoScale: number; // e.g., 1.0x
  portraitStackLogos: boolean;
  portraitSameAsLandscape?: boolean; // When true, portrait images use the exact same arrangements as landscape banner
  landscapeBannerHeightScale: number;
  landscapeFontSizeScale: number;
  landscapeLogoScale: number;
}

export interface ExportConfig {
  format: 'image/jpeg' | 'image/png' | 'image/webp';
  quality: number; // 0.5 to 1.0
  resolutionMode: 'original' | '4k' | '2k' | '1080p';
  filenamePrefix: string;
  numberingStart: number;
  preserveOriginalFilename: boolean;
  batchConcurrency: number; // 2 to 6
}

export interface EventConfiguration {
  id: string;
  ownerUid?: string;
  title: string;
  date: string; // YYYY-MM-DD
  venue: string;
  description: string;
  primaryOrgId: string;
  coOrganizerIds: string[];
  archived?: boolean;
  // Organization Branding Overrides for this Event
  mainLogo1Id: string;
  mainLogo2Id: string;
  orgNameOverride: string;
  orgAddressOverride: string;
  headerPosition: 'top-right' | 'top-bar' | 'top-corners' | 'top-center' | 'top-right-left';
  headerStyle?: 'side-by-side' | 'logos-above-text' | 'logos-beside-text' | 'compact-horizontal' | 'custom';
  headerDisplayMode?: 'both-logos' | 'one-logo' | 'hide-header';
  logo1Scale: number;
  logo2Scale: number;
  headerLogoGap?: number;
  headerPaddingX: number;
  headerPaddingY: number;
  headerBgColor?: string;
  headerScrimOpacity: number;
  headerFontFamily?: string;
  headerTextColor?: string;
  headerTextSize?: number;
  headerTextWeight?: '400' | '500' | '600' | '700' | '800';
  headerAddressSize?: number;
  headerAddressColor?: string;
  headerOffsetX?: number;
  headerOffsetY?: number;
  // Social Media on Photo
  socialOverlay?: SocialPhotoOverlayConfig;
  // Footer Banner
  footerBanner: FooterBannerConfig;
  // Typography
  textConfig: EventTextConfig;
  // Sponsors & Participants
  sponsorsConfig: SponsorsParticipantsConfig;
  // Lightroom Color & Tone Grading
  photoAdjustments: LightroomAdjustments;
  // Portrait / Landscape Responsive Rules
  orientationConfig: OrientationOverrideConfig;
  // Export Settings
  exportConfig: ExportConfig;
  updatedAt: string;
}

export interface SavedTemplatePreset {
  id: string;
  ownerUid?: string;
  organizationId?: string;
  name: string;
  description: string;
  category: 'banner' | 'color-grade' | 'full-event';
  presetStyle?:
    | 'official'
    | 'minimal'
    | 'modern-gradient'
    | 'formal-ceremony'
    | 'community-event'
    | 'transparent-banner'
    | 'custom';
  footerBanner?: FooterBannerConfig;
  textConfig?: Partial<EventTextConfig>;
  photoAdjustments?: LightroomAdjustments;
  orientationConfig?: OrientationOverrideConfig;
  createdAt: string;
}

export type UserRole = 'super_admin' | 'user';
export type UserApprovalStatus = 'pending' | 'approved' | 'suspended' | 'rejected';

export interface DeveloperProfileConfig {
  photoUrl: string; // URL or base64 data URL
  photoTransparency: number; // 0 to 100 (%) - Default 30%
  developerName: string; // e.g. "Amin Isse"
  designation: string; // e.g. "Lead Developer & Solutions Architect"
  bio?: string;
  updatedAt: string;
}

export interface RegisteredUserRecord {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role: UserRole;
  status: UserApprovalStatus;
  requestedAt: string;
  approvedAt?: string;
  suspendedAt?: string;
  lastSignInAt?: string;
  organizationCount?: number;
  eventCount?: number;
}

export interface AuthenticatedUserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role?: UserRole;
  status?: UserApprovalStatus;
  createdAt: string;
  lastSignInAt: string;
  lastSignInTime?: string;
}

export interface CloudSyncState {
  status: 'idle' | 'syncing' | 'synced' | 'saving' | 'saved' | 'error';
  lastSyncedAt?: string;
  errorMessage?: string;
}

/**
 * ============================================================================
 * TEMPORARY SESSION PHOTO MODELS (VOLATILE - RAM ONLY, NEVER PERSISTED)
 * ============================================================================
 */
export type PhotoProcessStatus =
  | 'imported'
  | 'queued'
  | 'processing'
  | 'generated'
  | 'exported'
  | 'failed';

export interface TemporaryPhotoItem {
  id: string;
  file: File; // Reference to original local File in memory
  filename: string;
  fileSize: number;
  lastModified: number;
  previewObjectUrl: string; // Volatile URL.createObjectURL(file) - explicitly revoked on clear
  generatedObjectUrl?: string; // Volatile URL for generated preview if kept in memory
  generatedBlob?: Blob; // Temporary generated blob prior to export; cleared immediately on cleanup
  width: number;
  height: number;
  orientation: PhotoOrientation;
  selected: boolean;
  status: PhotoProcessStatus;
  errorMessage?: string;
  // Optional temporary photo-specific adjustment override (kept in RAM only for current batch)
  tempAdjustmentsOverride?: Partial<LightroomAdjustments>;
}

export interface BatchProcessState {
  isProcessing: boolean;
  isExporting: boolean;
  currentStepLabel: string;
  completedCount: number;
  totalCount: number;
  failedFiles: { id: string; filename: string; reason: string }[];
  canCancel: boolean;
}

export interface ExportSuccessSummary {
  eventName: string;
  eventDate: string;
  totalExported: number;
  exportFormat: string;
  destinationFolder: string;
  exportMethod: 'folder-direct' | 'zip-file-handle' | 'zip-browser-link';
  timestamp: string;
}

export type InspectorTab =
  | 'event-org'
  | 'banner-gradient'
  | 'typography'
  | 'logos'
  | 'sponsors'
  | 'adjustments'
  | 'orientation'
  | 'export';

