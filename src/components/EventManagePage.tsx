import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Building2,
  Calendar,
  Check,
  Copy,
  Edit3,
  FolderKanban,
  Layers,
  MapPin,
  Monitor,
  Palette,
  Plus,
  Sliders,
  Smartphone,
  Sparkles,
  Tag,
  Trash2,
  Type,
  Upload,
  Languages,
  Loader2,
  Wand2,
  X,
} from 'lucide-react';
import {
  BrandingLogoAsset,
  CustomFontAsset,
  EventConfiguration,
  LogoCategory,
  OrganizationProfile,
} from '../types/studio';
import { createBlankEventConfiguration } from '../services/persistentStorage';
import { hexToRgba, resolveSponsorCategoryLabel } from '../services/canvasRenderer';
import { BackendAIService } from '../services/aiService';
import { optimizeLogoDataUrl } from '../services/indexedDbStore';

interface EventManagePageProps {
  organizations: OrganizationProfile[];
  events: EventConfiguration[];
  logos: BrandingLogoAsset[];
  fonts: CustomFontAsset[];
  activeOrgId: string;
  activeEvent: EventConfiguration;
  onSelectOrg: (orgId: string) => void;
  onSelectEvent: (eventId: string) => void;
  onSaveEvents: (nextEvents: EventConfiguration[], nextActiveId?: string) => void;
  onSaveLogos: (nextLogos: BrandingLogoAsset[]) => void;
  onOpenStudioEditor?: (eventId: string) => void;
  onNavigateToOrganizations: () => void;
  onNavigateToSponsors: () => void;
}

const BUILTIN_FONTS = [
  { label: 'MV Eamaan XP (Dhivehi Official — Default)', value: "'Mv_Eamaan_XP', 'Faruma', 'Noto Sans Thaana', sans-serif" },
  { label: 'Faruma (Dhivehi Classic)', value: "'Faruma', 'Mv_Eamaan_XP', 'Noto Sans Thaana', sans-serif" },
  { label: 'MV Waheed (Dhivehi Bold Display)', value: "'MV Waheed', 'Mv_Eamaan_XP', 'Faruma', sans-serif" },
  { label: 'Noto Sans Thaana (Dhivehi Modern)', value: "'Noto Sans Thaana', 'Mv_Eamaan_XP', 'Faruma', sans-serif" },
  { label: 'Outfit (Modern Display)', value: "'Outfit', 'Mv_Eamaan_XP', sans-serif" },
  { label: 'Plus Jakarta Sans (English Display)', value: "'Plus Jakarta Sans', sans-serif" },
  { label: 'Inter (Clean Sans)', value: "'Inter', sans-serif" },
];

export const EventManagePage: React.FC<EventManagePageProps> = ({
  organizations,
  events,
  logos,
  fonts,
  activeOrgId,
  activeEvent,
  onSelectOrg,
  onSelectEvent,
  onSaveEvents,
  onSaveLogos,
  onOpenStudioEditor,
  onNavigateToOrganizations,
  onNavigateToSponsors,
}) => {
  const currentOrg =
    organizations.find((o) => o.id === activeOrgId) ||
    organizations.find((o) => o.id === activeEvent?.primaryOrgId) ||
    organizations[0];

  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const sponsorUploadRef = useRef<HTMLInputElement>(null);

  // Event General Fields
  const [selectedOrgId, setSelectedOrgId] = useState<string>(currentOrg?.id || '');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [venue, setVenue] = useState('');
  const [description, setDescription] = useState('');

  // Event Title Typography Customization
  const [direction, setDirection] = useState<'rtl' | 'ltr'>('rtl');
  const [alignment, setAlignment] = useState<'right' | 'center' | 'left'>('right');
  const [fontFamily, setFontFamily] = useState(
    "'Mv_Eamaan_XP', 'Faruma', 'Noto Sans Thaana', sans-serif"
  );
  const [fontSize, setFontSize] = useState(56);
  const [fontWeight, setFontWeight] = useState<'400' | '500' | '600' | '700' | '800'>('700');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [shadowEnabled, setShadowEnabled] = useState(true);
  const [showDateOnPhoto, setShowDateOnPhoto] = useState(true);
  const [showVenueOnPhoto, setShowVenueOnPhoto] = useState(true);

  // Banner Colors & Linear Gradient Transparency
  const [bannerHeightPercent, setBannerHeightPercent] = useState(28);
  const [bannerColor, setBannerColor] = useState('#0D2B4E');
  const [bannerEndColor, setBannerEndColor] = useState('#041020');
  const [gradientDirection, setGradientDirection] = useState(0);
  const [startOpacity, setStartOpacity] = useState(95);
  const [endOpacity, setEndOpacity] = useState(0);
  const [gradientStartPos, setGradientStartPos] = useState(0);
  const [gradientEndPos, setGradientEndPos] = useState(100);

  // Sponsor Selection & Sizing
  const [selectedSponsorIds, setSelectedSponsorIds] = useState<string[]>([]);
  const [logoHeight, setLogoHeight] = useState(64);
  const [gapBetweenLogos, setGapBetweenLogos] = useState(24);
  const [logoAlignment, setLogoAlignment] = useState<
    'left' | 'center' | 'right' | 'space-between' | 'space-evenly'
  >('left');
  const [sponsorBackdropEnabled, setSponsorBackdropEnabled] = useState(true);
  const [backdropPillOpacity, setBackdropPillOpacity] = useState(85);
  const [sponsorBackdropColor, setSponsorBackdropColor] = useState('#0F172A');
  const [showSponsorLabel, setShowSponsorLabel] = useState(true);
  const [sponsorCategoryMode, setSponsorCategoryMode] = useState<'auto' | 'custom'>('auto');
  const [sponsorLabelText, setSponsorLabelText] = useState('Participant / Partner');
  const [previewOrientation, setPreviewOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [portraitSameAsLandscape, setPortraitSameAsLandscape] = useState<boolean>(true);

  const [quickUploadCategory, setQuickUploadCategory] = useState<LogoCategory>('participant');

  // Backend Gemini AI State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopicInput, setAiTopicInput] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);

  const handleAiAutoFill = async () => {
    if (!aiTopicInput.trim()) return;
    setIsAiLoading(true);
    setAiError(null);
    try {
      const res = await BackendAIService.suggestEventDetails({
        topic: aiTopicInput.trim(),
        organizationName: currentOrg?.name,
        currentTitle: title,
      });
      if (res) {
        if (direction === 'rtl' && res.titleDhivehi) {
          setTitle(res.titleDhivehi);
          if (res.subtitleDhivehi) setSubtitle(res.subtitleDhivehi);
        } else {
          setTitle(res.title || res.titleDhivehi || aiTopicInput);
          if (res.subtitle) setSubtitle(res.subtitle);
        }
        if (res.venue) setVenue(res.venue);
        if (res.bannerColor) setBannerColor(res.bannerColor);
        if (res.bannerEndColor) setBannerEndColor(res.bannerEndColor);
        if (res.suggestedSponsorLabel) setSponsorLabelText(res.suggestedSponsorLabel);
        setShowAiModal(false);
        setAiTopicInput('');
      }
    } catch (err: any) {
      setAiError(err?.message || 'AI branding synthesis failed. Please retry.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAiTranslateDhivehi = async () => {
    if (!title.trim()) return;
    setIsAiLoading(true);
    try {
      const res = await BackendAIService.translateToDhivehi(title, 'event_title');
      if (res && res.translatedText) {
        setTitle(res.translatedText);
        setDirection('rtl');
        setAlignment('right');
        setFontFamily("'Mv_Eamaan_XP', 'Faruma', 'Noto Sans Thaana', sans-serif");
      }
    } catch (err: any) {
      console.error('Translation error:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const targetOrgId = selectedOrgId || currentOrg?.id || '';
  const orgScopedEvents = targetOrgId
    ? events.filter((e) => e.primaryOrgId === targetOrgId)
    : events;

  const availableSponsorLogos = logos.filter(
    (l) =>
      (l.category === 'sponsor' || l.category === 'participant' || l.category === 'co-organizer') &&
      (!l.organizationId || l.organizationId === targetOrgId)
  );

  const selectedLogosList = useMemo(() => {
    return selectedSponsorIds
      .map((id) => logos.find((l) => l.id === id))
      .filter((l): l is BrandingLogoAsset => Boolean(l));
  }, [selectedSponsorIds, logos]);

  const activeCategoryLabel = useMemo(() => {
    return resolveSponsorCategoryLabel(
      {
        selectedSponsorIds,
        selectedParticipantIds: [],
        logoHeight,
        logoMaxWidth: 160,
        gapBetweenLogos,
        rowGap: 16,
        paddingX: 36,
        paddingY: 20,
        alignment: logoAlignment,
        showSponsorLabel,
        sponsorLabelText,
        sponsorCategoryMode,
        backdropPillOpacity,
        sponsorBackdropEnabled,
        sponsorBackdropColor,
      },
      selectedLogosList
    );
  }, [
    selectedSponsorIds,
    logoHeight,
    gapBetweenLogos,
    logoAlignment,
    showSponsorLabel,
    sponsorLabelText,
    sponsorCategoryMode,
    backdropPillOpacity,
    sponsorBackdropEnabled,
    sponsorBackdropColor,
    selectedLogosList,
  ]);

  const resetForm = () => {
    setEditingEventId(null);
    setTitle('');
    setSubtitle('');
    setDate(new Date().toISOString().slice(0, 10));
    setVenue('');
    setDescription('');
    setDirection('rtl');
    setAlignment('right');
    setFontFamily("'Mv_Eamaan_XP', 'Faruma', 'Noto Sans Thaana', sans-serif");
    setFontSize(56);
    setFontWeight('700');
    setTextColor('#FFFFFF');
    setShadowEnabled(true);
    setShowDateOnPhoto(true);
    setShowVenueOnPhoto(true);
    setBannerHeightPercent(28);
    setBannerColor(currentOrg?.primaryColor || '#0D2B4E');
    setBannerEndColor(currentOrg?.secondaryColor || '#041020');
    setGradientDirection(0);
    setStartOpacity(95);
    setEndOpacity(0);
    setGradientStartPos(0);
    setGradientEndPos(100);
    setSelectedSponsorIds([]);
    setLogoHeight(64);
    setGapBetweenLogos(24);
    setLogoAlignment('left');
    setSponsorBackdropEnabled(true);
    setBackdropPillOpacity(85);
    setSponsorBackdropColor('#0F172A');
    setShowSponsorLabel(true);
    setSponsorCategoryMode('auto');
    setSponsorLabelText('Participant / Partner');
    setPortraitSameAsLandscape(true);
  };

  const handleLoadEventIntoForm = (evt: EventConfiguration) => {
    setEditingEventId(evt.id);
    setSelectedOrgId(evt.primaryOrgId);
    setTitle(evt.title);
    setSubtitle(evt.textConfig.subtitle || '');
    setDate(evt.date);
    setVenue(evt.venue);
    setDescription(evt.description || '');
    setDirection(evt.textConfig.direction || 'rtl');
    setAlignment(evt.textConfig.alignment || 'right');
    setFontFamily(
      evt.textConfig.fontFamily || "'Mv_Eamaan_XP', 'Faruma', 'Noto Sans Thaana', sans-serif"
    );
    setFontSize(evt.textConfig.fontSize || 56);
    setFontWeight(evt.textConfig.fontWeight || '700');
    setTextColor(evt.textConfig.textColor || '#FFFFFF');
    setShadowEnabled(evt.textConfig.shadowEnabled ?? true);
    setShowDateOnPhoto(evt.textConfig.showDateOnPhoto ?? true);
    setShowVenueOnPhoto(evt.textConfig.showVenueOnPhoto ?? true);

    setBannerHeightPercent(evt.footerBanner.heightPercent || 28);
    setBannerColor(evt.footerBanner.backgroundColor || '#0D2B4E');
    setBannerEndColor(evt.footerBanner.endColor || '#041020');
    setGradientDirection(evt.footerBanner.gradientDirection ?? 0);
    setStartOpacity(evt.footerBanner.startOpacity ?? evt.footerBanner.gradientStops?.[0]?.opacity ?? 95);
    setEndOpacity(evt.footerBanner.endOpacity ?? evt.footerBanner.gradientStops?.[2]?.opacity ?? 0);
    setGradientStartPos(evt.footerBanner.gradientStartPos ?? 0);
    setGradientEndPos(evt.footerBanner.gradientEndPos ?? 100);

    setSelectedSponsorIds([...(evt.sponsorsConfig.selectedSponsorIds || [])]);
    setLogoHeight(evt.sponsorsConfig.logoHeight || 64);
    setGapBetweenLogos(evt.sponsorsConfig.gapBetweenLogos ?? 24);
    setLogoAlignment(evt.sponsorsConfig.alignment || 'left');
    setSponsorBackdropEnabled(
      evt.sponsorsConfig.sponsorBackdropEnabled ?? ((evt.sponsorsConfig.backdropPillOpacity ?? 85) > 0)
    );
    setBackdropPillOpacity(evt.sponsorsConfig.backdropPillOpacity ?? 85);
    setSponsorBackdropColor(evt.sponsorsConfig.sponsorBackdropColor || '#0F172A');
    setShowSponsorLabel(evt.sponsorsConfig.showSponsorLabel !== false);
    setSponsorCategoryMode(
      (evt.sponsorsConfig.sponsorCategoryMode === 'custom' ? 'custom' : 'auto')
    );
    setSponsorLabelText(
      evt.sponsorsConfig.sponsorLabelText === 'SPONSORS'
        ? 'Participant / Partner'
        : evt.sponsorsConfig.sponsorLabelText || 'Participant / Partner'
    );
    setPortraitSameAsLandscape(evt.orientationConfig?.portraitSameAsLandscape ?? true);
  };

  // Automatically load active event into form on mount or when active event changes
  // so data is NEVER auto-reset, keeping data permanent until explicitly deleted or changed
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (!hasInitializedRef.current && activeEvent) {
      handleLoadEventIntoForm(activeEvent);
      hasInitializedRef.current = true;
    }
  }, [activeEvent]);

  useEffect(() => {
    if (activeEvent && (!editingEventId || editingEventId === activeEvent.id)) {
      handleLoadEventIntoForm(activeEvent);
    }
  }, [activeEvent?.id]);

  const toggleSponsorId = (logoId: string) => {
    setSelectedSponsorIds((prev) =>
      prev.includes(logoId) ? prev.filter((id) => id !== logoId) : [...prev, logoId]
    );
  };

  const handleQuickSponsorUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    e.target.value = '';

    const uploaded: BrandingLogoAsset[] = await Promise.all(
      fileArray.map(
        (file, idx) =>
          new Promise<BrandingLogoAsset>((resolve) => {
            const reader = new FileReader();
            reader.onload = async () => {
              const rawDataUrl = reader.result as string;
              const dataUrl = await optimizeLogoDataUrl(rawDataUrl);
              const img = new Image();
              img.onload = () => {
                const aspect = img.naturalWidth / Math.max(1, img.naturalHeight);
                resolve({
                  id: `logo-spon-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
                  name: file.name.replace(/\.[^/.]+$/, ''),
                  category: quickUploadCategory,
                  organizationId: targetOrgId,
                  eventId: editingEventId || undefined,
                  dataUrl,
                  aspectRatio: Number(aspect.toFixed(2)),
                  createdAt: new Date().toISOString(),
                });
              };
              img.onerror = () => {
                resolve({
                  id: `logo-spon-${Date.now()}-${idx}`,
                  name: file.name.replace(/\.[^/.]+$/, ''),
                  category: quickUploadCategory,
                  organizationId: targetOrgId,
                  dataUrl,
                  aspectRatio: 2.2,
                  createdAt: new Date().toISOString(),
                });
              };
              img.src = dataUrl;
            };
            reader.readAsDataURL(file);
          })
      )
    );

    onSaveLogos([...uploaded, ...logos]);
    const newIds = uploaded.map((l) => l.id);
    setSelectedSponsorIds((prev) => Array.from(new Set([...prev, ...newIds])));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const org = organizations.find((o) => o.id === targetOrgId) || currentOrg;
    const midOpacity = Math.round((startOpacity + endOpacity) / 2);

    if (editingEventId) {
      const updatedList = events.map((evt) => {
        if (evt.id !== editingEventId) return evt;
        return {
          ...evt,
          title: title.trim(),
          date,
          venue: venue.trim() || 'Malé, Maldives',
          description: description.trim(),
          primaryOrgId: org?.id || evt.primaryOrgId,
          mainLogo1Id: org?.mainLogo1Id || evt.mainLogo1Id,
          mainLogo2Id: org?.mainLogo2Id || evt.mainLogo2Id,
          orgNameOverride: org?.name || evt.orgNameOverride,
          orgAddressOverride: org?.address || evt.orgAddressOverride,
          footerBanner: {
            ...evt.footerBanner,
            enabled: true,
            heightPercent: bannerHeightPercent,
            backgroundColor: bannerColor,
            endColor: bannerEndColor,
            gradientDirection,
            startOpacity,
            endOpacity,
            gradientStartPos,
            gradientEndPos,
            gradientStops: [
              { id: 'st-1', offset: gradientStartPos, color: bannerColor, opacity: startOpacity },
              {
                id: 'st-2',
                offset: Math.round((gradientStartPos + gradientEndPos) / 2),
                color: bannerEndColor,
                opacity: midOpacity,
              },
              { id: 'st-3', offset: gradientEndPos, color: bannerEndColor, opacity: endOpacity },
            ],
          },
          textConfig: {
            ...evt.textConfig,
            eventTitle: title.trim(),
            subtitle: subtitle.trim(),
            direction,
            alignment,
            fontFamily,
            fontSize,
            fontWeight,
            textColor,
            shadowEnabled,
            showDateOnPhoto,
            showVenueOnPhoto,
          },
          sponsorsConfig: {
            ...evt.sponsorsConfig,
            selectedSponsorIds: [...selectedSponsorIds],
            logoHeight,
            gapBetweenLogos,
            alignment: logoAlignment,
            sponsorBackdropEnabled,
            backdropPillOpacity: sponsorBackdropEnabled ? backdropPillOpacity : 0,
            sponsorBackdropColor,
            showSponsorLabel,
            sponsorCategoryMode,
            sponsorLabelText,
          },
          orientationConfig: {
            ...(evt.orientationConfig || {}),
            portraitBannerHeightScale: 1.0,
            portraitFontSizeScale: 1.0,
            portraitLogoScale: 1.0,
            portraitStackLogos: false,
            portraitSameAsLandscape,
            landscapeBannerHeightScale: 1.0,
            landscapeFontSizeScale: 1.0,
            landscapeLogoScale: 1.0,
          },
          updatedAt: new Date().toISOString(),
        };
      });

      onSaveEvents(updatedList, editingEventId);
      // Keep event data permanent in form until explicitly deleted or changed
    } else {
      const base = createBlankEventConfiguration(org);
      const newEvt: EventConfiguration = {
        ...base,
        id: `evt-${Date.now()}`,
        title: title.trim(),
        date,
        venue: venue.trim() || 'Malé, Maldives',
        description: description.trim(),
        primaryOrgId: org?.id || '',
        mainLogo1Id: org?.mainLogo1Id || '',
        mainLogo2Id: org?.mainLogo2Id || '',
        orgNameOverride: org?.name || '',
        orgAddressOverride: org?.address || '',
        headerPosition: org?.headerPosition || 'top-right',
        headerDisplayMode: org?.headerDisplayMode || 'both-logos',
        footerBanner: {
          ...base.footerBanner,
          enabled: true,
          heightPercent: bannerHeightPercent,
          backgroundColor: bannerColor,
          endColor: bannerEndColor,
          gradientDirection,
          startOpacity,
          endOpacity,
          gradientStartPos,
          gradientEndPos,
          gradientStops: [
            { id: 'st-1', offset: gradientStartPos, color: bannerColor, opacity: startOpacity },
            {
              id: 'st-2',
              offset: Math.round((gradientStartPos + gradientEndPos) / 2),
              color: bannerEndColor,
              opacity: midOpacity,
            },
            { id: 'st-3', offset: gradientEndPos, color: bannerEndColor, opacity: endOpacity },
          ],
        },
        textConfig: {
          ...base.textConfig,
          eventTitle: title.trim(),
          subtitle: subtitle.trim(),
          direction,
          alignment,
          fontFamily,
          fontSize,
          fontWeight,
          textColor,
          shadowEnabled,
          showDateOnPhoto,
          showVenueOnPhoto,
        },
        sponsorsConfig: {
          ...base.sponsorsConfig,
          selectedSponsorIds: [...selectedSponsorIds],
          logoHeight,
          gapBetweenLogos,
          alignment: logoAlignment,
          sponsorBackdropEnabled,
          backdropPillOpacity: sponsorBackdropEnabled ? backdropPillOpacity : 0,
          sponsorBackdropColor,
          showSponsorLabel,
          sponsorCategoryMode,
          sponsorLabelText,
        },
        orientationConfig: {
          ...(base.orientationConfig || {}),
          portraitBannerHeightScale: 1.0,
          portraitFontSizeScale: 1.0,
          portraitLogoScale: 1.0,
          portraitStackLogos: false,
          portraitSameAsLandscape,
          landscapeBannerHeightScale: 1.0,
          landscapeFontSizeScale: 1.0,
          landscapeLogoScale: 1.0,
        },
        exportConfig: {
          ...base.exportConfig,
          filenamePrefix: title
            .trim()
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .slice(0, 24) || 'Event_Photo',
        },
        updatedAt: new Date().toISOString(),
      };

      if (org) {
        onSelectOrg(org.id);
      }
      onSaveEvents([newEvt, ...events], newEvt.id);
      setEditingEventId(newEvt.id);
      // Keep newly created event loaded permanently until deleted or changed
    }
  };

  const handleDuplicateEvent = (evt: EventConfiguration) => {
    const copy: EventConfiguration = {
      ...JSON.parse(JSON.stringify(evt)),
      id: `evt-${Date.now()}`,
      title: `${evt.title} (Copy)`,
      updatedAt: new Date().toISOString(),
    };
    onSaveEvents([copy, ...events], copy.id);
  };

  const handleDeleteEvent = (id: string) => {
    const remaining = events.filter((e) => e.id !== id);
    const nextActive = activeEvent?.id === id ? remaining[0]?.id || '' : activeEvent?.id || '';
    onSaveEvents(remaining, nextActive);
    setConfirmDeleteId(null);
  };

  const allFontChoices = useMemo(() => {
    const list = [
      ...BUILTIN_FONTS,
      ...fonts.map((f) => ({
        label: `${f.name} (Custom Font)`,
        value: f.family,
      })),
    ];
    const seen = new Set<string>();
    return list.filter((f) => {
      if (seen.has(f.value)) return false;
      seen.add(f.value);
      return true;
    });
  }, [fonts]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#0B0F17] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white">
                Event Management &amp; Customization
              </h1>
              <p className="text-xs text-slate-400">
                Create events under organizations, customize event title text, typography fonts (Mv Eamaan XP / Faruma / custom), banner colors, gradient transparency, sponsor logos, height, and gaps
              </p>
            </div>
          </div>

          {/* Organization Selector Pill */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-2 bg-[#111726] border border-slate-700 rounded-xl px-3 py-1.5">
              <Building2 className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-slate-400">Organization:</span>
              {organizations.length === 0 ? (
                <button
                  type="button"
                  onClick={onNavigateToOrganizations}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                >
                  + Create Organization First
                </button>
              ) : (
                <select
                  value={targetOrgId}
                  onChange={(e) => {
                    const nextOrgId = e.target.value;
                    setSelectedOrgId(nextOrgId);
                    onSelectOrg(nextOrgId);
                  }}
                  className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
                >
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id} className="bg-slate-900 text-white">
                      {o.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {editingEventId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Event</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT 7 COLUMNS: Create & Customize Event Form */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-7 bg-[#111726] border border-slate-800 rounded-2xl p-5 space-y-6 self-start"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                {editingEventId ? (
                  <Edit3 className="w-4 h-4 text-amber-400" />
                ) : (
                  <Plus className="w-4 h-4 text-blue-400" />
                )}
                <h2 className="text-sm font-bold text-white">
                  {editingEventId
                    ? 'Customize Saved Event Configuration'
                    : 'Create & Customize New Event'}
                </h2>
              </div>
              {editingEventId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel Edit</span>
                </button>
              )}
            </div>

            {/* 1. Organization & General Event Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-400">
                <Calendar className="w-3.5 h-3.5" />
                <span>1. Event Details &amp; Organization</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Belongs to Organization *
                  </label>
                  <select
                    value={targetOrgId}
                    onChange={(e) => {
                      setSelectedOrgId(e.target.value);
                      onSelectOrg(e.target.value);
                    }}
                    className="w-full px-3 py-2 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Event Date *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Event Venue / Location
                  </label>
                  <input
                    type="text"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="e.g. Dharubaaruge, Malé"
                    className="w-full px-3 py-2 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Subtitle / Tagline (Optional)
                  </label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="e.g. Annual Gala Ceremony 2026"
                    className="w-full px-3 py-2 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* 2. Customize Event Title Text */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                  <Type className="w-3.5 h-3.5" />
                  <span>2. Customize Event Title Text &amp; Typography Font</span>
                </div>
                <div className="flex items-center gap-1 bg-[#0B0F17] border border-slate-800 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDirection('rtl');
                      setAlignment('right');
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer ${
                      direction === 'rtl'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Dhivehi RTL
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDirection('ltr');
                      setAlignment('left');
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer ${
                      direction === 'ltr'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    English LTR
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-slate-400">
                    Event Title Text *
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isAiLoading || !title.trim()}
                      onClick={handleAiTranslateDhivehi}
                      className="px-2 py-0.5 text-[11px] rounded bg-purple-950/60 hover:bg-purple-900 border border-purple-500/40 text-purple-200 flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-40"
                      title="Translate English title to authentic Dhivehi Thaana"
                    >
                      {isAiLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Languages className="w-3 h-3 text-purple-300" />
                      )}
                      <span>To Dhivehi</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAiModal(true)}
                      className="px-2 py-0.5 text-[11px] rounded bg-blue-950/60 hover:bg-blue-900 border border-blue-500/40 text-blue-200 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Auto-generate complete event branding with Gemini AI"
                    >
                      <Sparkles className="w-3 h-3 text-blue-400" />
                      <span>AI Magic Fill</span>
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  required
                  dir={direction}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    direction === 'rtl'
                      ? 'މޯލްޑިވްސް އޯޝަން ސަމިޓް 2026'
                      : 'Maldives Golden Jubilee Gala Night'
                  }
                  className="w-full px-3.5 py-2.5 text-sm bg-[#0B0F17] border border-slate-700 rounded-xl text-white font-thaana focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Event Title Font Family (Customize Font)
                  </label>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-white cursor-pointer"
                  >
                    {allFontChoices.map((f, idx) => (
                      <option key={`opt-event-${f.value}-${idx}`} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Font Weight
                  </label>
                  <select
                    value={fontWeight}
                    onChange={(e) =>
                      setFontWeight(
                        e.target.value as '400' | '500' | '600' | '700' | '800'
                      )
                    }
                    className="w-full px-3 py-2 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-white cursor-pointer"
                  >
                    <option value="400">Regular (400)</option>
                    <option value="600">Semi-Bold (600)</option>
                    <option value="700">Bold (700)</option>
                    <option value="800">Extra-Bold (800)</option>
                  </select>
                </div>
              </div>

              {/* Live Event Title Font Preview */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-400">Event Title Font Live Preview:</div>
                <div
                  style={{ fontFamily }}
                  className="text-lg font-bold text-white font-thaana truncate"
                  dir={direction}
                >
                  {title || 'މޯލްޑިވްސް އޯޝަން ސަމިޓް 2026'}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Font Size ({fontSize}px)
                  </label>
                  <input
                    type="range"
                    min={24}
                    max={110}
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Title Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-8 h-7 rounded bg-transparent border border-slate-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-[#0B0F17] border border-slate-700 rounded text-white font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Text Alignment
                  </label>
                  <div className="flex items-center gap-1 bg-[#0B0F17] border border-slate-700 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => setAlignment('left')}
                      className={`flex-1 py-1 rounded flex items-center justify-center cursor-pointer ${
                        alignment === 'left'
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setAlignment('center')}
                      className={`flex-1 py-1 rounded flex items-center justify-center cursor-pointer ${
                        alignment === 'center'
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <AlignCenter className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setAlignment('right')}
                      className={`flex-1 py-1 rounded flex items-center justify-center cursor-pointer ${
                        alignment === 'right'
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <AlignRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center flex-wrap gap-4 pt-1 text-xs text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shadowEnabled}
                    onChange={(e) => setShadowEnabled(e.target.checked)}
                    className="rounded border-slate-700 text-blue-600"
                  />
                  <span>HD Drop Shadow</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showDateOnPhoto}
                    onChange={(e) => setShowDateOnPhoto(e.target.checked)}
                    className="rounded border-slate-700 text-blue-600"
                  />
                  <span>Show Date on Banner</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showVenueOnPhoto}
                    onChange={(e) => setShowVenueOnPhoto(e.target.checked)}
                    className="rounded border-slate-700 text-blue-600"
                  />
                  <span>Show Venue on Banner</span>
                </label>
              </div>
            </div>

            {/* 3. Banner Colors & Linear Gradient Transparency */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                  <Palette className="w-3.5 h-3.5" />
                  <span>3. Banner Colors &amp; Linear Gradient Transparency</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Height: {bannerHeightPercent}%
                </span>
              </div>

              {/* Live Event Banner Arrangement Preview with Orientation Toggle */}
              <div className="rounded-2xl bg-[#080C14] border border-slate-800 p-3.5 sm:p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white tracking-wide">
                      Live Banner Arrangement Preview
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/40 border border-blue-500/30 text-blue-300 font-medium">
                      {previewOrientation === 'portrait' ? 'Portrait (9:16)' : 'Landscape (16:9)'}
                    </span>
                  </div>

                  {/* Orientation Switcher */}
                  <div className="flex items-center gap-1 bg-[#111726] border border-slate-700/80 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => setPreviewOrientation('landscape')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                        previewOrientation === 'landscape'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      <span>Landscape</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewOrientation('portrait')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                        previewOrientation === 'portrait'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Portrait</span>
                    </button>
                  </div>
                </div>

                {/* Banner Simulated Stage */}
                <div
                  className={`mx-auto rounded-xl border border-slate-700/70 overflow-hidden relative transition-all duration-300 shadow-xl flex flex-col justify-end ${
                    previewOrientation === 'portrait'
                      ? 'w-full max-w-[340px] h-64'
                      : 'w-full h-44 sm:h-48'
                  }`}
                  style={{
                    backgroundColor: '#0F172A',
                    backgroundImage:
                      'radial-gradient(circle at 50% 30%, rgba(30, 58, 138, 0.3) 0%, rgba(15, 23, 42, 0.95) 75%)',
                  }}
                >
                  {/* Photo content placeholder indicator */}
                  <div className="absolute top-2.5 left-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 pointer-events-none">
                    <span>{previewOrientation === 'portrait' ? 'Portrait Photo Stage' : 'Landscape Photo Stage'}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                      {previewOrientation === 'portrait' ? '9:16' : '16:9'}
                    </span>
                  </div>

                  {/* The Live Banner Area */}
                  <div
                    className="w-full relative flex flex-col justify-between p-3 transition-all duration-300"
                    style={{
                      height: `${Math.max(32, bannerHeightPercent)}%`,
                      background: `linear-gradient(${gradientDirection}deg, ${hexToRgba(
                        bannerColor,
                        startOpacity
                      )} ${gradientStartPos}%, ${hexToRgba(bannerEndColor, endOpacity)} ${gradientEndPos}%)`,
                    }}
                  >
                    <div className="flex-1 flex flex-col justify-between">
                      {/* Sponsor Category Label (if enabled) positioned above logos */}
                      {showSponsorLabel && (
                        <div
                          className={`text-[9px] font-bold tracking-wider uppercase text-blue-300 drop-shadow mb-1 ${
                            logoAlignment === 'right'
                              ? 'text-right'
                              : logoAlignment === 'center'
                              ? 'text-center'
                              : 'text-left'
                          }`}
                        >
                          <span className="px-1.5 py-0.5 rounded bg-blue-950/70 border border-blue-500/30">
                            {activeCategoryLabel}
                          </span>
                        </div>
                      )}

                      {/* Main Banner Content: Logos and Event Title */}
                      <div
                        className={`flex items-end justify-between gap-3 ${
                          previewOrientation === 'portrait' ? 'flex-col items-stretch justify-end gap-2' : ''
                        }`}
                      >
                        {/* Logos Area */}
                        <div
                          className={`flex items-center flex-wrap ${
                            logoAlignment === 'center'
                              ? 'justify-center'
                              : logoAlignment === 'right'
                              ? 'justify-end'
                              : logoAlignment === 'space-between'
                              ? 'justify-between'
                              : logoAlignment === 'space-evenly'
                              ? 'justify-evenly'
                              : 'justify-start'
                          }`}
                          style={{ gap: `${Math.max(6, Math.round(gapBetweenLogos * 0.35))}px` }}
                        >
                          {selectedLogosList.length > 0 ? (
                            selectedLogosList.slice(0, previewOrientation === 'portrait' ? 4 : 6).map((sp) => (
                              <div
                                key={sp.id}
                                className="rounded flex items-center justify-center p-1 transition-all shadow-sm shrink-0"
                                style={{
                                  height: `${Math.max(20, Math.round(logoHeight * 0.42))}px`,
                                  minWidth: `${Math.max(24, Math.round(logoHeight * 0.5))}px`,
                                  backgroundColor: sponsorBackdropEnabled
                                    ? hexToRgba(sponsorBackdropColor, backdropPillOpacity)
                                    : 'transparent',
                                  border: sponsorBackdropEnabled ? '1px solid rgba(255,255,255,0.1)' : 'none',
                                }}
                              >
                                <img
                                  src={sp.dataUrl}
                                  alt={sp.name}
                                  className="max-h-full max-w-full object-contain"
                                />
                              </div>
                            ))
                          ) : (
                            <div
                              className="px-2.5 py-1 rounded text-[9px] font-bold tracking-wider uppercase text-slate-300 flex items-center gap-1.5 border border-white/10 shadow-sm"
                              style={{
                                backgroundColor: sponsorBackdropEnabled
                                  ? hexToRgba(sponsorBackdropColor, backdropPillOpacity)
                                  : 'transparent',
                              }}
                            >
                              <span>SPONSORS / PARTNERS</span>
                            </div>
                          )}
                        </div>

                        {/* Title & Subtitle Area */}
                        <div
                          className={`min-w-0 ${
                            alignment === 'center'
                              ? 'text-center'
                              : alignment === 'left'
                              ? 'text-left'
                              : 'text-right'
                          }`}
                          dir={direction}
                        >
                          <div
                            className="font-bold truncate drop-shadow"
                            style={{
                              color: textColor,
                              fontFamily,
                              fontSize: `${Math.max(12, Math.round(fontSize * 0.35))}px`,
                              textShadow: shadowEnabled ? '0 2px 6px rgba(0,0,0,0.85)' : 'none',
                            }}
                          >
                            {title || 'Event Title Preview'}
                          </div>
                          {subtitle && (
                            <div
                              className="text-[10px] font-medium text-slate-300/90 truncate"
                              dir="ltr"
                            >
                              {subtitle}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom row: Venue & Date */}
                      {(showDateOnPhoto || showVenueOnPhoto) && (
                        <div className="flex items-center justify-end gap-2 text-[9px] font-semibold text-slate-300/80 drop-shadow pt-1">
                          {showVenueOnPhoto && venue && <span>{venue}</span>}
                          {showVenueOnPhoto && venue && showDateOnPhoto && date && <span>·</span>}
                          {showDateOnPhoto && date && <span>{date}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Portrait arrangement reassurance note */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                    <Check className="w-3.5 h-3.5" />
                    <span>Same banner arrangements apply to portrait images automatically</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Opacity: {startOpacity}% → {endOpacity}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Primary Banner Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={bannerColor}
                      onChange={(e) => setBannerColor(e.target.value)}
                      className="w-8 h-7 rounded bg-transparent border border-slate-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={bannerColor}
                      onChange={(e) => setBannerColor(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-[#0B0F17] border border-slate-700 rounded text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Secondary Fade Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={bannerEndColor}
                      onChange={(e) => setBannerEndColor(e.target.value)}
                      className="w-8 h-7 rounded bg-transparent border border-slate-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={bannerEndColor}
                      onChange={(e) => setBannerEndColor(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-[#0B0F17] border border-slate-700 rounded text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Gradient Fade Direction
                  </label>
                  <select
                    value={gradientDirection}
                    onChange={(e) => setGradientDirection(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-white cursor-pointer"
                  >
                    <option value={0}>Bottom to Top Fade (0°)</option>
                    <option value={90}>Left to Right Fade (90°)</option>
                    <option value={270}>Right to Left Fade (270°)</option>
                    <option value={180}>Top to Bottom Fade (180°)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Banner Height ({bannerHeightPercent}%)
                  </label>
                  <input
                    type="range"
                    min={12}
                    max={50}
                    value={bannerHeightPercent}
                    onChange={(e) => setBannerHeightPercent(Number(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Start Opacity ({startOpacity}%)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={startOpacity}
                    onChange={(e) => setStartOpacity(Number(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    End Transparency Opacity ({endOpacity}%)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={endOpacity}
                    onChange={(e) => setEndOpacity(Number(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* 4. Select Sponsors, Logo Height & Gaps */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-purple-400">
                  <Layers className="w-3.5 h-3.5" />
                  <span>
                    4. Select Event Sponsors ({selectedSponsorIds.length} Selected)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => sponsorUploadRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-[11px] font-medium text-blue-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload Sponsor Logos</span>
                  </button>
                  <input
                    ref={sponsorUploadRef}
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleQuickSponsorUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={onNavigateToSponsors}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 cursor-pointer"
                  >
                    Manage Sponsors CRUD →
                  </button>
                </div>
              </div>

              {/* Multi-Select Sponsor Grid */}
              {availableSponsorLogos.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#0B0F17] border border-dashed border-slate-800 text-center space-y-2">
                  <p className="text-xs text-slate-400">
                    No sponsor logos uploaded for this organization yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => sponsorUploadRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Sponsor Logos Now</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Click multiple sponsor logos to include in this event:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedSponsorIds(availableSponsorLogos.map((l) => l.id))
                        }
                        className="text-blue-400 hover:underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => setSelectedSponsorIds([])}
                        className="text-slate-400 hover:text-white cursor-pointer"
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                    {availableSponsorLogos.map((logo) => {
                      const isChecked = selectedSponsorIds.includes(logo.id);
                      return (
                        <button
                          key={logo.id}
                          type="button"
                          onClick={() => toggleSponsorId(logo.id)}
                          className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer ${
                            isChecked
                              ? 'bg-blue-950/40 border-blue-500 text-white'
                              : 'bg-[#0B0F17] border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="w-8 h-8 rounded bg-slate-900 border border-slate-800 flex items-center justify-center p-1 shrink-0">
                            <img
                              src={logo.dataUrl}
                              alt={logo.name}
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-medium truncate">
                              {logo.name}
                            </div>
                            <div className="text-[9px] text-slate-500 uppercase">
                              {logo.category}
                            </div>
                          </div>
                          {isChecked && (
                            <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sizing & Gaps */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Sponsor Logo Height ({logoHeight}px)
                  </label>
                  <input
                    type="range"
                    min={24}
                    max={160}
                    value={logoHeight}
                    onChange={(e) => setLogoHeight(Number(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Gap Between Logos ({gapBetweenLogos}px)
                  </label>
                  <input
                    type="range"
                    min={4}
                    max={100}
                    value={gapBetweenLogos}
                    onChange={(e) => setGapBetweenLogos(Number(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Sponsor Row Alignment
                  </label>
                  <select
                    value={logoAlignment}
                    onChange={(e) =>
                      setLogoAlignment(
                        e.target.value as
                          | 'left'
                          | 'center'
                          | 'right'
                          | 'space-between'
                          | 'space-evenly'
                      )
                    }
                    className="w-full px-2.5 py-1.5 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-white cursor-pointer"
                  >
                    <option value="left">Left Aligned</option>
                    <option value="center">Centered</option>
                    <option value="right">Right Aligned</option>
                    <option value="space-between">Space Between</option>
                    <option value="space-evenly">Space Evenly</option>
                  </select>
                </div>
              </div>

              {/* Sponsor Category Label on Photo Settings */}
              <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-xs font-semibold text-slate-200">
                      Sponsor Category Label on Photo
                    </span>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showSponsorLabel}
                      onChange={(e) => setShowSponsorLabel(e.target.checked)}
                      className="rounded border-slate-700 text-blue-600 focus:ring-0"
                    />
                    <span>Show on Photo</span>
                  </label>
                </div>

                {showSponsorLabel && (
                  <div className="space-y-2.5 pt-1 border-t border-slate-800/80">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-slate-400">Mode:</span>
                      <div className="flex items-center gap-1 bg-[#111726] border border-slate-700 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => setSponsorCategoryMode('auto')}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                            sponsorCategoryMode === 'auto'
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Auto Detect (Default: Participant / Partner)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSponsorCategoryMode('custom')}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                            sponsorCategoryMode === 'custom'
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Custom Label
                        </button>
                      </div>
                    </div>

                    {sponsorCategoryMode === 'custom' ? (
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">
                          Custom Label Text
                        </label>
                        <input
                          type="text"
                          value={sponsorLabelText}
                          onChange={(e) => setSponsorLabelText(e.target.value)}
                          placeholder="e.g. Participant / Partner, Official Sponsors"
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white font-medium"
                        />
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-blue-950/20 border border-blue-500/20 flex items-center justify-between text-xs">
                        <span className="text-slate-400 text-[11px]">
                          Label resolved on photo from included logo categories:
                        </span>
                        <span className="px-2.5 py-0.5 rounded bg-blue-900/50 text-blue-300 font-bold tracking-wide uppercase text-[11px] border border-blue-500/30">
                          {activeCategoryLabel}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sponsor Logos Background Transparency & With / Without Option */}
              <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-xs font-semibold text-slate-200">
                      Sponsor Logos Background Transparency
                    </span>
                  </div>
                  {/* With / Without Option Toggle */}
                  <div className="flex items-center gap-1 bg-[#111726] border border-slate-700 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => setSponsorBackdropEnabled(true)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                        sponsorBackdropEnabled
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      With Background
                    </button>
                    <button
                      type="button"
                      onClick={() => setSponsorBackdropEnabled(false)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                        !sponsorBackdropEnabled
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Without Background
                    </button>
                  </div>
                </div>

                {sponsorBackdropEnabled ? (
                  <div className="space-y-3 pt-1 border-t border-slate-800/80">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                          <span>Transparency / Opacity Level</span>
                          <span className="font-semibold text-blue-400 font-mono">
                            {backdropPillOpacity}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={backdropPillOpacity}
                          onChange={(e) => setBackdropPillOpacity(Number(e.target.value))}
                          className="w-full accent-blue-500 cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] text-slate-500 pt-0.5">
                          <span>0% (Transparent)</span>
                          <span>50%</span>
                          <span>100% (Solid)</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Background Pill Color
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={sponsorBackdropColor}
                            onChange={(e) => setSponsorBackdropColor(e.target.value)}
                            className="w-8 h-7 rounded bg-transparent border border-slate-700 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={sponsorBackdropColor}
                            onChange={(e) => setSponsorBackdropColor(e.target.value)}
                            className="w-full px-2 py-1 text-xs bg-[#111726] border border-slate-700 rounded text-white font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Live Sponsor Container Transparency Preview */}
                    <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Live Preview on Event Photo / Banner:</span>
                        <span className="text-purple-300 font-mono">
                          {backdropPillOpacity === 0
                            ? '0% (Transparent)'
                            : `${backdropPillOpacity}% Opacity (${sponsorBackdropColor})`}
                        </span>
                      </div>
                      <div
                        className="p-3 rounded-lg border border-slate-700/50 flex items-center justify-center gap-3 overflow-hidden relative"
                        style={{
                          background: `linear-gradient(${gradientDirection}deg, ${bannerColor} 0%, ${bannerEndColor} 100%)`,
                        }}
                      >
                        <div
                          className="px-3 py-1.5 rounded-md flex items-center gap-2 border border-white/10 transition-all shadow"
                          style={{
                            backgroundColor: hexToRgba(sponsorBackdropColor, backdropPillOpacity),
                          }}
                        >
                          <span className="text-[10px] uppercase font-bold tracking-wider text-white">
                            SPONSOR LOGO
                          </span>
                        </div>
                        <div
                          className="px-3 py-1.5 rounded-md flex items-center gap-2 border border-white/10 transition-all shadow"
                          style={{
                            backgroundColor: hexToRgba(sponsorBackdropColor, backdropPillOpacity),
                          }}
                        >
                          <span className="text-[10px] uppercase font-bold tracking-wider text-white">
                            PARTNER LOGO
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-center space-y-1">
                    <p className="text-xs text-slate-300 font-medium">
                      Without Background Container (Transparent)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Sponsor logos will be rendered cleanly onto the event banner without any background container.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 5. Portrait Images Banner Arrangement */}
            <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs font-semibold text-slate-200">
                    Portrait Images Banner Arrangement
                  </span>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={portraitSameAsLandscape}
                    onChange={(e) => setPortraitSameAsLandscape(e.target.checked)}
                    className="rounded border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-[11px] font-semibold text-emerald-400">
                    Same as Landscape (Active)
                  </span>
                </label>
              </div>
              <p className="text-[11px] text-slate-400">
                When photos are taken in portrait orientation (vertical 9:16 or 3:4), the banner maintains the exact same arrangements: logo row alignment ({logoAlignment}), sponsor category label ({activeCategoryLabel}), backdrop container ({sponsorBackdropEnabled ? `${backdropPillOpacity}% opacity` : 'transparent'}), and event typography.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>
                {editingEventId
                  ? 'Save Customized Event Configuration'
                  : 'Create Event Under Organization'}
              </span>
            </button>
          </form>

          {/* RIGHT 5 COLUMNS: Saved Events List Under Organization */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">
                Events in {currentOrg?.name || 'Organization'} ({orgScopedEvents.length})
              </h2>
              <span className="text-xs text-slate-400">
                Each event saves its own sponsors &amp; banner
              </span>
            </div>

            {orgScopedEvents.length === 0 ? (
              <div className="bg-[#111726] border border-dashed border-slate-800 rounded-2xl p-8 text-center space-y-3">
                <FolderKanban className="w-10 h-10 text-slate-600 mx-auto" />
                <div className="text-sm font-semibold text-slate-300">
                  No Events Created for This Organization Yet
                </div>
                <p className="text-xs text-slate-500">
                  Fill out the event form on the left to configure your event title, gradient banner, and sponsor logos.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {orgScopedEvents.map((evt) => {
                  const isActive = evt.id === activeEvent?.id;
                  const isEditing = evt.id === editingEventId;
                  const eventSponsors = evt.sponsorsConfig.selectedSponsorIds
                    .map((id) => logos.find((l) => l.id === id))
                    .filter(Boolean) as BrandingLogoAsset[];

                  return (
                    <div
                      key={evt.id}
                      onClick={() => onSelectEvent(evt.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                        isActive
                          ? 'bg-blue-950/25 border-blue-500/60 shadow-lg shadow-blue-950/20'
                          : 'bg-[#111726] border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="text-sm font-bold text-white font-thaana truncate"
                              dir={evt.textConfig.direction}
                            >
                              {evt.title}
                            </span>
                            {isActive && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-600/30 border border-blue-500/40 text-blue-300 font-semibold">
                                Active
                              </span>
                            )}
                            {isEditing && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-semibold">
                                Editing
                              </span>
                            )}
                          </div>

                          <div className="flex items-center flex-wrap gap-2 text-xs text-slate-400">
                            <span>{evt.date}</span>
                            {evt.venue && (
                              <>
                                <span>·</span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-500" />
                                  <span>{evt.venue}</span>
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Color Swatch Preview */}
                        <div
                          className="w-10 h-7 rounded-lg border border-slate-700 shrink-0"
                          title="Banner Gradient Preview"
                          style={{
                            background: `linear-gradient(${evt.footerBanner.gradientDirection}deg, ${evt.footerBanner.backgroundColor}, ${
                              evt.footerBanner.endColor || '#041020'
                            })`,
                          }}
                        />
                      </div>

                      {/* Sponsors strip preview */}
                      <div className="flex items-center justify-between gap-2 bg-[#0B0F17] border border-slate-800/90 rounded-xl px-3 py-2">
                        <div className="flex items-center gap-1.5 overflow-x-auto">
                          {eventSponsors.length === 0 ? (
                            <span className="text-[11px] text-slate-500">
                              No sponsors selected
                            </span>
                          ) : (
                            eventSponsors.slice(0, 6).map((sp) => (
                              <div
                                key={sp.id}
                                className="w-7 h-7 rounded bg-slate-900 border border-slate-800 flex items-center justify-center p-0.5 shrink-0"
                                title={sp.name}
                              >
                                <img
                                  src={sp.dataUrl}
                                  alt={sp.name}
                                  className="max-h-full max-w-full object-contain"
                                />
                              </div>
                            ))
                          )}
                          {eventSponsors.length > 6 && (
                            <span className="text-[10px] text-slate-400 pl-1">
                              +{eventSponsors.length - 6} more
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          H:{evt.sponsorsConfig.logoHeight}px · Gap:{evt.sponsorsConfig.gapBetweenLogos}px
                        </span>
                      </div>

                      {/* Event Card Action Buttons */}
                      <div
                        className="flex items-center justify-between gap-2 pt-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleLoadEventIntoForm(evt)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                            <span>Customize</span>
                          </button>
                          {onOpenStudioEditor && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectEvent(evt.id);
                                onOpenStudioEditor(evt.id);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white flex items-center gap-1 cursor-pointer"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                              <span>Open in Studio &amp; Generate Photos</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDuplicateEvent(evt)}
                            title="Duplicate Event"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {confirmDeleteId === evt.id ? (
                            <div className="flex items-center gap-1 bg-rose-950/60 border border-rose-500/40 rounded-lg px-2 py-1">
                              <button
                                type="button"
                                onClick={() => handleDeleteEvent(evt.id)}
                                className="text-[11px] font-bold text-rose-300 hover:text-white cursor-pointer"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="text-[11px] text-slate-400 ml-1 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(evt.id)}
                              title="Delete Event"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Magic Fill Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0F172A] border border-blue-500/30 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">AI Event Magic Fill</h3>
                  <p className="text-[11px] text-slate-400">Powered by server-side Gemini 3.8</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Enter your event topic or idea. Gemini will generate professional titles, Dhivehi Thaana transliteration, matching gradient palettes, and sponsor branding.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-400">
                Event Topic or Concept
              </label>
              <input
                type="text"
                value={aiTopicInput}
                onChange={(e) => setAiTopicInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAiAutoFill();
                  }
                }}
                placeholder="e.g. National Badminton Championship Hulhumale 2026"
                className="w-full px-3.5 py-2.5 text-xs bg-[#0B0F17] border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                autoFocus
              />
            </div>

            {aiError && (
              <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
                {aiError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isAiLoading || !aiTopicInput.trim()}
                onClick={handleAiAutoFill}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white flex items-center gap-1.5 shadow-lg shadow-blue-900/40 cursor-pointer"
              >
                {isAiLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Generate Branding</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
