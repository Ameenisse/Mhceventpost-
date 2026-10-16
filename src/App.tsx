import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Award,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cloud,
  FolderKanban,
  LayoutDashboard,
  Loader2,
  LogOut,
  Settings,
  ShieldCheck,
  Sliders,
  User as UserIcon,
  X,
} from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  AuthenticatedUserProfile,
  BatchProcessState,
  BrandingLogoAsset,
  CloudSyncState,
  CustomFontAsset,
  DeveloperProfileConfig,
  EventConfiguration,
  ExportSuccessSummary,
  OrganizationProfile,
  PhotoOrientation,
  SavedTemplatePreset,
  TemporaryPhotoItem,
} from './types/studio';
import { auth } from './services/firebaseClient';
import {
  createBlankEventConfiguration,
  DEFAULT_DEVELOPER_PROFILE,
  isSuperAdminEmail,
  PersistentStorageService,
  SUPER_ADMIN_EMAIL,
} from './services/persistentStorage';
import {
  loadLogoImage,
  probePhotoDimensions,
  renderPhotoItemToBlob,
} from './services/canvasRenderer';
import {
  exportPhotosAsZipArchive,
  exportPhotosToDeviceFolder,
  isDirectoryPickerSupported,
} from './services/exportService';
import { GoogleLoginScreen } from './components/GoogleLoginScreen';
import { StudioDashboardView } from './components/StudioDashboardView';
import { OrganizationManagePage } from './components/OrganizationManagePage';
import { EventManagePage } from './components/EventManagePage';
import { SponsorsManagePage } from './components/SponsorsManagePage';
import { SettingsPage } from './components/SettingsPage';
import { SuperAdminPanel } from './components/SuperAdminPanel';
import { PendingApprovalScreen } from './components/PendingApprovalScreen';
import { SuspendedScreen } from './components/SuspendedScreen';
import { StudioModals } from './components/StudioModals';
import { ExportVerificationModals } from './components/ExportVerificationModals';
import { PWAInstallButton } from './components/PWAInstallButton';
import { useOnlineStatus } from './hooks/useOnlineStatus';

export type WorkspaceModulePage =
  | 'dashboard'
  | 'organizations'
  | 'events'
  | 'sponsors'
  | 'settings'
  | 'super_admin';

export default function App() {
  const isOnline = useOnlineStatus();

  // ==========================================================================
  // 0. FIREBASE AUTHENTICATION & USER SESSION STATE
  // ==========================================================================
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthenticatedUserProfile | null>(null);
  const isSuper = isSuperAdminEmail(currentUser?.email);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceModulePage>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // Non-super admins cannot access Settings & Fonts or Super Admin panel
  useEffect(() => {
    if (!isSuper && (workspaceMode === 'settings' || workspaceMode === 'super_admin')) {
      setWorkspaceMode('dashboard');
    }
  }, [isSuper, workspaceMode]);
  const [selectedOrgIdFilter, setSelectedOrgIdFilter] = useState<string>('');
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [developerProfile, setDeveloperProfile] = useState<DeveloperProfileConfig>(() =>
    PersistentStorageService.getDeveloperProfile()
  );
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(() => {
    return PersistentStorageService.getRegisteredUsers().filter((u) => u.status === 'pending').length;
  });

  // Re-check approval status if non-super-admin user is waiting
  const recheckApprovalStatus = useCallback(async () => {
    if (!currentUser) return;
    const users = PersistentStorageService.getRegisteredUsers();
    const matched = users.find(
      (u) =>
        u.uid === currentUser.uid ||
        (currentUser.email && u.email.toLowerCase() === currentUser.email.toLowerCase())
    );
    if (matched && matched.status !== currentUser.status) {
      setCurrentUser((prev) =>
        prev ? { ...prev, status: matched.status, role: matched.role } : null
      );
    }
    setPendingRequestsCount(users.filter((u) => u.status === 'pending').length);
  }, [currentUser]);

  // Keep pending count updated
  useEffect(() => {
    const interval = setInterval(() => {
      const users = PersistentStorageService.getRegisteredUsers();
      setPendingRequestsCount(users.filter((u) => u.status === 'pending').length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Preload Dhivehi fonts so HTML5 Canvas and UI instantly render with 100% crispness
  useEffect(() => {
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.load("24px 'Mv_Eamaan_XP'").catch(() => {});
      document.fonts.load("24px 'Faruma'").catch(() => {});
    }
  }, []);

  // ==========================================================================
  // 1. PERSISTENT CLOUD & UID-SCOPED STATE
  // ==========================================================================
  const [organizations, setOrganizations] = useState<OrganizationProfile[]>([]);
  const [events, setEvents] = useState<EventConfiguration[]>([]);
  const [activeEventId, setActiveEventId] = useState<string>('');
  const [logos, setLogos] = useState<BrandingLogoAsset[]>([]);
  const [fonts, setFonts] = useState<CustomFontAsset[]>(() =>
    PersistentStorageService.getFonts()
  );
  const [templates, setTemplates] = useState<SavedTemplatePreset[]>([]);
  const [saveStatusText, setSaveStatusText] = useState<string>('Synced to Cloud');
  const [cloudSyncState, setCloudSyncState] = useState<CloudSyncState>({
    status: 'synced',
    lastSyncedAt: new Date().toISOString(),
  });

  // Active organization for the signed-in user
  const primaryOrg: OrganizationProfile | undefined =
    organizations.find((o) => o.id === selectedOrgIdFilter) ||
    organizations.find(
      (o) => o.id === events.find((e) => e.id === activeEventId)?.primaryOrgId
    ) ||
    organizations[0];

  // Events strictly belonging to the active organization
  const orgScopedEvents: EventConfiguration[] = primaryOrg
    ? events.filter((e) => e.primaryOrgId === primaryOrg.id)
    : [];

  // Active event scoped to the active organization (or blank draft if user has no events yet)
  const activeEvent: EventConfiguration =
    orgScopedEvents.find((e) => e.id === activeEventId) ||
    orgScopedEvents[0] ||
    events.find((e) => e.id === activeEventId) ||
    events[0] ||
    createBlankEventConfiguration(primaryOrg, currentUser?.uid);

  // Logos strictly belonging to the active organization or its events
  const orgScopedLogos: BrandingLogoAsset[] = primaryOrg
    ? logos.filter(
        (l) =>
          l.organizationId === primaryOrg.id ||
          l.id === primaryOrg.mainLogo1Id ||
          l.id === primaryOrg.mainLogo2Id ||
          orgScopedEvents.some(
            (e) =>
              e.id === l.eventId ||
              e.sponsorsConfig.selectedSponsorIds.includes(l.id) ||
              e.sponsorsConfig.selectedParticipantIds.includes(l.id)
          )
      )
    : [];

  // Setups/templates strictly belonging to the active organization
  const orgScopedTemplates: SavedTemplatePreset[] = primaryOrg
    ? templates.filter((t) => t.organizationId === primaryOrg.id)
    : [];

  // ==========================================================================
  // 2. TEMPORARY VOLATILE PHOTO STATE (RAM ONLY — NEVER PERSISTED)
  // ==========================================================================
  const [temporaryPhotos, setTemporaryPhotos] = useState<TemporaryPhotoItem[]>([]);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [orientationFilter, setOrientationFilter] = useState<'all' | PhotoOrientation>('all');

  const [activeModal, setActiveModal] = useState<
    'events' | 'organizations' | 'assets' | 'templates' | null
  >(null);

  // Batch Generation & Export Progress
  const [batchState, setBatchState] = useState<BatchProcessState>({
    isProcessing: false,
    isExporting: false,
    currentStepLabel: '',
    completedCount: 0,
    totalCount: 0,
    failedFiles: [],
    canCancel: false,
  });
  const abortControllerRef = useRef<AbortController | null>(null);

  // Verification & Recovery Modals
  const [exportSuccessSummary, setExportSuccessSummary] =
    useState<ExportSuccessSummary | null>(null);
  const [pendingZipConfirmation, setPendingZipConfirmation] = useState<{
    zipFilename: string;
    exportedCount: number;
    eventName: string;
  } | null>(null);
  const [failedExportState, setFailedExportState] = useState<{
    exportedCount: number;
    totalCount: number;
    failedFiles: { id: string; filename: string; reason: string }[];
    lastExportMode: 'folder' | 'zip';
  } | null>(null);
  const [showManualClearConfirm, setShowManualClearConfirm] = useState(false);

  // ==========================================================================
  // 3. AUTOMATIC & MANUAL TEMPORARY PHOTO MEMORY CLEANUP
  // ==========================================================================
  const clearAllTemporaryPhotosFromMemory = useCallback(() => {
    setTemporaryPhotos((prev) => {
      for (const item of prev) {
        if (item.previewObjectUrl) {
          URL.revokeObjectURL(item.previewObjectUrl);
        }
        if (item.generatedObjectUrl) {
          URL.revokeObjectURL(item.generatedObjectUrl);
        }
        delete item.generatedBlob;
      }
      return [];
    });
    setActivePhotoId(null);
    setBatchState({
      isProcessing: false,
      isExporting: false,
      currentStepLabel: '',
      completedCount: 0,
      totalCount: 0,
      failedFiles: [],
      canCancel: false,
    });
  }, []);

  // ==========================================================================
  // 4. FIREBASE AUTHENTICATION LISTENER & CLOUD WORKSPACE HYDRATION
  // ==========================================================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setCurrentUser(null);
        setOrganizations([]);
        setEvents([]);
        setActiveEventId('');
        setSelectedOrgIdFilter('');
        setLogos([]);
        setTemplates([]);
        setAuthReady(true);
        return;
      }

      const regResult = await PersistentStorageService.registerOrCheckUser({
        uid: fbUser.uid,
        displayName: fbUser.displayName,
        email: fbUser.email,
        photoURL: fbUser.photoURL,
      });

      const profile: AuthenticatedUserProfile = {
        uid: fbUser.uid,
        displayName: fbUser.displayName || 'Studio Photographer',
        email: fbUser.email || '',
        photoURL: fbUser.photoURL || '',
        role: regResult.role,
        status: regResult.status,
        createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
        lastSignInAt: fbUser.metadata.lastSignInTime || new Date().toISOString(),
      };
      setCurrentUser(profile);
      setPendingRequestsCount(
        PersistentStorageService.getRegisteredUsers().filter((u) => u.status === 'pending').length
      );

      // Immediately hydrate UID-scoped local cache while Firestore loads
      const cachedOrgs = PersistentStorageService.getOrganizations(fbUser.uid);
      const cachedEvents = PersistentStorageService.getEvents(fbUser.uid);
      const cachedActiveEventId = PersistentStorageService.getActiveEventId(fbUser.uid);
      setOrganizations(cachedOrgs);
      setEvents(cachedEvents);
      setActiveEventId(cachedActiveEventId);
      setSelectedOrgIdFilter(cachedOrgs[0]?.id || '');
      setLogos(PersistentStorageService.getLogos(fbUser.uid));
      setFonts(PersistentStorageService.getFonts(fbUser.uid));
      setTemplates(PersistentStorageService.getTemplates(fbUser.uid));
      setAuthReady(true);

      // Load user-owned records from Cloud Firestore
      setCloudSyncState({ status: 'syncing' });
      setSaveStatusText('Loading Cloud Workspace...');
      try {
        const cloudData = await PersistentStorageService.loadUserWorkspaceFromCloud({
          uid: fbUser.uid,
          displayName: fbUser.displayName,
          email: fbUser.email,
          photoURL: fbUser.photoURL,
        });
        setOrganizations(cloudData.organizations);
        setEvents(cloudData.events);
        setLogos(cloudData.logos);
        setFonts(cloudData.fonts);
        setTemplates(cloudData.templates);
        const savedActiveId = PersistentStorageService.getActiveEventId(fbUser.uid);
        const matchedEvent =
          cloudData.events.find((e) => e.id === savedActiveId) || cloudData.events[0];
        if (matchedEvent) {
          setActiveEventId(matchedEvent.id);
          setSelectedOrgIdFilter(matchedEvent.primaryOrgId || cloudData.organizations[0]?.id || '');
        } else {
          setActiveEventId('');
          setSelectedOrgIdFilter(cloudData.organizations[0]?.id || '');
        }
        setCloudSyncState({
          status: 'synced',
          lastSyncedAt: new Date().toISOString(),
        });
        setSaveStatusText('Synced to Cloud');
      } catch (err: any) {
        console.warn('Firestore cloud load notice:', err);
        setCloudSyncState({
          status: 'error',
          errorMessage: 'Using local cache',
        });
        setSaveStatusText('Saved Locally');
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = useCallback(async () => {
    setShowAccountMenu(false);
    setShowUserProfileModal(false);
    // Clear any temporary imported photographs and release object URLs
    clearAllTemporaryPhotosFromMemory();
    setOrganizations([]);
    setEvents([]);
    setActiveEventId('');
    setSelectedOrgIdFilter('');
    setLogos([]);
    setTemplates([]);
    await signOut(auth);
  }, [clearAllTemporaryPhotosFromMemory]);

  // ==========================================================================
  // 5. PAGE RELOAD / NAVIGATION WARNING FOR UNEXPORTED TEMPORARY PHOTOS
  // ==========================================================================
  useEffect(() => {
    const hasUnexportedPhotos = temporaryPhotos.some((p) => p.status !== 'exported');
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnexportedPhotos) {
        e.preventDefault();
        e.returnValue =
          'You have temporary imported photographs that have not been exported yet. Reloading will clear temporary photos from memory.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [temporaryPhotos]);

  // Load any custom font dataURLs into document.fonts on boot
  useEffect(() => {
    fonts.forEach(async (f) => {
      if (f.dataUrl) {
        try {
          const cleanFamily = f.family.split(',')[0].replace(/['"]/g, '').trim();
          const face = new FontFace(cleanFamily, `url(${f.dataUrl})`);
          const loaded = await face.load();
          document.fonts.add(loaded);
        } catch {
          // Ignore if already loaded
        }
      }
    });
  }, [fonts]);

  // ==========================================================================
  // 6. PERSISTENT CLOUD + LOCAL CONFIGURATION UPDATERS
  // ==========================================================================
  const handleSaveEvents = useCallback(
    (nextEvents: EventConfiguration[], nextActiveId?: string) => {
      const uid = currentUser?.uid;
      const prevEvents = events;
      setEvents(nextEvents);
      PersistentStorageService.saveEvents(nextEvents, uid);
      if (nextActiveId) {
        setActiveEventId(nextActiveId);
        PersistentStorageService.saveActiveEventId(nextActiveId, uid);
      }
      setSaveStatusText('Syncing Event...');
      setCloudSyncState({ status: 'syncing' });

      if (uid) {
        (async () => {
          try {
            // Detect deleted events
            const nextIds = new Set(nextEvents.map((e) => e.id));
            for (const oldEvt of prevEvents) {
              if (!nextIds.has(oldEvt.id)) {
                await PersistentStorageService.deleteEventFromCloud(
                  uid,
                  oldEvt.primaryOrgId,
                  oldEvt.id
                );
              }
            }
            // Save updated/new events
            for (const evt of nextEvents) {
              await PersistentStorageService.saveEventToCloud(uid, evt);
            }
            setCloudSyncState({ status: 'synced', lastSyncedAt: new Date().toISOString() });
            setSaveStatusText('Synced to Cloud');
          } catch {
            setCloudSyncState({ status: 'error' });
            setSaveStatusText('Saved Locally');
          }
        })();
      } else {
        setSaveStatusText('Event Design Saved');
      }
    },
    [currentUser?.uid, events]
  );

  const cloudDebounceRef = useRef<number | null>(null);

  const handleUpdateActiveEvent = useCallback(
    (updater: (prev: EventConfiguration) => EventConfiguration) => {
      const uid = currentUser?.uid;
      setSaveStatusText('Saving Event Design...');
      setCloudSyncState({ status: 'syncing' });

      setEvents((prevList) => {
        let updatedEvent: EventConfiguration | null = null;
        const nextList = prevList.map((evt) => {
          if (evt.id === activeEvent.id) {
            updatedEvent = updater(evt);
            return updatedEvent;
          }
          return evt;
        });
        PersistentStorageService.saveEvents(nextList, uid);

        if (uid && updatedEvent) {
          const snapshotToSync = updatedEvent;
          if (cloudDebounceRef.current) {
            window.clearTimeout(cloudDebounceRef.current);
          }
          cloudDebounceRef.current = window.setTimeout(async () => {
            try {
              await PersistentStorageService.saveEventToCloud(uid, snapshotToSync);
              setCloudSyncState({ status: 'synced', lastSyncedAt: new Date().toISOString() });
              setSaveStatusText('Synced to Cloud');
            } catch {
              setCloudSyncState({ status: 'error' });
              setSaveStatusText('Saved Locally');
            }
          }, 450);
        } else {
          setTimeout(() => setSaveStatusText('All Event Settings Saved'), 180);
        }

        return nextList;
      });
    },
    [activeEvent?.id, currentUser?.uid]
  );

  const handleSelectEvent = useCallback(
    (eventId: string) => {
      const uid = currentUser?.uid;
      setActiveEventId(eventId);
      PersistentStorageService.saveActiveEventId(eventId, uid);
      setSaveStatusText('Restored Saved Event Branding');
    },
    [currentUser?.uid]
  );

  const handleDuplicateEvent = useCallback(
    (evt: EventConfiguration) => {
      const copy: EventConfiguration = {
        ...JSON.parse(JSON.stringify(evt)),
        id: `evt-${Date.now()}`,
        title: `${evt.title} (Copy)`,
        updatedAt: new Date().toISOString(),
      };
      handleSaveEvents([copy, ...events], copy.id);
    },
    [events, handleSaveEvents]
  );

  const handleDeleteEvent = useCallback(
    (eventId: string) => {
      const remaining = events.filter((e) => e.id !== eventId);
      const nextActive =
        activeEvent?.id === eventId ? remaining[0]?.id || '' : activeEvent?.id || '';
      handleSaveEvents(remaining, nextActive);
    },
    [events, activeEvent?.id, handleSaveEvents]
  );

  const handleSaveOrganizations = useCallback(
    (nextOrgs: OrganizationProfile[]) => {
      const uid = currentUser?.uid;
      const prevOrgs = organizations;
      setOrganizations(nextOrgs);
      PersistentStorageService.saveOrganizations(nextOrgs, uid);
      setSaveStatusText('Syncing Organizations...');
      setCloudSyncState({ status: 'syncing' });

      if (uid) {
        (async () => {
          try {
            const nextIds = new Set(nextOrgs.map((o) => o.id));
            for (const oldOrg of prevOrgs) {
              if (!nextIds.has(oldOrg.id)) {
                await PersistentStorageService.deleteOrganizationFromCloud(uid, oldOrg.id);
              }
            }
            for (const org of nextOrgs) {
              await PersistentStorageService.saveOrganizationToCloud(uid, org);
            }
            setCloudSyncState({ status: 'synced', lastSyncedAt: new Date().toISOString() });
            setSaveStatusText('Synced to Cloud');
          } catch {
            setCloudSyncState({ status: 'error' });
            setSaveStatusText('Organizations Saved');
          }
        })();
      } else {
        setSaveStatusText('Organizations Saved');
      }
    },
    [currentUser?.uid, organizations]
  );

  const handleSaveLogos = useCallback(
    (nextLogos: BrandingLogoAsset[]) => {
      const uid = currentUser?.uid;
      const prevLogos = logos;
      setLogos(nextLogos);
      PersistentStorageService.saveLogos(nextLogos, uid);
      setSaveStatusText('Syncing Logo Library...');
      setCloudSyncState({ status: 'syncing' });

      if (uid) {
        (async () => {
          try {
            const nextIds = new Set(nextLogos.map((l) => l.id));
            for (const oldLogo of prevLogos) {
              if (!nextIds.has(oldLogo.id)) {
                await PersistentStorageService.deleteLogoFromCloud(uid, oldLogo.id);
              }
            }
            for (const logo of nextLogos) {
              await PersistentStorageService.saveLogoToCloud(uid, logo);
            }
            setCloudSyncState({ status: 'synced', lastSyncedAt: new Date().toISOString() });
            setSaveStatusText('Synced to Cloud');
          } catch {
            setCloudSyncState({ status: 'error' });
            setSaveStatusText('Logo Library Saved');
          }
        })();
      } else {
        setSaveStatusText('Logo Library Saved');
      }
    },
    [currentUser?.uid, logos]
  );

  const handleSaveFonts = useCallback(
    (nextFonts: CustomFontAsset[]) => {
      const uid = currentUser?.uid;
      setFonts(nextFonts);
      PersistentStorageService.saveFonts(nextFonts, uid);
      setSaveStatusText('Syncing Custom Fonts...');
      setCloudSyncState({ status: 'syncing' });

      if (uid) {
        (async () => {
          try {
            for (const font of nextFonts) {
              await PersistentStorageService.saveFontToCloud(uid, font);
            }
            setCloudSyncState({ status: 'synced', lastSyncedAt: new Date().toISOString() });
            setSaveStatusText('Synced to Cloud');
          } catch {
            setCloudSyncState({ status: 'error' });
            setSaveStatusText('Custom Fonts Saved');
          }
        })();
      } else {
        setSaveStatusText('Custom Fonts Saved');
      }
    },
    [currentUser?.uid]
  );

  const handleSaveTemplates = useCallback(
    (nextTemplates: SavedTemplatePreset[]) => {
      const uid = currentUser?.uid;
      const prevTemplates = templates;
      setTemplates(nextTemplates);
      PersistentStorageService.saveTemplates(nextTemplates, uid);
      setSaveStatusText('Syncing Templates...');
      setCloudSyncState({ status: 'syncing' });

      if (uid) {
        (async () => {
          try {
            const nextIds = new Set(nextTemplates.map((t) => t.id));
            for (const oldTpl of prevTemplates) {
              if (!nextIds.has(oldTpl.id)) {
                await PersistentStorageService.deleteTemplateFromCloud(uid, oldTpl.id);
              }
            }
            for (const tpl of nextTemplates) {
              await PersistentStorageService.saveTemplateToCloud(uid, tpl);
            }
            setCloudSyncState({ status: 'synced', lastSyncedAt: new Date().toISOString() });
            setSaveStatusText('Synced to Cloud');
          } catch {
            setCloudSyncState({ status: 'error' });
            setSaveStatusText('Template Presets Saved');
          }
        })();
      } else {
        setSaveStatusText('Template Presets Saved');
      }
    },
    [currentUser?.uid, templates]
  );

  // ==========================================================================
  // 7. TEMPORARY BULK PHOTO IMPORT HANDLERS
  // ==========================================================================
  const handleImportFiles = useCallback(async (fileList: FileList | File[]) => {
    const rawArray = Array.from(fileList).filter((f) =>
      f.type ? f.type.startsWith('image/') : /\.(jpe?g|png|webp|bmp|gif)$/i.test(f.name)
    );
    if (rawArray.length === 0) return;

    const importedItems: TemporaryPhotoItem[] = [];
    for (let i = 0; i < rawArray.length; i++) {
      const file = rawArray[i];
      const previewObjectUrl = URL.createObjectURL(file);
      const dims = await probePhotoDimensions(file, previewObjectUrl);

      importedItems.push({
        id: `temp-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        filename: file.name,
        fileSize: file.size,
        lastModified: file.lastModified,
        previewObjectUrl,
        width: dims.width,
        height: dims.height,
        orientation: dims.orientation,
        selected: true,
        status: 'imported',
      });
    }

    setTemporaryPhotos((prev) => [...prev, ...importedItems]);
    setActivePhotoId((prevId) => prevId ?? importedItems[0]?.id ?? null);
  }, []);

  const handleRemoveSinglePhoto = useCallback((photoId: string) => {
    setTemporaryPhotos((prev) => {
      const target = prev.find((p) => p.id === photoId);
      if (target) {
        if (target.previewObjectUrl) URL.revokeObjectURL(target.previewObjectUrl);
        if (target.generatedObjectUrl) URL.revokeObjectURL(target.generatedObjectUrl);
        delete target.generatedBlob;
      }
      const next = prev.filter((p) => p.id !== photoId);
      setActivePhotoId((currActive) =>
        currActive === photoId ? next[0]?.id ?? null : currActive
      );
      return next;
    });
  }, []);

  const handleTogglePhotoSelection = useCallback((photoId: string) => {
    setTemporaryPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, selected: !p.selected } : p))
    );
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    setTemporaryPhotos((prev) => prev.map((p) => ({ ...p, selected })));
  }, []);

  // ==========================================================================
  // 8. BATCH GENERATION ENGINE
  // ==========================================================================
  const runBatchGeneration = useCallback(
    async (onlySelected: boolean) => {
      const targetPhotos = onlySelected
        ? temporaryPhotos.filter((p) => p.selected)
        : temporaryPhotos;

      if (targetPhotos.length === 0) return;

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setBatchState({
        isProcessing: true,
        isExporting: false,
        currentStepLabel: '1/14 Validating imported photos & loading event branding...',
        completedCount: 0,
        totalCount: targetPhotos.length,
        failedFiles: [],
        canCancel: true,
      });

      try {
        setBatchState((s) => ({
          ...s,
          currentStepLabel: 'Loading organization, sponsor & participant logos...',
        }));
        await Promise.all(logos.map((l) => loadLogoImage(l)));

        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
        }

        const concurrency = Math.max(
          1,
          Math.min(4, activeEvent.exportConfig.batchConcurrency || 3)
        );
        let completed = 0;
        const failed: { id: string; filename: string; reason: string }[] = [];

        for (let i = 0; i < targetPhotos.length; i += concurrency) {
          if (controller.signal.aborted) {
            throw new Error('Batch generation cancelled.');
          }

          const chunk = targetPhotos.slice(i, i + concurrency);
          setBatchState((s) => ({
            ...s,
            currentStepLabel: `Rendering branded photos (${completed + 1}–${Math.min(
              targetPhotos.length,
              completed + chunk.length
            )} of ${targetPhotos.length})...`,
          }));

          await Promise.all(
            chunk.map(async (photo) => {
              if (controller.signal.aborted) return;

              setTemporaryPhotos((prev) =>
                prev.map((p) => (p.id === photo.id ? { ...p, status: 'processing' } : p))
              );

              try {
                const blob = await renderPhotoItemToBlob(
                  photo,
                  activeEvent,
                  logos,
                  primaryOrg
                );
                completed++;
                setTemporaryPhotos((prev) =>
                  prev.map((p) =>
                    p.id === photo.id
                      ? {
                          ...p,
                          status: 'generated',
                          generatedBlob: blob,
                          errorMessage: undefined,
                        }
                      : p
                  )
                );
                setBatchState((s) => ({
                  ...s,
                  completedCount: completed,
                }));
              } catch (err: any) {
                const reason = err?.message || 'Render error';
                failed.push({ id: photo.id, filename: photo.filename, reason });
                setTemporaryPhotos((prev) =>
                  prev.map((p) =>
                    p.id === photo.id
                      ? { ...p, status: 'failed', errorMessage: reason }
                      : p
                  )
                );
              }
            })
          );
        }

        setBatchState({
          isProcessing: false,
          isExporting: false,
          currentStepLabel: 'Ready for Folder or ZIP Export',
          completedCount: completed,
          totalCount: targetPhotos.length,
          failedFiles: failed,
          canCancel: false,
        });
      } catch (err: any) {
        setBatchState((s) => ({
          ...s,
          isProcessing: false,
          isExporting: false,
          currentStepLabel: err?.message || 'Generation stopped',
          canCancel: false,
        }));
      }
    },
    [temporaryPhotos, logos, activeEvent, primaryOrg]
  );

  // ==========================================================================
  // 9. DIRECT TO FOLDER EXPORT & AUTOMATIC CLEANUP
  // ==========================================================================
  const handleDownloadToFolder = useCallback(
    async (onlyFailedRetry = false) => {
      const photosToExport = onlyFailedRetry
        ? temporaryPhotos.filter((p) => p.status === 'failed')
        : temporaryPhotos.filter((p) => p.selected).length > 0
        ? temporaryPhotos.filter((p) => p.selected)
        : temporaryPhotos;

      if (photosToExport.length === 0) return;

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setBatchState({
        isProcessing: false,
        isExporting: true,
        currentStepLabel: 'Waiting for destination folder selection...',
        completedCount: 0,
        totalCount: photosToExport.length,
        failedFiles: [],
        canCancel: true,
      });

      try {
        const result = await exportPhotosToDeviceFolder(
          photosToExport,
          activeEvent,
          logos,
          {
            signal: controller.signal,
            onStepChange: (label) =>
              setBatchState((s) => ({ ...s, currentStepLabel: label })),
            onProgress: (completed, total) =>
              setBatchState((s) => ({ ...s, completedCount: completed, totalCount: total })),
            onPhotoStatusUpdate: (photoId, status, blob, errorMessage) => {
              setTemporaryPhotos((prev) =>
                prev.map((p) =>
                  p.id === photoId
                    ? {
                        ...p,
                        status,
                        generatedBlob: blob ?? p.generatedBlob,
                        errorMessage,
                      }
                    : p
                )
              );
            },
          },
          primaryOrg
        );

        setBatchState((s) => ({
          ...s,
          isProcessing: false,
          isExporting: false,
          canCancel: false,
        }));

        if (result.allSucceeded && result.summary) {
          setExportSuccessSummary(result.summary);
          clearAllTemporaryPhotosFromMemory();
        } else {
          setFailedExportState({
            exportedCount: result.exportedCount,
            totalCount: photosToExport.length,
            failedFiles: result.failedFiles,
            lastExportMode: 'folder',
          });
        }
      } catch (err: any) {
        setBatchState((s) => ({
          ...s,
          isProcessing: false,
          isExporting: false,
          currentStepLabel: '',
          canCancel: false,
        }));

        if (err?.name === 'AbortError') {
          return;
        }

        setFailedExportState({
          exportedCount: 0,
          totalCount: photosToExport.length,
          failedFiles: photosToExport.map((p) => ({
            id: p.id,
            filename: p.filename,
            reason:
              err?.message ||
              'Direct folder access blocked by browser environment — use Download ZIP or retry',
          })),
          lastExportMode: 'folder',
        });
      }
    },
    [temporaryPhotos, activeEvent, logos, primaryOrg, clearAllTemporaryPhotosFromMemory]
  );

  // ==========================================================================
  // 10. ZIP DOWNLOAD FALLBACK & VERIFICATION FLOW
  // ==========================================================================
  const handleDownloadZip = useCallback(
    async (onlyFailedRetry = false) => {
      const photosToExport = onlyFailedRetry
        ? temporaryPhotos.filter((p) => p.status === 'failed')
        : temporaryPhotos.filter((p) => p.selected).length > 0
        ? temporaryPhotos.filter((p) => p.selected)
        : temporaryPhotos;

      if (photosToExport.length === 0) return;

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setBatchState({
        isProcessing: false,
        isExporting: true,
        currentStepLabel: 'Preparing ZIP archive...',
        completedCount: 0,
        totalCount: photosToExport.length,
        failedFiles: [],
        canCancel: true,
      });

      try {
        const result = await exportPhotosAsZipArchive(
          photosToExport,
          activeEvent,
          logos,
          {
            signal: controller.signal,
            onStepChange: (label) =>
              setBatchState((s) => ({ ...s, currentStepLabel: label })),
            onProgress: (completed, total) =>
              setBatchState((s) => ({ ...s, completedCount: completed, totalCount: total })),
            onPhotoStatusUpdate: (photoId, status, blob, errorMessage) => {
              setTemporaryPhotos((prev) =>
                prev.map((p) =>
                  p.id === photoId
                    ? {
                        ...p,
                        status,
                        generatedBlob: blob ?? p.generatedBlob,
                        errorMessage,
                      }
                    : p
                )
              );
            },
          },
          primaryOrg
        );

        setBatchState((s) => ({
          ...s,
          isProcessing: false,
          isExporting: false,
          canCancel: false,
        }));

        if (!result.allSucceeded) {
          setFailedExportState({
            exportedCount: result.exportedCount,
            totalCount: photosToExport.length,
            failedFiles: result.failedFiles,
            lastExportMode: 'zip',
          });
          return;
        }

        if (result.verifiedByFileSystemStream && result.summary) {
          setExportSuccessSummary(result.summary);
          clearAllTemporaryPhotosFromMemory();
        } else {
          setPendingZipConfirmation({
            zipFilename: result.zipFilename,
            exportedCount: result.exportedCount,
            eventName: activeEvent.title,
          });
        }
      } catch {
        setBatchState((s) => ({
          ...s,
          isProcessing: false,
          isExporting: false,
          currentStepLabel: '',
          canCancel: false,
        }));
      }
    },
    [temporaryPhotos, activeEvent, logos, primaryOrg, clearAllTemporaryPhotosFromMemory]
  );

  // ==========================================================================
  // 11. AUTHENTICATION GUARD (SECTION 3: GOOGLE SIGN-IN REQUIRED)
  // ==========================================================================
  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        <p className="text-xs text-slate-400">Initializing Event Photo Branding Studio...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <GoogleLoginScreen developerProfile={developerProfile} />;
  }

  // Super Admin Check & User Approval Access Guards
  if (!isSuper) {
    if (currentUser.status === 'pending') {
      return (
        <PendingApprovalScreen
          user={currentUser}
          developerProfile={developerProfile}
          onRefreshStatus={recheckApprovalStatus}
          onSignOut={handleSignOut}
        />
      );
    }
    if (currentUser.status === 'suspended') {
      return (
        <SuspendedScreen
          user={currentUser}
          developerProfile={developerProfile}
          onSignOut={handleSignOut}
        />
      );
    }
  }

  const activePhoto =
    temporaryPhotos.find((p) => p.id === activePhotoId) || temporaryPhotos[0] || null;
  const selectedPhotosCount = temporaryPhotos.filter((p) => p.selected).length;
  const generatedPhotosCount = temporaryPhotos.filter(
    (p) => p.status === 'generated' || p.status === 'exported'
  ).length;

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#0B0F17] text-slate-100 select-none">
      {/* ====================================================================
          TOP HEADER BAR (App Name · Org Selector · Quick Module Links · Profile)
         ==================================================================== */}
      <header className="h-14 px-4 lg:px-6 border-b border-slate-800 bg-[#111726] flex items-center justify-between gap-4 shrink-0">
        {/* Zone 1: Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveModal(null);
              setWorkspaceMode('dashboard');
            }}
            className="text-sm lg:text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0 font-display flex items-center gap-2"
          >
            <span className="w-6 h-6 rounded bg-blue-600/25 border border-blue-500/40 text-blue-400 text-xs flex items-center justify-center font-bold">
              EP
            </span>
            <span>Event Photo Branding Studio</span>
          </button>
        </div>

        {/* Zone 2: Super Admin Button (if ameen.isse@gmail.com) & Active Organization Selector */}
        <div className="hidden md:flex items-center gap-3 text-xs font-medium text-slate-300">
          {isSuper && (
            <button
              type="button"
              onClick={() => {
                setActiveModal(null);
                setWorkspaceMode('super_admin');
                setSidebarCollapsed(true);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                workspaceMode === 'super_admin'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-amber-950/40 text-amber-300 border border-amber-500/40 hover:bg-amber-900/60'
              }`}
              title="Open Super Admin Panel"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Super Admin</span>
              {pendingRequestsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950">
                  {pendingRequestsCount}
                </span>
              )}
            </button>
          )}

          <PWAInstallButton variant="header" />
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1">
            <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            {organizations.length === 0 ? (
              <button
                type="button"
                onClick={() => setWorkspaceMode('organizations')}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium"
              >
                + Create Organization
              </button>
            ) : (
              <select
                value={primaryOrg?.id || ''}
                onChange={(e) => {
                  const nextOrgId = e.target.value;
                  setSelectedOrgIdFilter(nextOrgId);
                  const firstOrgEvent = events.find((ev) => ev.primaryOrgId === nextOrgId);
                  if (firstOrgEvent) {
                    handleSelectEvent(firstOrgEvent.id);
                  } else {
                    setActiveEventId('');
                  }
                }}
                className="bg-transparent text-xs text-slate-200 focus:outline-none max-w-[180px] truncate cursor-pointer"
                title="Switch Active Organization"
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id} className="bg-slate-900 text-slate-200">
                    {org.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </header>

      {/* ====================================================================
          MAIN WORKSPACE WITH LEFT SIDEBAR NAVIGATION & MODULE PAGES
         ==================================================================== */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Navigation Sidebar */}
        <aside
          className={`${
            sidebarCollapsed ? 'w-16' : 'w-56'
          } bg-[#111726] border-r border-slate-800 flex flex-col justify-between shrink-0 transition-all duration-200`}
        >
          <div className="p-2.5 space-y-1">
            <div className="flex items-center justify-between px-2 py-1.5">
              {!sidebarCollapsed && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Studio Modules
                </span>
              )}
              <button
                type="button"
                onClick={() => setSidebarCollapsed((c) => !c)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 ml-auto"
                title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </button>
            </div>

            {(
              [
                {
                  id: 'dashboard' as WorkspaceModulePage,
                  label: 'Dashboard',
                  icon: LayoutDashboard,
                  badge: null,
                },
                ...(isSuper
                  ? [
                      {
                        id: 'super_admin' as WorkspaceModulePage,
                        label: 'Super Admin',
                        icon: ShieldCheck,
                        badge: pendingRequestsCount > 0 ? pendingRequestsCount : null,
                      },
                    ]
                  : []),
                {
                  id: 'organizations' as WorkspaceModulePage,
                  label: 'Organization Manage',
                  icon: Building2,
                  badge: organizations.length,
                },
                {
                  id: 'events' as WorkspaceModulePage,
                  label: 'Event Manage',
                  icon: FolderKanban,
                  badge: orgScopedEvents.length,
                },
                {
                  id: 'sponsors' as WorkspaceModulePage,
                  label: 'Sponsors Manage',
                  icon: Award,
                  badge: orgScopedLogos.length,
                },
                ...(isSuper
                  ? [
                      {
                        id: 'settings' as WorkspaceModulePage,
                        label: 'Settings & Fonts',
                        icon: Settings,
                        badge: fonts.length,
                      },
                    ]
                  : []),
              ]
            ).map((item) => {
              const Icon = item.icon;
              const isActive = workspaceMode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setWorkspaceMode(item.id);
                    setSidebarCollapsed(true);
                  }}
                  title={item.label}
                  className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!sidebarCollapsed && item.badge !== null && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                        isActive
                          ? 'bg-blue-700 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sidebar Bottom Controls: PWA Install + Active Workspace + Logout */}
          <div className="mt-auto border-t border-slate-800/80 p-2.5 space-y-2">
            {/* Install App Button */}
            <PWAInstallButton collapsed={sidebarCollapsed} variant="sidebar" />

            {/* Active Workspace Card (only when expanded) */}
            {!sidebarCollapsed && (
              <div className="p-2.5 rounded-xl bg-[#0B0F17] border border-slate-800/90 space-y-1.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Active Workspace
                </div>
                <div className="text-xs font-bold text-white truncate">
                  {primaryOrg?.name || 'No Organization'}
                </div>
                <div
                  className="text-[11px] text-blue-400 font-thaana truncate"
                  dir={activeEvent?.textConfig.direction}
                >
                  {activeEvent?.title || 'No Active Event'}
                </div>
              </div>
            )}

            {/* User Profile & Logout Button on Sidebar */}
            {!sidebarCollapsed ? (
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                <div
                  onClick={() => setShowUserProfileModal(true)}
                  className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition group"
                  title="View Google Account Profile"
                >
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName}
                      className="w-7 h-7 rounded-full object-cover border border-blue-500/40 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-300 text-xs font-bold shrink-0">
                      {currentUser.displayName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-white truncate group-hover:text-blue-300 transition-colors">
                      {currentUser.displayName}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{currentUser.email}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSignOut}
                  title="Log out of your Google account"
                  className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-all shadow-sm"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>Log Out</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowUserProfileModal(true)}
                  title={`Signed in as ${currentUser.displayName}`}
                  className="p-1 rounded-full hover:ring-2 hover:ring-blue-500/50 transition"
                >
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName}
                      className="w-7 h-7 rounded-full object-cover border border-blue-500/40"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-300 text-xs font-bold">
                      {currentUser.displayName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSignOut}
                  title={`Log Out (${currentUser.displayName})`}
                  className="w-full flex items-center justify-center p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-600/20 border border-rose-500/30 transition-all shadow-sm"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {workspaceMode === 'dashboard' && (
            <StudioDashboardView
              user={currentUser}
              organizations={organizations}
              events={events}
              logos={logos}
              templates={templates}
              activeEvent={activeEvent}
              selectedOrgIdFilter={selectedOrgIdFilter}
              onSelectOrgFilter={setSelectedOrgIdFilter}
              onSelectEvent={handleSelectEvent}
              onOpenEditor={(initialTab) => {
                if (initialTab === 'sponsors') {
                  setWorkspaceMode('sponsors');
                } else {
                  setWorkspaceMode('events');
                }
              }}
              onOpenModal={(m) => {
                if (m === 'organizations') setWorkspaceMode('organizations');
                else if (m === 'events') setWorkspaceMode('events');
                else if (m === 'assets') setWorkspaceMode('sponsors');
                else setActiveModal(m);
              }}
              onDuplicateEvent={handleDuplicateEvent}
              onDeleteEvent={handleDeleteEvent}
              photos={temporaryPhotos}
              onImportFiles={handleImportFiles}
              onGenerateAll={() => runBatchGeneration(false)}
              onGenerateSelected={() => runBatchGeneration(true)}
              onExportFolder={() => handleDownloadToFolder(false)}
              onExportZip={() => handleDownloadZip(false)}
              onClearPhotos={() => setShowManualClearConfirm(true)}
              batchState={batchState}
              cloudSyncState={cloudSyncState}
            />
          )}

          {workspaceMode === 'organizations' && (
            <OrganizationManagePage
              organizations={organizations}
              events={events}
              logos={logos}
              fonts={fonts}
              activeOrgId={primaryOrg?.id || ''}
              onSelectOrg={(orgId) => {
                setSelectedOrgIdFilter(orgId);
                const firstEvt = events.find((e) => e.primaryOrgId === orgId);
                if (firstEvt) handleSelectEvent(firstEvt.id);
              }}
              onSaveOrganizations={handleSaveOrganizations}
              onSaveLogos={handleSaveLogos}
              onNavigateToEvents={(orgId) => {
                setSelectedOrgIdFilter(orgId);
                setWorkspaceMode('events');
              }}
            />
          )}

          {workspaceMode === 'events' && (
            <EventManagePage
              organizations={organizations}
              events={events}
              logos={logos}
              fonts={fonts}
              activeOrgId={primaryOrg?.id || ''}
              activeEvent={activeEvent}
              onSelectOrg={(orgId) => setSelectedOrgIdFilter(orgId)}
              onSelectEvent={handleSelectEvent}
              onSaveEvents={handleSaveEvents}
              onSaveLogos={handleSaveLogos}
              onNavigateToOrganizations={() => setWorkspaceMode('organizations')}
              onNavigateToSponsors={() => setWorkspaceMode('sponsors')}
            />
          )}

          {workspaceMode === 'sponsors' && (
            <SponsorsManagePage
              organizations={organizations}
              events={events}
              logos={logos}
              activeOrgId={primaryOrg?.id || ''}
              activeEvent={activeEvent}
              onSelectOrg={(orgId) => setSelectedOrgIdFilter(orgId)}
              onSelectEvent={handleSelectEvent}
              onSaveLogos={handleSaveLogos}
              onUpdateActiveEvent={handleUpdateActiveEvent}
            />
          )}

          {workspaceMode === 'settings' && isSuper && (
            <SettingsPage
              user={currentUser}
              fonts={fonts}
              activeEvent={activeEvent}
              onSaveFonts={handleSaveFonts}
              onUpdateActiveEvent={handleUpdateActiveEvent}
            />
          )}

          {workspaceMode === 'super_admin' && isSuper && (
            <SuperAdminPanel
              currentUserEmail={currentUser.email}
              developerProfile={developerProfile}
              onUpdateDeveloperProfile={setDeveloperProfile}
              onNavigateHome={() => setWorkspaceMode('dashboard')}
            />
          )}
        </div>
      </div>

      {/* ====================================================================
          PERSISTENT MANAGEMENT MODALS (Events, Orgs, Logos/Fonts, Templates)
         ==================================================================== */}
      <StudioModals
        activeModal={activeModal}
        onClose={() => setActiveModal(null)}
        activeOrgId={primaryOrg?.id}
        onSelectOrgFilter={setSelectedOrgIdFilter}
        events={events}
        activeEvent={activeEvent}
        organizations={organizations}
        logos={logos}
        fonts={fonts}
        templates={templates}
        isSuper={isSuper}
        onSelectEvent={handleSelectEvent}
        onSaveEvents={handleSaveEvents}
        onUpdateActiveEvent={handleUpdateActiveEvent}
        onSaveOrganizations={handleSaveOrganizations}
        onSaveLogos={handleSaveLogos}
        onSaveFonts={handleSaveFonts}
        onSaveTemplates={handleSaveTemplates}
      />

      {/* ====================================================================
          USER PROFILE & PREFERENCES MODAL (SECTION 3)
         ==================================================================== */}
      {showUserProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111726] border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <UserIcon className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Google Account & Studio Profile</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUserProfileModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName}
                  className="w-14 h-14 rounded-full object-cover border-2 border-blue-500/50"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-300 text-xl font-bold">
                  {currentUser.displayName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-sm font-bold text-white truncate">
                  {currentUser.displayName}
                </div>
                <div className="text-xs text-slate-400 truncate">{currentUser.email}</div>
                <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Isolated Multi-Tenant Account</span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">Firebase UID:</span>
                <span className="font-mono text-slate-200 truncate max-w-[210px]">
                  {currentUser.uid}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">Account Created:</span>
                <span className="text-slate-200">
                  {new Date(currentUser.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">Last Sign-In:</span>
                <span className="text-slate-200">
                  {new Date(currentUser.lastSignInAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">Saved Organizations:</span>
                <span className="text-white font-semibold">{organizations.length}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">Saved Events:</span>
                <span className="text-white font-semibold">{events.length}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">Temporary RAM Photos:</span>
                <span className="text-amber-300 font-semibold">
                  {temporaryPhotos.length} (Local RAM Only)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleSignOut}
                className="px-4 py-2 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
              <button
                type="button"
                onClick={() => setShowUserProfileModal(false)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          EXPORT VERIFICATION, ZIP CONFIRMATION & AUTO-CLEANUP MODALS
         ==================================================================== */}
      <ExportVerificationModals
        exportSuccessSummary={exportSuccessSummary}
        onDismissExportSuccess={() => setExportSuccessSummary(null)}
        pendingZipConfirmation={pendingZipConfirmation}
        onConfirmZipSavedAndClear={() => {
          if (pendingZipConfirmation) {
            const summary: ExportSuccessSummary = {
              eventName: pendingZipConfirmation.eventName,
              eventDate: activeEvent.date,
              totalExported: pendingZipConfirmation.exportedCount,
              exportFormat: `ZIP (${activeEvent.exportConfig.format
                .replace('image/', '')
                .toUpperCase()})`,
              destinationFolder: pendingZipConfirmation.zipFilename,
              exportMethod: 'zip-browser-link',
              timestamp: new Date().toISOString(),
            };
            setPendingZipConfirmation(null);
            clearAllTemporaryPhotosFromMemory();
            setExportSuccessSummary(summary);
          }
        }}
        onKeepPhotosAfterZip={() => setPendingZipConfirmation(null)}
        failedExportState={failedExportState}
        onRetryFailedExport={() => {
          const mode = failedExportState?.lastExportMode || 'folder';
          setFailedExportState(null);
          if (mode === 'folder') {
            handleDownloadToFolder(true);
          } else {
            handleDownloadZip(true);
          }
        }}
        onDismissFailedExport={() => setFailedExportState(null)}
        showManualClearConfirm={showManualClearConfirm}
        totalPhotosCount={temporaryPhotos.length}
        onConfirmManualClear={() => {
          setShowManualClearConfirm(false);
          clearAllTemporaryPhotosFromMemory();
        }}
        onCancelManualClear={() => setShowManualClearConfirm(false)}
      />

      {/* Offline Toast Banner for PWA */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500/90 backdrop-blur px-3 py-2 text-xs font-medium text-white shadow-xl border border-amber-400/40">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span>Offline Mode — Running with cached data</span>
        </div>
      )}
    </div>
  );
}
