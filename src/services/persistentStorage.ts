import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  BrandingLogoAsset,
  CustomFontAsset,
  DeveloperProfileConfig,
  EventConfiguration,
  OrganizationProfile,
  RegisteredUserRecord,
  SavedTemplatePreset,
  UserApprovalStatus,
  UserRole,
} from '../types/studio';
import { db, handleFirestoreError, OperationType } from './firebaseClient';

export const SUPER_ADMIN_EMAIL = 'ameen.isse@gmail.com';

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return clean === SUPER_ADMIN_EMAIL.toLowerCase() || clean === 'ababeel.mv@gmail.com';
}

export const DEFAULT_DEVELOPER_PROFILE: DeveloperProfileConfig = {
  photoUrl: '/amin-isse.jpg',
  photoTransparency: 30, // Default 30% transparency as requested
  developerName: 'Amin Isse',
  designation: 'Lead Developer & Solutions Architect',
  bio: 'Specialized in automated brand identity architectures, Dhivehi RTL typography, and local RAM batch processing.',
  updatedAt: '2026-01-01T00:00:00Z',
};

const STORAGE_KEYS = {
  ORGANIZATIONS: 'epbs_persistent_organizations_v1',
  EVENTS: 'epbs_persistent_events_v1',
  ACTIVE_EVENT_ID: 'epbs_persistent_active_event_id_v1',
  LOGOS: 'epbs_persistent_logos_v1',
  FONTS: 'epbs_persistent_fonts_v1',
  TEMPLATES: 'epbs_persistent_templates_v1',
  DEVELOPER_PROFILE: 'epbs_developer_profile_v1',
  REGISTERED_USERS: 'epbs_registered_users_registry_v1',
  GLOBAL_ORGS: 'epbs_global_orgs_cache_v1',
  GLOBAL_EVENTS: 'epbs_global_events_cache_v1',
};

function sanitizeDocId(rawId: string): string {
  const cleaned = rawId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120);
  return cleaned || `id-${Date.now()}`;
}

function truncateStr(val: string | undefined | null, maxLen: number): string {
  if (!val) return '';
  return String(val).slice(0, maxLen);
}

/**
 * Helper to create crisp SVG data URLs for default reusable organization, sponsor, and participant logos.
 */
function svgToDataUrl(svgString: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim())}`;
}

export const DEFAULT_LOGOS: BrandingLogoAsset[] = [];


export const DEFAULT_FONTS: CustomFontAsset[] = [
  {
    id: 'font-thaana-eamaan',
    name: 'MV Eamaan XP (Dhivehi Official — Default)',
    family: "'Mv_Eamaan_XP', 'Faruma', 'Noto Sans Thaana', sans-serif",
    isRtlOptimized: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'font-thaana-faruma',
    name: 'Faruma (Dhivehi Official Classic)',
    family: "'Faruma', 'Mv_Eamaan_XP', 'Noto Sans Thaana', sans-serif",
    isRtlOptimized: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'font-thaana-noto',
    name: 'Noto Sans Thaana (Dhivehi RTL Modern)',
    family: "'Noto Sans Thaana', 'Mv_Eamaan_XP', 'Faruma', sans-serif",
    isRtlOptimized: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'font-thaana-waheed',
    name: 'MV Waheed (Dhivehi Bold Display)',
    family: "'MV Waheed', 'Mv_Eamaan_XP', 'Faruma', sans-serif",
    isRtlOptimized: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'font-outfit-display',
    name: 'Outfit Geometric Display (LTR/RTL)',
    family: "'Outfit', 'Mv_Eamaan_XP', 'Faruma', 'Noto Sans Thaana', sans-serif",
    isRtlOptimized: false,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'font-public-sans',
    name: 'Public Sans Editorial',
    family: "'Public Sans', 'Mv_Eamaan_XP', 'Faruma', 'Noto Sans Thaana', sans-serif",
    isRtlOptimized: false,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'font-mono-tech',
    name: 'JetBrains Mono Technical',
    family: "'JetBrains Mono', 'Mv_Eamaan_XP', 'Noto Sans Thaana', monospace",
    isRtlOptimized: false,
    createdAt: '2026-01-01T00:00:00Z',
  },
];

export const DEFAULT_ORGANIZATIONS: OrganizationProfile[] = [];


export const DEFAULT_EVENTS: EventConfiguration[] = [];

export const DEFAULT_TEMPLATES: SavedTemplatePreset[] = [];


function safeLoad<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn(`Failed to parse persistent storage key ${key}:`, e);
    return fallback;
  }
}

function safeSave<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error(`Failed to save persistent storage key ${key}:`, e);
    return false;
  }
}

const LEGACY_DEMO_ORG_IDS = new Set(['org-mta', 'org-oceanic', 'org-heritage']);
const LEGACY_DEMO_EVENT_IDS = new Set(['evt-001', 'evt-002', 'evt-003']);
const LEGACY_DEMO_LOGO_IDS = new Set([
  'logo-org-mta',
  'logo-org-oceanic',
  'logo-org-dhivehi-heritage',
  'logo-spon-dhiraagu',
  'logo-spon-bml',
  'logo-spon-maldivian',
  'logo-part-coral',
  'logo-part-youth',
]);
const LEGACY_DEMO_TEMPLATE_IDS = new Set([
  'tpl-midnight-editorial',
  'tpl-royal-ocean-gala',
  'tpl-warm-editorial-grade',
]);

export function createBlankEventConfiguration(
  org?: OrganizationProfile,
  ownerUid?: string
): EventConfiguration {
  return {
    id: `evt-${Date.now()}`,
    ownerUid,
    title: 'New Event',
    date: new Date().toISOString().slice(0, 10),
    venue: '',
    description: '',
    primaryOrgId: org?.id || '',
    coOrganizerIds: [],
    mainLogo1Id: org?.mainLogo1Id || '',
    mainLogo2Id: org?.mainLogo2Id || '',
    orgNameOverride: org?.name || '',
    orgAddressOverride: org?.address || '',
    headerPosition: 'top-right',
    headerStyle: 'logos-beside-text',
    headerDisplayMode: 'both-logos',
    logo1Scale: 100,
    logo2Scale: 95,
    headerLogoGap: 16,
    headerPaddingX: 48,
    headerPaddingY: 36,
    headerScrimOpacity: 40,
    headerFontFamily: org?.headerFontFamily || "'Mv_Eamaan_XP', 'Faruma', 'Noto Sans Thaana', sans-serif",
    socialOverlay: {
      enabled: false,
      displayMode: 'icon-and-username',
      placement: 'header-below',
      iconSize: 18,
      textSize: 14,
      color: '#E2E8F0',
      gap: 16,
    },
    footerBanner: {
      enabled: true,
      bannerMode: 'bottom-overlay',
      heightPercent: 28,
      widthPercent: 100,
      position: 'bottom',
      bottomOffsetPx: 0,
      backgroundColor: '#0F172A',
      endColor: '#0F172A',
      baseTransparency: 0,
      gradientDirection: 0,
      fadeDirectionPreset: 'up',
      startOpacity: 95,
      endOpacity: 0,
      gradientStartPos: 0,
      gradientEndPos: 100,
      midpointPercent: 50,
      gradientOpacity: 100,
      gradientStops: [
        { id: 'stop-1', offset: 0, color: '#0F172A', opacity: 95 },
        { id: 'stop-2', offset: 50, color: '#0F172A', opacity: 70 },
        { id: 'stop-3', offset: 100, color: '#0F172A', opacity: 0 },
      ],
    },
    textConfig: {
      eventTitle: 'New Event',
      subtitle: '',
      fontFamily: "'Mv_Eamaan_XP', 'Faruma', 'Noto Sans Thaana', sans-serif",
      fontWeight: '700',
      fontSize: 40,
      subtitleFontSize: 18,
      textColor: '#FFFFFF',
      subtitleColor: '#38BDF8',
      textPositionX: 0,
      textPositionY: 18,
      direction: 'rtl',
      alignment: 'right',
      shadowEnabled: true,
      shadowBlur: 10,
      shadowColor: '#000000',
      strokeEnabled: false,
      strokeWidth: 2,
      strokeColor: '#000000',
      letterSpacing: 0,
      showDateOnPhoto: true,
      showVenueOnPhoto: true,
    },
    sponsorsConfig: {
      selectedSponsorIds: [],
      selectedParticipantIds: [],
      logoHeight: 52,
      logoMaxWidth: 160,
      gapBetweenLogos: 24,
      rowGap: 16,
      paddingX: 36,
      paddingY: 20,
      alignment: 'center',
      showSponsorLabel: true,
      sponsorCategoryMode: 'auto',
      sponsorLabelText: 'Participant / Partner',
      backdropPillOpacity: 85,
    },
    photoAdjustments: {
      enabled: false,
      exposure: 0,
      contrast: 0,
      highlights: 0,
      shadows: 0,
      whites: 0,
      blacks: 0,
      temperature: 0,
      tint: 0,
      vibrance: 0,
      saturation: 0,
      clarity: 0,
      vignetteAmount: 0,
      vignetteFeather: 50,
      sharpening: 0,
    },
    orientationConfig: {
      portraitBannerHeightScale: 1.0,
      portraitFontSizeScale: 1.0,
      portraitLogoScale: 1.0,
      portraitStackLogos: false,
      portraitSameAsLandscape: true,
      landscapeBannerHeightScale: 1.0,
      landscapeFontSizeScale: 1.0,
      landscapeLogoScale: 1.0,
    },
    exportConfig: {
      format: 'image/jpeg',
      quality: 0.95,
      resolutionMode: 'original',
      filenamePrefix: 'IMG',
      numberingStart: 1,
      preserveOriginalFilename: false,
      batchConcurrency: 3,
    },
    updatedAt: new Date().toISOString(),
  };
}


export const PersistentStorageService = {
  // Local fallback helpers (strictly scoped per UID when signed in, with safe global fallback)
  getOrganizations(uid?: string): OrganizationProfile[] {
    const key = uid ? `${STORAGE_KEYS.ORGANIZATIONS}_${uid}` : STORAGE_KEYS.ORGANIZATIONS;
    let list = safeLoad<OrganizationProfile[]>(key, []).filter(
      (o) => !LEGACY_DEMO_ORG_IDS.has(o.id)
    );
    if (list.length === 0 && uid) {
      const fallbackList = safeLoad<OrganizationProfile[]>(STORAGE_KEYS.ORGANIZATIONS, []).filter(
        (o) => !LEGACY_DEMO_ORG_IDS.has(o.id)
      );
      if (fallbackList.length > 0) {
        list = fallbackList;
        safeSave(key, list);
      }
    }
    return list;
  },

  saveOrganizations(orgs: OrganizationProfile[], uid?: string): boolean {
    const cleanList = orgs.filter((o) => !LEGACY_DEMO_ORG_IDS.has(o.id));
    // Always persist to global backup so data is never lost
    safeSave(STORAGE_KEYS.ORGANIZATIONS, cleanList);
    if (uid) {
      const key = `${STORAGE_KEYS.ORGANIZATIONS}_${uid}`;
      safeSave(key, cleanList);
    }
    return true;
  },

  getEvents(uid?: string): EventConfiguration[] {
    const key = uid ? `${STORAGE_KEYS.EVENTS}_${uid}` : STORAGE_KEYS.EVENTS;
    let list = safeLoad<EventConfiguration[]>(key, []).filter(
      (e) => !LEGACY_DEMO_EVENT_IDS.has(e.id) && !LEGACY_DEMO_ORG_IDS.has(e.primaryOrgId)
    );
    if (list.length === 0 && uid) {
      const fallbackList = safeLoad<EventConfiguration[]>(STORAGE_KEYS.EVENTS, []).filter(
        (e) => !LEGACY_DEMO_EVENT_IDS.has(e.id) && !LEGACY_DEMO_ORG_IDS.has(e.primaryOrgId)
      );
      if (fallbackList.length > 0) {
        list = fallbackList;
        safeSave(key, list);
      }
    }
    return list;
  },

  saveEvents(events: EventConfiguration[], uid?: string): boolean {
    const cleanList = events.filter((e) => !LEGACY_DEMO_EVENT_IDS.has(e.id));
    safeSave(STORAGE_KEYS.EVENTS, cleanList);
    if (uid) {
      const key = `${STORAGE_KEYS.EVENTS}_${uid}`;
      safeSave(key, cleanList);
    }
    return true;
  },

  getActiveEventId(uid?: string): string {
    const key = uid ? `${STORAGE_KEYS.ACTIVE_EVENT_ID}_${uid}` : STORAGE_KEYS.ACTIVE_EVENT_ID;
    let saved = safeLoad<string>(key, '');
    if (!saved && uid) {
      saved = safeLoad<string>(STORAGE_KEYS.ACTIVE_EVENT_ID, '');
    }
    return LEGACY_DEMO_EVENT_IDS.has(saved) ? '' : saved;
  },

  saveActiveEventId(eventId: string, uid?: string): boolean {
    safeSave(STORAGE_KEYS.ACTIVE_EVENT_ID, eventId);
    if (uid) {
      const key = `${STORAGE_KEYS.ACTIVE_EVENT_ID}_${uid}`;
      safeSave(key, eventId);
    }
    return true;
  },

  getLogos(uid?: string): BrandingLogoAsset[] {
    const key = uid ? `${STORAGE_KEYS.LOGOS}_${uid}` : STORAGE_KEYS.LOGOS;
    let list = safeLoad<BrandingLogoAsset[]>(key, []).filter(
      (l) => !LEGACY_DEMO_LOGO_IDS.has(l.id)
    );
    if (list.length === 0 && uid) {
      const fallbackList = safeLoad<BrandingLogoAsset[]>(STORAGE_KEYS.LOGOS, []).filter(
        (l) => !LEGACY_DEMO_LOGO_IDS.has(l.id)
      );
      if (fallbackList.length > 0) {
        list = fallbackList;
        safeSave(key, list);
      }
    }
    return list;
  },

  saveLogos(logos: BrandingLogoAsset[], uid?: string): boolean {
    const cleanList = logos.filter((l) => !LEGACY_DEMO_LOGO_IDS.has(l.id));
    safeSave(STORAGE_KEYS.LOGOS, cleanList);
    if (uid) {
      const key = `${STORAGE_KEYS.LOGOS}_${uid}`;
      safeSave(key, cleanList);
    }
    return true;
  },

  getFonts(uid?: string): CustomFontAsset[] {
    const key = uid ? `${STORAGE_KEYS.FONTS}_${uid}` : STORAGE_KEYS.FONTS;
    let list = safeLoad<CustomFontAsset[]>(key, []);
    if (list.length === 0 && uid) {
      list = safeLoad<CustomFontAsset[]>(STORAGE_KEYS.FONTS, []);
    }
    if (list.length === 0) {
      safeSave(key, DEFAULT_FONTS);
      safeSave(STORAGE_KEYS.FONTS, DEFAULT_FONTS);
      return DEFAULT_FONTS;
    }
    return list;
  },

  saveFonts(fonts: CustomFontAsset[], uid?: string): boolean {
    safeSave(STORAGE_KEYS.FONTS, fonts);
    if (uid) {
      const key = `${STORAGE_KEYS.FONTS}_${uid}`;
      safeSave(key, fonts);
    }
    return true;
  },

  getTemplates(uid?: string): SavedTemplatePreset[] {
    const key = uid ? `${STORAGE_KEYS.TEMPLATES}_${uid}` : STORAGE_KEYS.TEMPLATES;
    let list = safeLoad<SavedTemplatePreset[]>(key, []).filter(
      (t) => !LEGACY_DEMO_TEMPLATE_IDS.has(t.id)
    );
    if (list.length === 0 && uid) {
      const fallbackList = safeLoad<SavedTemplatePreset[]>(STORAGE_KEYS.TEMPLATES, []).filter(
        (t) => !LEGACY_DEMO_TEMPLATE_IDS.has(t.id)
      );
      if (fallbackList.length > 0) {
        list = fallbackList;
        safeSave(key, list);
      }
    }
    return list;
  },

  saveTemplates(templates: SavedTemplatePreset[], uid?: string): boolean {
    const cleanList = templates.filter((t) => !LEGACY_DEMO_TEMPLATE_IDS.has(t.id));
    safeSave(STORAGE_KEYS.TEMPLATES, cleanList);
    if (uid) {
      const key = `${STORAGE_KEYS.TEMPLATES}_${uid}`;
      safeSave(key, cleanList);
    }
    return true;
  },

  /**
   * ============================================================================
   * CLOUD FIRESTORE PERSISTENCE (USER-SCOPED MULTI-TENANT)
   * ============================================================================
   */
  async ensureUserProfileDoc(user: {
    uid: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  }): Promise<void> {
    const path = `users/${user.uid}`;
    const userRef = doc(db, 'users', user.uid);
    let snap;
    try {
      snap = await getDoc(userRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return;
    }

    try {
      if (!snap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          displayName: truncateStr(user.displayName || 'Studio Photographer', 150),
          email: truncateStr(user.email || '', 200),
          photoURL: truncateStr(user.photoURL || '', 1000),
          preferencesJson: JSON.stringify({ theme: 'dark', defaultExportFormat: 'image/jpeg' }),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        const existingData = snap.data();
        await updateDoc(userRef, {
          displayName: truncateStr(
            user.displayName || existingData.displayName || 'Studio Photographer',
            150
          ),
          email: truncateStr(user.email || existingData.email || '', 200),
          photoURL: truncateStr(user.photoURL || existingData.photoURL || '', 1000),
          preferencesJson: truncateStr(existingData.preferencesJson || '{}', 5000),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(
        error,
        snap.exists() ? OperationType.UPDATE : OperationType.CREATE,
        path
      );
    }
  },

  async saveOrganizationToCloud(uid: string, org: OrganizationProfile): Promise<void> {
    const cleanOrgId = sanitizeDocId(org.id);
    const path = `users/${uid}/organizations/${cleanOrgId}`;
    const orgRef = doc(db, 'users', uid, 'organizations', cleanOrgId);
    let snap;
    try {
      snap = await getDoc(orgRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return;
    }

    const mutableFields = {
      name: truncateStr(org.name || 'Organization', 200),
      shortName: truncateStr(org.shortName || '', 100),
      nameDhivehi: truncateStr(org.nameDhivehi || '', 200),
      address: truncateStr(org.address || '', 300),
      phone: truncateStr(org.phone || '', 80),
      email: truncateStr(org.email || '', 150),
      website: truncateStr(org.website || '', 250),
      mainLogo1Id: truncateStr(org.mainLogo1Id || '', 128),
      mainLogo2Id: truncateStr(org.mainLogo2Id || '', 128),
      archived: Boolean(org.archived),
      configPayload: truncateStr(
        JSON.stringify({ ...org, id: cleanOrgId, ownerUid: uid }),
        120000
      ),
      updatedAt: serverTimestamp(),
    };

    try {
      if (!snap.exists()) {
        await setDoc(orgRef, {
          id: cleanOrgId,
          ownerUid: uid,
          ...mutableFields,
          createdAt: serverTimestamp(),
        });
      } else {
        await updateDoc(orgRef, mutableFields);
      }
    } catch (error) {
      handleFirestoreError(
        error,
        snap.exists() ? OperationType.UPDATE : OperationType.CREATE,
        path
      );
    }
  },

  async deleteOrganizationFromCloud(uid: string, organizationId: string): Promise<void> {
    const cleanOrgId = sanitizeDocId(organizationId);
    const path = `users/${uid}/organizations/${cleanOrgId}`;
    try {
      await deleteDoc(doc(db, 'users', uid, 'organizations', cleanOrgId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async saveEventToCloud(uid: string, evt: EventConfiguration): Promise<void> {
    const cleanOrgId = sanitizeDocId(evt.primaryOrgId || 'org-mta');
    const cleanEventId = sanitizeDocId(evt.id);
    const path = `users/${uid}/organizations/${cleanOrgId}/events/${cleanEventId}`;
    const evtRef = doc(db, 'users', uid, 'organizations', cleanOrgId, 'events', cleanEventId);
    let snap;
    try {
      snap = await getDoc(evtRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return;
    }

    const mutableFields = {
      title: truncateStr(evt.title || 'Untitled Event', 300),
      date: truncateStr(evt.date || '', 40),
      venue: truncateStr(evt.venue || '', 300),
      archived: Boolean(evt.archived),
      configPayload: truncateStr(
        JSON.stringify({
          ...evt,
          id: cleanEventId,
          primaryOrgId: cleanOrgId,
          ownerUid: uid,
        }),
        250000
      ),
      updatedAt: serverTimestamp(),
    };

    try {
      if (!snap.exists()) {
        await setDoc(evtRef, {
          id: cleanEventId,
          ownerUid: uid,
          organizationId: cleanOrgId,
          ...mutableFields,
          createdAt: serverTimestamp(),
        });
      } else {
        await updateDoc(evtRef, mutableFields);
      }
    } catch (error) {
      handleFirestoreError(
        error,
        snap.exists() ? OperationType.UPDATE : OperationType.CREATE,
        path
      );
    }
  },

  async deleteEventFromCloud(uid: string, organizationId: string, eventId: string): Promise<void> {
    const cleanOrgId = sanitizeDocId(organizationId || 'org-mta');
    const cleanEventId = sanitizeDocId(eventId);
    const path = `users/${uid}/organizations/${cleanOrgId}/events/${cleanEventId}`;
    try {
      await deleteDoc(doc(db, 'users', uid, 'organizations', cleanOrgId, 'events', cleanEventId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async saveLogoToCloud(uid: string, logo: BrandingLogoAsset): Promise<void> {
    const cleanLogoId = sanitizeDocId(logo.id);
    const path = `users/${uid}/logos/${cleanLogoId}`;
    const logoRef = doc(db, 'users', uid, 'logos', cleanLogoId);
    let snap;
    try {
      snap = await getDoc(logoRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return;
    }

    const mutableFields = {
      name: truncateStr(logo.name || 'Logo', 200),
      category: ['organization', 'sponsor', 'participant', 'co-organizer'].includes(logo.category)
        ? logo.category
        : 'sponsor',
      organizationId: truncateStr(logo.organizationId || '', 128),
      eventId: truncateStr(logo.eventId || '', 128),
      dataUrl: truncateStr(logo.dataUrl || '', 850000),
      storagePath: truncateStr(logo.storagePath || '', 500),
      aspectRatio: Number.isFinite(logo.aspectRatio) ? Number(logo.aspectRatio) : 2.5,
      updatedAt: serverTimestamp(),
    };

    try {
      if (!snap.exists()) {
        await setDoc(logoRef, {
          id: cleanLogoId,
          ownerUid: uid,
          ...mutableFields,
          createdAt: serverTimestamp(),
        });
      } else {
        await updateDoc(logoRef, mutableFields);
      }
    } catch (error) {
      handleFirestoreError(
        error,
        snap.exists() ? OperationType.UPDATE : OperationType.CREATE,
        path
      );
    }
  },

  async deleteLogoFromCloud(uid: string, logoId: string): Promise<void> {
    const cleanLogoId = sanitizeDocId(logoId);
    const path = `users/${uid}/logos/${cleanLogoId}`;
    try {
      await deleteDoc(doc(db, 'users', uid, 'logos', cleanLogoId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async saveFontToCloud(uid: string, font: CustomFontAsset): Promise<void> {
    const cleanFontId = sanitizeDocId(font.id);
    const path = `users/${uid}/fonts/${cleanFontId}`;
    const fontRef = doc(db, 'users', uid, 'fonts', cleanFontId);
    let snap;
    try {
      snap = await getDoc(fontRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return;
    }

    const mutableFields = {
      name: truncateStr(font.name || 'Custom Font', 200),
      family: truncateStr(font.family || "'Noto Sans Thaana', sans-serif", 250),
      isRtlOptimized: Boolean(font.isRtlOptimized),
      dataUrl: truncateStr(font.dataUrl || '', 850000),
      storagePath: truncateStr(font.storagePath || '', 500),
      updatedAt: serverTimestamp(),
    };

    try {
      if (!snap.exists()) {
        await setDoc(fontRef, {
          id: cleanFontId,
          ownerUid: uid,
          ...mutableFields,
          createdAt: serverTimestamp(),
        });
      } else {
        await updateDoc(fontRef, mutableFields);
      }
    } catch (error) {
      handleFirestoreError(
        error,
        snap.exists() ? OperationType.UPDATE : OperationType.CREATE,
        path
      );
    }
  },

  async saveTemplateToCloud(uid: string, tpl: SavedTemplatePreset): Promise<void> {
    const cleanTplId = sanitizeDocId(tpl.id);
    const path = `users/${uid}/templates/${cleanTplId}`;
    const tplRef = doc(db, 'users', uid, 'templates', cleanTplId);
    let snap;
    try {
      snap = await getDoc(tplRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return;
    }

    const mutableFields = {
      organizationId: truncateStr(tpl.organizationId || '', 128),
      name: truncateStr(tpl.name || 'Saved Preset', 200),
      description: truncateStr(tpl.description || '', 500),
      category: ['banner', 'color-grade', 'full-event'].includes(tpl.category)
        ? tpl.category
        : 'banner',
      configPayload: truncateStr(
        JSON.stringify({ ...tpl, id: cleanTplId, ownerUid: uid }),
        200000
      ),
      updatedAt: serverTimestamp(),
    };

    try {
      if (!snap.exists()) {
        await setDoc(tplRef, {
          id: cleanTplId,
          ownerUid: uid,
          ...mutableFields,
          createdAt: serverTimestamp(),
        });
      } else {
        await updateDoc(tplRef, mutableFields);
      }
    } catch (error) {
      handleFirestoreError(
        error,
        snap.exists() ? OperationType.UPDATE : OperationType.CREATE,
        path
      );
    }
  },

  async deleteTemplateFromCloud(uid: string, templateId: string): Promise<void> {
    const cleanTplId = sanitizeDocId(templateId);
    const path = `users/${uid}/templates/${cleanTplId}`;
    try {
      await deleteDoc(doc(db, 'users', uid, 'templates', cleanTplId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  /**
   * Load all user-owned organizations, events, logos, fonts, and templates from Firestore.
   * If a brand-new user has 0 organizations in Firestore, seeds their isolated workspace
   * with starter organization & event templates so they can test immediately.
   */
  async loadUserWorkspaceFromCloud(user: {
    uid: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  }): Promise<{
    organizations: OrganizationProfile[];
    events: EventConfiguration[];
    logos: BrandingLogoAsset[];
    fonts: CustomFontAsset[];
    templates: SavedTemplatePreset[];
  }> {
    const uid = user.uid;
    await this.ensureUserProfileDoc(user);

    // 1. Load User's Own Logos (purge any legacy shared demo logos)
    const logosPath = `users/${uid}/logos`;
    let loadedLogos: BrandingLogoAsset[] = [];
    try {
      const qLogos = query(collection(db, 'users', uid, 'logos'), where('ownerUid', '==', uid));
      const snap = await getDocs(qLogos);
      for (const d of snap.docs) {
        const data = d.data();
        if (LEGACY_DEMO_LOGO_IDS.has(data.id)) {
          await deleteDoc(doc(db, 'users', uid, 'logos', data.id));
          continue;
        }
        loadedLogos.push({
          id: data.id,
          ownerUid: data.ownerUid,
          name: data.name,
          category: data.category,
          organizationId: data.organizationId || undefined,
          eventId: data.eventId || undefined,
          dataUrl: data.dataUrl,
          storagePath: data.storagePath || undefined,
          aspectRatio: Number(data.aspectRatio) || 2.5,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, logosPath);
    }

    // 2. Load Fonts
    const fontsPath = `users/${uid}/fonts`;
    let loadedFonts: CustomFontAsset[] = [];
    try {
      const qFonts = query(collection(db, 'users', uid, 'fonts'), where('ownerUid', '==', uid));
      const snap = await getDocs(qFonts);
      loadedFonts = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: data.id,
          ownerUid: data.ownerUid,
          name: data.name,
          family: data.family,
          isRtlOptimized: Boolean(data.isRtlOptimized),
          dataUrl: data.dataUrl || undefined,
          storagePath: data.storagePath || undefined,
          createdAt: new Date().toISOString(),
        };
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, fontsPath);
    }

    if (loadedFonts.length === 0) {
      loadedFonts = [...DEFAULT_FONTS];
    }

    // Register any custom uploaded FontFace dataUrls in browser session
    for (const f of loadedFonts) {
      if (f.dataUrl && f.dataUrl.startsWith('data:')) {
        try {
          const familyClean = f.family.split(',')[0].replace(/['"]/g, '').trim();
          const face = new FontFace(familyClean, `url(${f.dataUrl})`);
          const loaded = await face.load();
          document.fonts.add(loaded);
        } catch {
          // Ignore font load warning
        }
      }
    }

    // 3. Load User's Own Organizations (purge any legacy shared demo organizations & their demo events)
    const orgsPath = `users/${uid}/organizations`;
    let loadedOrgs: OrganizationProfile[] = [];
    try {
      const qOrgs = query(
        collection(db, 'users', uid, 'organizations'),
        where('ownerUid', '==', uid)
      );
      const snap = await getDocs(qOrgs);
      for (const d of snap.docs) {
        const data = d.data();
        if (LEGACY_DEMO_ORG_IDS.has(data.id)) {
          // Delete any demo events inside this demo organization first
          try {
            const qDemoEvts = query(
              collection(db, 'users', uid, 'organizations', data.id, 'events'),
              where('ownerUid', '==', uid),
              where('organizationId', '==', data.id)
            );
            const demoEvtSnap = await getDocs(qDemoEvts);
            for (const ed of demoEvtSnap.docs) {
              await deleteDoc(
                doc(db, 'users', uid, 'organizations', data.id, 'events', ed.id)
              );
            }
          } catch {
            // Ignore cleanup error
          }
          await deleteDoc(doc(db, 'users', uid, 'organizations', data.id));
          continue;
        }
        try {
          loadedOrgs.push(JSON.parse(data.configPayload) as OrganizationProfile);
        } catch {
          loadedOrgs.push({
            id: data.id,
            ownerUid: data.ownerUid,
            name: data.name,
            shortName: data.shortName,
            nameDhivehi: data.nameDhivehi,
            address: data.address,
            phone: data.phone,
            email: data.email,
            website: data.website,
            mainLogo1Id: data.mainLogo1Id,
            mainLogo2Id: data.mainLogo2Id,
            headerPosition: 'top-right',
            logo1Scale: 100,
            logo2Scale: 95,
            headerPaddingX: 56,
            headerPaddingY: 42,
            headerScrimOpacity: 45,
            preferences: {
              defaultFormat: 'image/jpeg',
              defaultQuality: 0.95,
              autoApplyHeader: true,
            },
            updatedAt: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, orgsPath);
    }

    // 4. Load User's Own Events under each Organization
    let loadedEvents: EventConfiguration[] = [];
    for (const org of loadedOrgs) {
      const eventsPath = `users/${uid}/organizations/${org.id}/events`;
      try {
        const qEvts = query(
          collection(db, 'users', uid, 'organizations', org.id, 'events'),
          where('ownerUid', '==', uid),
          where('organizationId', '==', org.id)
        );
        const snap = await getDocs(qEvts);
        for (const d of snap.docs) {
          const data = d.data();
          if (LEGACY_DEMO_EVENT_IDS.has(data.id)) {
            await deleteDoc(doc(db, 'users', uid, 'organizations', org.id, 'events', data.id));
            continue;
          }
          loadedEvents.push(JSON.parse(data.configPayload) as EventConfiguration);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, eventsPath);
      }
    }

    // 5. Load User's Own Saved Templates / Setups
    const templatesPath = `users/${uid}/templates`;
    let loadedTemplates: SavedTemplatePreset[] = [];
    try {
      const qTpls = query(collection(db, 'users', uid, 'templates'), where('ownerUid', '==', uid));
      const snap = await getDocs(qTpls);
      for (const d of snap.docs) {
        const data = d.data();
        if (LEGACY_DEMO_TEMPLATE_IDS.has(data.id)) {
          await deleteDoc(doc(db, 'users', uid, 'templates', data.id));
          continue;
        }
        loadedTemplates.push(JSON.parse(data.configPayload) as SavedTemplatePreset);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, templatesPath);
    }

    // Safeguard: Check if local cache has items that cloud didn't have yet (prevent accidental reset of local data)
    const localOrgs = this.getOrganizations(uid);
    if (loadedOrgs.length === 0 && localOrgs.length > 0) {
      loadedOrgs = localOrgs;
      for (const org of localOrgs) {
        this.saveOrganizationToCloud(uid, org).catch(() => {});
      }
    }

    const localEvents = this.getEvents(uid);
    if (loadedEvents.length === 0 && localEvents.length > 0) {
      loadedEvents = localEvents;
      for (const evt of localEvents) {
        this.saveEventToCloud(uid, evt).catch(() => {});
      }
    }

    const localLogos = this.getLogos(uid);
    if (loadedLogos.length === 0 && localLogos.length > 0) {
      loadedLogos = localLogos;
      for (const l of localLogos) {
        this.saveLogoToCloud(uid, l).catch(() => {});
      }
    }

    const localTemplates = this.getTemplates(uid);
    if (loadedTemplates.length === 0 && localTemplates.length > 0) {
      loadedTemplates = localTemplates;
      for (const t of localTemplates) {
        this.saveTemplateToCloud(uid, t).catch(() => {});
      }
    }

    // Cache locally scoped to UID
    this.saveOrganizations(loadedOrgs, uid);
    this.saveEvents(loadedEvents, uid);
    this.saveLogos(loadedLogos, uid);
    this.saveFonts(loadedFonts, uid);
    this.saveTemplates(loadedTemplates, uid);

    return {
      organizations: loadedOrgs,
      events: loadedEvents,
      logos: loadedLogos,
      fonts: loadedFonts,
      templates: loadedTemplates,
    };
  },

  /**
   * ============================================================================
   * DEVELOPER PROFILE PERSISTENCE (CONFIGURED BY SUPER ADMIN)
   * ============================================================================
   */
  getDeveloperProfile(): DeveloperProfileConfig {
    const cached = safeLoad<DeveloperProfileConfig | null>(STORAGE_KEYS.DEVELOPER_PROFILE, null);
    if (!cached) {
      return DEFAULT_DEVELOPER_PROFILE;
    }
    return {
      photoUrl: cached.photoUrl || DEFAULT_DEVELOPER_PROFILE.photoUrl,
      photoTransparency:
        typeof cached.photoTransparency === 'number' ? cached.photoTransparency : 30,
      developerName: cached.developerName || DEFAULT_DEVELOPER_PROFILE.developerName,
      designation: cached.designation || DEFAULT_DEVELOPER_PROFILE.designation,
      bio: cached.bio ?? DEFAULT_DEVELOPER_PROFILE.bio,
      updatedAt: cached.updatedAt || new Date().toISOString(),
    };
  },

  async saveDeveloperProfile(profile: DeveloperProfileConfig): Promise<boolean> {
    safeSave(STORAGE_KEYS.DEVELOPER_PROFILE, profile);
    return true;
  },

  /**
   * ============================================================================
   * SUPER ADMIN & USER SIGN-UP APPROVAL WORKFLOW
   * ============================================================================
   */
  getRegisteredUsers(): RegisteredUserRecord[] {
    const rawList = safeLoad<RegisteredUserRecord[]>(STORAGE_KEYS.REGISTERED_USERS, []);
    // Remove any fake, seed, or demo user records
    const cleaned = rawList.filter((u) => {
      if (!u || !u.uid) return false;
      if (u.uid.startsWith('seed-')) return false;
      if (u.uid === 'seed-usr-ameen-isse') return false;
      const email = (u.email || '').toLowerCase().trim();
      if (
        email === 'ahmed.rashid.mv@gmail.com' ||
        email === 'fathimath.photov@gmail.com' ||
        email === 'ismail.mv.events@gmail.com'
      ) {
        return false;
      }
      return true;
    });

    if (cleaned.length !== rawList.length) {
      safeSave(STORAGE_KEYS.REGISTERED_USERS, cleaned);
    }
    return cleaned;
  },

  saveRegisteredUsers(users: RegisteredUserRecord[]): boolean {
    return safeSave(STORAGE_KEYS.REGISTERED_USERS, users);
  },

  async registerOrCheckUser(fbUser: {
    uid: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  }): Promise<{
    role: UserRole;
    status: UserApprovalStatus;
    record: RegisteredUserRecord;
  }> {
    const isSuper = isSuperAdminEmail(fbUser.email);
    const users = this.getRegisteredUsers();
    const existingIndex = users.findIndex(
      (u) =>
        u.uid === fbUser.uid ||
        (fbUser.email && u.email.toLowerCase() === fbUser.email.toLowerCase())
    );

    let record: RegisteredUserRecord;

    if (existingIndex >= 0) {
      const existing = users[existingIndex];
      record = {
        ...existing,
        uid: fbUser.uid,
        displayName: fbUser.displayName || existing.displayName,
        email: fbUser.email || existing.email,
        photoURL: fbUser.photoURL || existing.photoURL,
        role: isSuper ? 'super_admin' : existing.role || 'user',
        status: isSuper ? 'approved' : existing.status || 'pending',
        lastSignInAt: new Date().toISOString(),
      };
      users[existingIndex] = record;
    } else {
      record = {
        uid: fbUser.uid,
        displayName: fbUser.displayName || 'Studio Member',
        email: fbUser.email || '',
        photoURL: fbUser.photoURL || '',
        role: isSuper ? 'super_admin' : 'user',
        status: isSuper ? 'approved' : 'pending',
        requestedAt: new Date().toISOString(),
        approvedAt: isSuper ? new Date().toISOString() : undefined,
        lastSignInAt: new Date().toISOString(),
        organizationCount: 0,
        eventCount: 0,
      };
      users.unshift(record);
    }

    this.saveRegisteredUsers(users);

    return {
      role: record.role,
      status: record.status,
      record,
    };
  },

  async updateUserStatus(
    uid: string,
    nextStatus: UserApprovalStatus
  ): Promise<RegisteredUserRecord[]> {
    const users = this.getRegisteredUsers();
    const idx = users.findIndex((u) => u.uid === uid);
    if (idx >= 0) {
      users[idx] = {
        ...users[idx],
        status: nextStatus,
        approvedAt: nextStatus === 'approved' ? new Date().toISOString() : users[idx].approvedAt,
        suspendedAt:
          nextStatus === 'suspended' ? new Date().toISOString() : users[idx].suspendedAt,
      };
      this.saveRegisteredUsers(users);
    }
    return users;
  },

  async deleteUser(uid: string): Promise<RegisteredUserRecord[]> {
    const users = this.getRegisteredUsers().filter((u) => u.uid !== uid);
    this.saveRegisteredUsers(users);

    // Clean up local storage scoped keys for this user
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(`${STORAGE_KEYS.ORGANIZATIONS}_${uid}`);
        localStorage.removeItem(`${STORAGE_KEYS.EVENTS}_${uid}`);
        localStorage.removeItem(`${STORAGE_KEYS.ACTIVE_EVENT_ID}_${uid}`);
        localStorage.removeItem(`${STORAGE_KEYS.LOGOS}_${uid}`);
        localStorage.removeItem(`${STORAGE_KEYS.FONTS}_${uid}`);
        localStorage.removeItem(`${STORAGE_KEYS.TEMPLATES}_${uid}`);
      }
    } catch (e) {
      console.warn('Failed to clean local storage for user:', uid, e);
    }

    // Clean up Firestore record if initialized
    try {
      if (db) {
        const docRef = doc(db, 'registered_users', sanitizeDocId(uid));
        await deleteDoc(docRef).catch(() => {});
      }
    } catch {
      // ignore
    }

    return users;
  },

  async removeUserSignUp(uid: string): Promise<RegisteredUserRecord[]> {
    return this.deleteUser(uid);
  },

  async getAllOrganizationsAcrossUsers(): Promise<OrganizationProfile[]> {
    const users = this.getRegisteredUsers();
    const allOrgs: OrganizationProfile[] = [];
    const seenIds = new Set<string>();

    for (const u of users) {
      const orgs = this.getOrganizations(u.uid);
      for (const o of orgs) {
        if (!seenIds.has(o.id) && !LEGACY_DEMO_ORG_IDS.has(o.id)) {
          seenIds.add(o.id);
          allOrgs.push(o);
        }
      }
    }

    return allOrgs;
  },

  async getAllEventsAcrossUsers(): Promise<EventConfiguration[]> {
    const users = this.getRegisteredUsers();
    const allEvents: EventConfiguration[] = [];
    const seenIds = new Set<string>();

    for (const u of users) {
      const evts = this.getEvents(u.uid);
      for (const e of evts) {
        if (!seenIds.has(e.id) && !LEGACY_DEMO_EVENT_IDS.has(e.id)) {
          seenIds.add(e.id);
          allEvents.push(e);
        }
      }
    }

    return allEvents;
  },
};
