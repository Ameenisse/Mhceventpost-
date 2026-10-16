import React, { useRef, useState } from 'react';
import {
  Building2,
  Calendar,
  Check,
  Copy,
  FileText,
  FolderKanban,
  Image as ImageIcon,
  Layers,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Type,
  Upload,
} from 'lucide-react';
import {
  BrandingLogoAsset,
  CustomFontAsset,
  EventConfiguration,
  LogoCategory,
  OrganizationProfile,
  SavedTemplatePreset,
} from '../types/studio';
import { createBlankEventConfiguration } from '../services/persistentStorage';

interface StudioModalsProps {
  activeModal: 'events' | 'organizations' | 'assets' | 'templates' | null;
  onClose: () => void;
  // Data
  activeOrgId?: string;
  onSelectOrgFilter?: (orgId: string) => void;
  events: EventConfiguration[];
  activeEvent: EventConfiguration;
  organizations: OrganizationProfile[];
  logos: BrandingLogoAsset[];
  fonts: CustomFontAsset[];
  templates: SavedTemplatePreset[];
  isSuper?: boolean;
  // Handlers
  onSelectEvent: (eventId: string) => void;
  onSaveEvents: (events: EventConfiguration[], nextActiveId?: string) => void;
  onUpdateActiveEvent: (updater: (prev: EventConfiguration) => EventConfiguration) => void;
  onSaveOrganizations: (orgs: OrganizationProfile[]) => void;
  onSaveLogos: (logos: BrandingLogoAsset[]) => void;
  onSaveFonts: (fonts: CustomFontAsset[]) => void;
  onSaveTemplates: (templates: SavedTemplatePreset[]) => void;
}

export const StudioModals: React.FC<StudioModalsProps> = ({
  activeModal,
  onClose,
  activeOrgId,
  onSelectOrgFilter,
  events,
  activeEvent,
  organizations,
  logos,
  fonts,
  templates,
  isSuper = false,
  onSelectEvent,
  onSaveEvents,
  onUpdateActiveEvent,
  onSaveOrganizations,
  onSaveLogos,
  onSaveFonts,
  onSaveTemplates,
}) => {
  const currentOrgId =
    activeOrgId || activeEvent?.primaryOrgId || organizations[0]?.id || '';
  const currentOrg =
    organizations.find((o) => o.id === currentOrgId) || organizations[0];

  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [newEventVenue, setNewEventVenue] = useState('');
  const [newEventOrgId, setNewEventOrgId] = useState(currentOrgId);
  // Start new event with its own separate empty sponsor selection so events don't share default selections unless chosen
  const [newEventSponsorIds, setNewEventSponsorIds] = useState<string[]>([]);
  const [newEventParticipantIds, setNewEventParticipantIds] = useState<string[]>([]);
  const quickSponsorUploadRef = useRef<HTMLInputElement>(null);
  const editEventSponsorUploadRef = useRef<HTMLInputElement>(null);

  // Inline Event Editing State
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editEventTitle, setEditEventTitle] = useState('');
  const [editEventDate, setEditEventDate] = useState('');
  const [editEventVenue, setEditEventVenue] = useState('');
  const [editEventDescription, setEditEventDescription] = useState('');
  const [editEventOrgId, setEditEventOrgId] = useState('');
  const [editEventSponsorIds, setEditEventSponsorIds] = useState<string[]>([]);
  const [editEventParticipantIds, setEditEventParticipantIds] = useState<string[]>([]);

  // Organization form
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState('');
  const [orgShortName, setOrgShortName] = useState('');
  const [orgDhivehi, setOrgDhivehi] = useState('');
  const [orgAddress, setOrgAddress] = useState('');
  const [orgPhone, setOrgPhone] = useState('');
  const [orgEmail, setOrgEmail] = useState('');
  const [orgWebsite, setOrgWebsite] = useState('');
  const [orgFacebook, setOrgFacebook] = useState('');
  const [orgInstagram, setOrgInstagram] = useState('');
  const [orgX, setOrgX] = useState('');
  const [orgLogo1, setOrgLogo1] = useState('');
  const [orgLogo2, setOrgLogo2] = useState('');
  const orgLogo1InputRef = useRef<HTMLInputElement>(null);
  const orgLogo2InputRef = useRef<HTMLInputElement>(null);

  // Asset upload
  const [logoName, setLogoName] = useState('');
  const [logoCategory, setLogoCategory] = useState<LogoCategory>('sponsor');
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Font form
  const [fontName, setFontName] = useState('');
  const [fontFamily, setFontFamily] = useState('');
  const [fontRtl, setFontRtl] = useState(true);
  const fontFileInputRef = useRef<HTMLInputElement>(null);

  // Template form
  const [tplName, setTplName] = useState('');
  const [tplDesc, setTplDesc] = useState('');
  const [tplCat, setTplCat] = useState<'banner' | 'color-grade' | 'full-event'>('banner');

  if (!activeModal) return null;

  const handleQuickMultiSponsorUpload = async (
    targetMode: 'create' | 'edit',
    e: React.ChangeEvent<HTMLInputElement>,
    targetEventId?: string
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    e.target.value = '';

    const targetOrgId =
      targetMode === 'create'
        ? newEventOrgId || currentOrgId
        : editEventOrgId || currentOrgId;

    const createdLogos: BrandingLogoAsset[] = await Promise.all(
      fileArray.map(
        (file, index) =>
          new Promise<BrandingLogoAsset>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result as string;
              const img = new Image();
              img.onload = () => {
                const aspect =
                  img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : 2.5;
                const cleanName = file.name.replace(/\.[^/.]+$/, '');
                resolve({
                  id: `logo-spon-${Date.now()}-${index}-${Math.random()
                    .toString(36)
                    .slice(2, 6)}`,
                  name: cleanName,
                  category: 'sponsor',
                  organizationId: targetOrgId,
                  eventId: targetEventId,
                  dataUrl,
                  aspectRatio: Number(aspect.toFixed(2)),
                  createdAt: new Date().toISOString(),
                });
              };
              img.onerror = () => {
                resolve({
                  id: `logo-spon-${Date.now()}-${index}`,
                  name: file.name.replace(/\.[^/.]+$/, ''),
                  category: 'sponsor',
                  organizationId: targetOrgId,
                  eventId: targetEventId,
                  dataUrl,
                  aspectRatio: 2.5,
                  createdAt: new Date().toISOString(),
                });
              };
              img.src = dataUrl;
            };
            reader.readAsDataURL(file);
          })
      )
    );

    const newIds = createdLogos.map((l) => l.id);
    onSaveLogos([...createdLogos, ...logos]);

    if (targetMode === 'create') {
      setNewEventSponsorIds((prev) => Array.from(new Set([...prev, ...newIds])));
    } else {
      setEditEventSponsorIds((prev) => Array.from(new Set([...prev, ...newIds])));
    }
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;
    const targetOrgId = newEventOrgId || currentOrgId || organizations[0]?.id || '';
    const primaryOrg =
      organizations.find((o) => o.id === targetOrgId) || organizations[0];
    const baseTemplate = createBlankEventConfiguration(primaryOrg);
    const newId = `evt-${Date.now()}`;

    // Bind any newly uploaded sponsor logos to this newly created event ID
    if (newEventSponsorIds.length > 0) {
      const updatedLogos = logos.map((l) =>
        newEventSponsorIds.includes(l.id) && !l.eventId
          ? { ...l, eventId: newId, organizationId: primaryOrg?.id || '' }
          : l
      );
      onSaveLogos(updatedLogos);
    }

    const created: EventConfiguration = {
      ...baseTemplate,
      id: newId,
      title: newEventTitle.trim(),
      date: newEventDate || new Date().toISOString().slice(0, 10),
      venue: newEventVenue.trim() || 'Main Convention Hall',
      description: 'Persistent event branding configuration.',
      primaryOrgId: primaryOrg?.id || '',
      coOrganizerIds: [],
      mainLogo1Id: primaryOrg?.mainLogo1Id || '',
      mainLogo2Id: primaryOrg?.mainLogo2Id || '',
      orgNameOverride: primaryOrg?.name || '',
      orgAddressOverride: primaryOrg?.address || '',
      textConfig: {
        ...baseTemplate.textConfig,
        eventTitle: newEventTitle.trim(),
        subtitle: `${(newEventVenue.trim() || 'MALÉ').toUpperCase()} · ${newEventDate}`,
      },
      sponsorsConfig: {
        ...baseTemplate.sponsorsConfig,
        selectedSponsorIds: [...newEventSponsorIds],
        selectedParticipantIds: [...newEventParticipantIds],
      },
      updatedAt: new Date().toISOString(),
    };
    const nextList = [created, ...events];
    if (primaryOrg && onSelectOrgFilter) {
      onSelectOrgFilter(primaryOrg.id);
    }
    onSaveEvents(nextList, created.id);
    setNewEventTitle('');
    setNewEventVenue('');
    setNewEventSponsorIds([]);
    setNewEventParticipantIds([]);
  };

  const handleStartEditingEvent = (evt: EventConfiguration) => {
    setEditingEventId(evt.id);
    setEditEventTitle(evt.title);
    setEditEventDate(evt.date);
    setEditEventVenue(evt.venue);
    setEditEventDescription(evt.description);
    setEditEventOrgId(evt.primaryOrgId);
    setEditEventSponsorIds([...evt.sponsorsConfig.selectedSponsorIds]);
    setEditEventParticipantIds([...evt.sponsorsConfig.selectedParticipantIds]);
  };

  const handleSaveEditedEvent = (e: React.FormEvent, eventId: string) => {
    e.preventDefault();
    if (!editEventTitle.trim()) return;
    const selectedOrg = organizations.find((o) => o.id === editEventOrgId);
    const updatedList = events.map((evt) => {
      if (evt.id !== eventId) return evt;
      const orgChanged = selectedOrg && selectedOrg.id !== evt.primaryOrgId;
      return {
        ...evt,
        title: editEventTitle.trim(),
        date: editEventDate || evt.date,
        venue: editEventVenue.trim() || evt.venue,
        description: editEventDescription.trim(),
        primaryOrgId: selectedOrg ? selectedOrg.id : evt.primaryOrgId,
        mainLogo1Id: orgChanged ? selectedOrg.mainLogo1Id : evt.mainLogo1Id,
        mainLogo2Id: orgChanged ? selectedOrg.mainLogo2Id || '' : evt.mainLogo2Id,
        orgNameOverride: orgChanged ? selectedOrg.name : evt.orgNameOverride,
        orgAddressOverride: orgChanged ? selectedOrg.address : evt.orgAddressOverride,
        textConfig: {
          ...evt.textConfig,
          eventTitle: editEventTitle.trim(),
          subtitle: `${(editEventVenue.trim() || evt.venue || 'MALÉ').toUpperCase()} · ${
            editEventDate || evt.date
          }`,
        },
        sponsorsConfig: {
          ...evt.sponsorsConfig,
          selectedSponsorIds: editEventSponsorIds,
          selectedParticipantIds: editEventParticipantIds,
        },
        updatedAt: new Date().toISOString(),
      };
    });
    onSaveEvents(updatedList);
    setEditingEventId(null);
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
    const filtered = events.filter((e) => e.id !== id);
    const nextActive =
      activeEvent?.id === id ? filtered[0]?.id || '' : activeEvent?.id || '';
    onSaveEvents(filtered, nextActive);
  };

  const handleStartEditOrganization = (org: OrganizationProfile) => {
    setEditingOrgId(org.id);
    setOrgName(org.name);
    setOrgShortName(org.shortName || '');
    setOrgDhivehi(org.nameDhivehi || '');
    setOrgAddress(org.address);
    setOrgPhone(org.phone || '');
    setOrgEmail(org.email || '');
    setOrgWebsite(org.website || '');
    setOrgLogo1(org.mainLogo1Id);
    setOrgLogo2(org.mainLogo2Id || '');
    const fbLink = org.socialLinks?.find((s) => s.platform === 'facebook');
    const igLink = org.socialLinks?.find((s) => s.platform === 'instagram');
    const xLink = org.socialLinks?.find((s) => s.platform === 'x');
    setOrgFacebook(fbLink?.displayName || '');
    setOrgInstagram(igLink?.displayName || '');
    setOrgX(xLink?.displayName || '');
  };

  const handleCreateOrganization = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;

    const socialLinks = [
      orgFacebook.trim()
        ? {
            id: `soc-fb-${Date.now()}`,
            platform: 'facebook' as const,
            displayName: orgFacebook.trim(),
            urlOrContact: orgFacebook.trim(),
            icon: 'FB',
            visible: true,
          }
        : null,
      orgInstagram.trim()
        ? {
            id: `soc-ig-${Date.now()}`,
            platform: 'instagram' as const,
            displayName: orgInstagram.trim(),
            urlOrContact: orgInstagram.trim(),
            icon: 'IG',
            visible: true,
          }
        : null,
      orgX.trim()
        ? {
            id: `soc-x-${Date.now()}`,
            platform: 'x' as const,
            displayName: orgX.trim(),
            urlOrContact: orgX.trim(),
            icon: 'X',
            visible: true,
          }
        : null,
    ].filter((x): x is NonNullable<typeof x> => Boolean(x));

    if (editingOrgId) {
      const updatedOrgs = organizations.map((o) =>
        o.id === editingOrgId
          ? {
              ...o,
              name: orgName.trim(),
              shortName: orgShortName.trim() || undefined,
              nameDhivehi: orgDhivehi.trim() || undefined,
              address: orgAddress.trim() || 'Malé, Republic of Maldives',
              phone: orgPhone.trim() || undefined,
              email: orgEmail.trim() || undefined,
              website: orgWebsite.trim() || undefined,
              socialLinks,
              mainLogo1Id: orgLogo1,
              mainLogo2Id: orgLogo2 || undefined,
              updatedAt: new Date().toISOString(),
            }
          : o
      );
      onSaveOrganizations(updatedOrgs);
      setEditingOrgId(null);
    } else {
      const newOrgId = `org-${Date.now()}`;
      const newOrg: OrganizationProfile = {
        id: newOrgId,
        name: orgName.trim(),
        shortName: orgShortName.trim() || undefined,
        nameDhivehi: orgDhivehi.trim() || undefined,
        address: orgAddress.trim() || 'Malé, Republic of Maldives',
        phone: orgPhone.trim() || undefined,
        email: orgEmail.trim() || undefined,
        website: orgWebsite.trim() || undefined,
        socialLinks,
        mainLogo1Id: orgLogo1,
        mainLogo2Id: orgLogo2 || undefined,
        headerPosition: 'top-right',
        logo1Scale: 100,
        logo2Scale: 95,
        headerPaddingX: 54,
        headerPaddingY: 40,
        headerScrimOpacity: 45,
        preferences: {
          defaultFormat: 'image/jpeg',
          defaultQuality: 0.95,
          autoApplyHeader: true,
        },
        updatedAt: new Date().toISOString(),
      };
      // Bind uploaded logos to this new organization ID
      if (orgLogo1 || orgLogo2) {
        onSaveLogos(
          logos.map((l) =>
            l.id === orgLogo1 || l.id === orgLogo2
              ? { ...l, organizationId: newOrgId }
              : l
          )
        );
      }
      onSaveOrganizations([newOrg, ...organizations]);
      if (onSelectOrgFilter) {
        onSelectOrgFilter(newOrgId);
      }
    }

    setOrgName('');
    setOrgShortName('');
    setOrgDhivehi('');
    setOrgAddress('');
    setOrgPhone('');
    setOrgEmail('');
    setOrgWebsite('');
    setOrgFacebook('');
    setOrgInstagram('');
    setOrgX('');
    setOrgLogo1('');
    setOrgLogo2('');
  };

  const handleOrgMainLogoUpload = (
    slot: 1 | 2,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const aspect = img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : 2.5;
        const cleanFileTitle = file.name.replace(/\.[^/.]+$/, '');
        const newLogo: BrandingLogoAsset = {
          id: `logo-org-${Date.now()}-${slot}`,
          name: orgName.trim()
            ? `${orgName.trim()} (Logo ${slot})`
            : cleanFileTitle,
          category: 'organization',
          organizationId: editingOrgId || currentOrgId || undefined,
          dataUrl,
          aspectRatio: Number(aspect.toFixed(2)),
          createdAt: new Date().toISOString(),
        };
        const updatedLogos = [newLogo, ...logos];
        onSaveLogos(updatedLogos);
        if (slot === 1) {
          setOrgLogo1(newLogo.id);
        } else {
          setOrgLogo2(newLogo.id);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const aspect = img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : 2.5;
        const newLogo: BrandingLogoAsset = {
          id: `logo-${Date.now()}`,
          name: logoName.trim() || file.name.replace(/\.[^/.]+$/, ''),
          category: logoCategory,
          organizationId: currentOrgId || undefined,
          eventId:
            logoCategory === 'sponsor' || logoCategory === 'participant'
              ? activeEvent?.id
              : undefined,
          dataUrl,
          aspectRatio: Number(aspect.toFixed(2)),
          createdAt: new Date().toISOString(),
        };
        onSaveLogos([newLogo, ...logos]);
        setLogoName('');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleFontFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const cleanName = fontName.trim() || file.name.replace(/\.[^/.]+$/, '');
      const customFamilyName = `CustomFont_${Date.now()}`;
      try {
        const fontFace = new FontFace(customFamilyName, `url(${dataUrl})`);
        const loadedFace = await fontFace.load();
        document.fonts.add(loadedFace);
      } catch (err) {
        console.warn('Could not dynamically register FontFace, saving family reference:', err);
      }
      const newFont: CustomFontAsset = {
        id: `font-${Date.now()}`,
        name: cleanName,
        family: `'${customFamilyName}', 'Noto Sans Thaana', sans-serif`,
        isRtlOptimized: fontRtl,
        dataUrl,
        createdAt: new Date().toISOString(),
      };
      onSaveFonts([newFont, ...fonts]);
      setFontName('');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRegisterWebFont = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fontName.trim() || !fontFamily.trim()) return;
    const newFont: CustomFontAsset = {
      id: `font-${Date.now()}`,
      name: fontName.trim(),
      family: fontFamily.trim(),
      isRtlOptimized: fontRtl,
      createdAt: new Date().toISOString(),
    };
    onSaveFonts([newFont, ...fonts]);
    setFontName('');
    setFontFamily('');
  };

  const handleSaveCurrentAsTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplName.trim()) return;
    const newTpl: SavedTemplatePreset = {
      id: `tpl-${Date.now()}`,
      organizationId: currentOrgId || activeEvent?.primaryOrgId || '',
      name: tplName.trim(),
      description: tplDesc.trim() || `Saved from ${activeEvent.title}`,
      category: tplCat,
      footerBanner:
        tplCat === 'banner' || tplCat === 'full-event'
          ? JSON.parse(JSON.stringify(activeEvent.footerBanner))
          : undefined,
      textConfig:
        tplCat === 'banner' || tplCat === 'full-event'
          ? JSON.parse(JSON.stringify(activeEvent.textConfig))
          : undefined,
      photoAdjustments:
        tplCat === 'color-grade' || tplCat === 'full-event'
          ? JSON.parse(JSON.stringify(activeEvent.photoAdjustments))
          : undefined,
      orientationConfig:
        tplCat === 'full-event'
          ? JSON.parse(JSON.stringify(activeEvent.orientationConfig))
          : undefined,
      createdAt: new Date().toISOString(),
    };
    onSaveTemplates([newTpl, ...templates]);
    setTplName('');
    setTplDesc('');
  };

  const modalOrgEvents = currentOrg
    ? events.filter((e) => e.primaryOrgId === currentOrg.id)
    : events;

  const modalScopedLogos = currentOrg
    ? logos.filter(
        (l) =>
          l.organizationId === currentOrg.id ||
          l.id === currentOrg.mainLogo1Id ||
          l.id === currentOrg.mainLogo2Id ||
          modalOrgEvents.some(
            (e) =>
              e.id === l.eventId ||
              e.sponsorsConfig.selectedSponsorIds.includes(l.id) ||
              e.sponsorsConfig.selectedParticipantIds.includes(l.id)
          )
      )
    : logos;

  const modalScopedTemplates = currentOrg
    ? templates.filter((t) => t.organizationId === currentOrg.id)
    : templates;

  const handleApplyTemplate = (tpl: SavedTemplatePreset) => {
    onUpdateActiveEvent((prev) => ({
      ...prev,
      footerBanner: tpl.footerBanner
        ? JSON.parse(JSON.stringify(tpl.footerBanner))
        : prev.footerBanner,
      textConfig: tpl.textConfig
        ? {
            ...prev.textConfig,
            ...JSON.parse(JSON.stringify(tpl.textConfig)),
            // Keep current event title unless empty
            eventTitle: prev.textConfig.eventTitle || tpl.textConfig.eventTitle || prev.title,
          }
        : prev.textConfig,
      photoAdjustments: tpl.photoAdjustments
        ? JSON.parse(JSON.stringify(tpl.photoAdjustments))
        : prev.photoAdjustments,
      orientationConfig: tpl.orientationConfig
        ? JSON.parse(JSON.stringify(tpl.orientationConfig))
        : prev.orientationConfig,
      updatedAt: new Date().toISOString(),
    }));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#111726] border border-slate-800 rounded-xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            {activeModal === 'events' && <FolderKanban className="w-5 h-5 text-blue-400" />}
            {activeModal === 'organizations' && <Building2 className="w-5 h-5 text-blue-400" />}
            {activeModal === 'assets' && <ImageIcon className="w-5 h-5 text-blue-400" />}
            {activeModal === 'templates' && <Layers className="w-5 h-5 text-blue-400" />}
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">
                {activeModal === 'events' && 'Organization Event Configurations'}
                {activeModal === 'organizations' && 'My Organizations'}
                {activeModal === 'assets' && (isSuper ? 'Organization Logos & Custom Fonts' : 'Organization Logos')}
                {activeModal === 'templates' && 'Organization Banner & Lightroom Setups'}
              </h2>
              {currentOrg && activeModal !== 'organizations' && (
                <div className="text-[11px] text-blue-400">
                  Scoped to Organization: <span className="font-semibold text-white">{currentOrg.name}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {organizations.length > 1 && activeModal !== 'organizations' && onSelectOrgFilter && (
              <select
                value={currentOrg?.id || ''}
                onChange={(e) => {
                  const nextOrgId = e.target.value;
                  onSelectOrgFilter(nextOrgId);
                  setNewEventOrgId(nextOrgId);
                }}
                className="px-2.5 py-1.5 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Close (ESC)
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* 1. EVENTS MODAL */}
          {activeModal === 'events' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-3">
                <div className="text-xs font-medium text-slate-400">
                  Events for {currentOrg ? currentOrg.name : 'Selected Organization'} ({modalOrgEvents.length})
                </div>
                {modalOrgEvents.length === 0 ? (
                  <div className="p-6 rounded-lg bg-[#0B0F17] border border-dashed border-slate-800 text-center space-y-1.5">
                    <div className="text-xs font-semibold text-slate-300">
                      No events in {currentOrg ? `"${currentOrg.name}"` : 'this organization'} yet
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Use the form on the right to create an isolated event for this organization.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {modalOrgEvents.map((evt) => {
                      const isSelected = evt.id === activeEvent?.id;
                      const isEditing = editingEventId === evt.id;
                      const primaryOrg = organizations.find((o) => o.id === evt.primaryOrgId);
                      const eventScopedSponsorLogos = logos.filter(
                        (l) =>
                          l.category === 'sponsor' &&
                          (!l.organizationId || l.organizationId === (editEventOrgId || evt.primaryOrgId)) &&
                          (!l.eventId ||
                            l.eventId === evt.id ||
                            editEventSponsorIds.includes(l.id))
                      );
                      return (
                        <div
                          key={evt.id}
                          className={`p-4 rounded-lg border transition-colors ${
                            isSelected
                              ? 'bg-blue-950/30 border-blue-500/60'
                              : 'bg-[#0B0F17] border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {isEditing ? (
                            <form
                              onSubmit={(e) => handleSaveEditedEvent(e, evt.id)}
                              className="space-y-3"
                            >
                              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                <span className="text-xs font-semibold text-blue-400">
                                  Editing Event Details
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setEditingEventId(null)}
                                  className="text-xs text-slate-400 hover:text-white"
                                >
                                  Cancel
                                </button>
                              </div>
                              <div>
                                <label className="block text-[11px] text-slate-400 mb-1">
                                  Event Title (Dhivehi RTL or English)
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={editEventTitle}
                                  onChange={(e) => setEditEventTitle(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs bg-[#111726] border border-slate-700 rounded-md text-white font-thaana focus:outline-none focus:border-blue-500"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                  <label className="block text-[11px] text-slate-400 mb-1">
                                    Event Date
                                  </label>
                                  <input
                                    type="date"
                                    required
                                    value={editEventDate}
                                    onChange={(e) => setEditEventDate(e.target.value)}
                                    className="w-full px-2.5 py-1.5 text-xs bg-[#111726] border border-slate-700 rounded-md text-white tabular-nums focus:outline-none focus:border-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] text-slate-400 mb-1">
                                    Venue
                                  </label>
                                  <input
                                    type="text"
                                    value={editEventVenue}
                                    onChange={(e) => setEditEventVenue(e.target.value)}
                                    className="w-full px-2.5 py-1.5 text-xs bg-[#111726] border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div>
                                  <label className="block text-[11px] text-slate-400 mb-1">
                                    Primary Organization
                                  </label>
                                  <select
                                    value={editEventOrgId}
                                    onChange={(e) => setEditEventOrgId(e.target.value)}
                                    className="w-full px-2.5 py-1.5 text-xs bg-[#111726] border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500"
                                  >
                                    {organizations.map((org) => (
                                      <option key={org.id} value={org.id}>
                                        {org.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[11px] text-slate-400 mb-1">
                                    Description
                                  </label>
                                  <input
                                    type="text"
                                    value={editEventDescription}
                                    onChange={(e) => setEditEventDescription(e.target.value)}
                                    placeholder="Event notes or summary"
                                    className="w-full px-2.5 py-1.5 text-xs bg-[#111726] border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500"
                                  />
                                </div>
                              </div>

                              {/* Multi-Select Sponsors for Edited Event */}
                              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                                <div className="flex items-center justify-between">
                                  <label className="text-[11px] font-medium text-slate-300">
                                    Sponsors for "{evt.title}" ({editEventSponsorIds.length} Selected)
                                  </label>
                                  <div className="flex items-center gap-2 text-[11px]">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEditEventSponsorIds(
                                          eventScopedSponsorLogos.map((l) => l.id)
                                        )
                                      }
                                      className="text-blue-400 hover:text-blue-300"
                                    >
                                      Select All
                                    </button>
                                    <span className="text-slate-600">·</span>
                                    <button
                                      type="button"
                                      onClick={() => setEditEventSponsorIds([])}
                                      className="text-slate-400 hover:text-white"
                                    >
                                      Clear
                                    </button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1">
                                  {eventScopedSponsorLogos.map((logo) => {
                                    const isChecked = editEventSponsorIds.includes(logo.id);
                                    return (
                                      <label
                                        key={logo.id}
                                        className={`p-2 rounded-md border flex items-center gap-2 cursor-pointer transition-colors ${
                                          isChecked
                                            ? 'bg-blue-950/40 border-blue-500/60 text-white'
                                            : 'bg-[#111726] border-slate-800 text-slate-400 hover:border-slate-700'
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() =>
                                            setEditEventSponsorIds((prev) =>
                                              prev.includes(logo.id)
                                                ? prev.filter((id) => id !== logo.id)
                                                : [...prev, logo.id]
                                            )
                                          }
                                          className="rounded border-slate-700 shrink-0"
                                        />
                                        <img
                                          src={logo.dataUrl}
                                          alt={logo.name}
                                          referrerPolicy="no-referrer"
                                          className="h-5 w-9 object-contain bg-slate-900 rounded px-0.5 shrink-0"
                                        />
                                        <span className="text-[11px] truncate">{logo.name}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                                <input
                                  ref={editEventSponsorUploadRef}
                                  type="file"
                                  multiple
                                  accept="image/png,image/svg+xml,image/webp,image/jpeg"
                                  onChange={(e) =>
                                    handleQuickMultiSponsorUpload('edit', e, evt.id)
                                  }
                                  className="hidden"
                                />
                                <button
                                  type="button"
                                  onClick={() => editEventSponsorUploadRef.current?.click()}
                                  className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5"
                                >
                                  <Upload className="w-3.5 h-3.5 text-blue-400" />
                                  <span>Upload Sponsor Logos for This Event</span>
                                </button>
                              </div>

                              <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingEventId(null)}
                                  className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-md flex items-center gap-1.5"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Save Changes</span>
                                </button>
                              </div>
                            </form>
                          ) : (
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="text-sm font-semibold text-white font-thaana">
                                    {evt.title}
                                  </h3>
                                </div>
                                <div className="text-xs text-slate-400 flex items-center gap-2">
                                  <span className="tabular-nums">{evt.date}</span>
                                  <span>·</span>
                                  <span>{evt.venue}</span>
                                  {primaryOrg && (
                                    <>
                                      <span>·</span>
                                      <span className="text-slate-300">{primaryOrg.name}</span>
                                    </>
                                  )}
                                </div>
                                {evt.description && (
                                  <div className="text-xs text-slate-400 line-clamp-1">
                                    {evt.description}
                                  </div>
                                )}
                                <div className="text-[11px] text-slate-500">
                                  {evt.sponsorsConfig.selectedSponsorIds.length} Sponsors ·{' '}
                                  {evt.sponsorsConfig.selectedParticipantIds.length} Participants ·{' '}
                                  {evt.footerBanner.gradientStops.length} Gradient Stops
                                </div>
                                {evt.sponsorsConfig.selectedSponsorIds.length > 0 && (
                                  <div className="flex items-center flex-wrap gap-1.5 pt-1">
                                    {evt.sponsorsConfig.selectedSponsorIds.map((sId) => {
                                      const sLogo = logos.find((l) => l.id === sId);
                                      if (!sLogo) return null;
                                      return (
                                        <img
                                          key={sId}
                                          src={sLogo.dataUrl}
                                          alt={sLogo.name}
                                          title={sLogo.name}
                                          referrerPolicy="no-referrer"
                                          className="h-5 w-10 object-contain bg-slate-900/90 border border-slate-800 rounded px-1"
                                        />
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => {
                                    onSelectEvent(evt.id);
                                    onClose();
                                  }}
                                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                                    isSelected
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                                  }`}
                                >
                                  {isSelected ? 'Active Event' : 'Load Event'}
                                </button>
                                <button
                                  onClick={() => handleStartEditingEvent(evt)}
                                  title="Edit Event Details"
                                  className="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-md flex items-center gap-1 whitespace-nowrap"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-blue-400" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => handleDuplicateEvent(evt)}
                                  title="Duplicate Event Configuration"
                                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700 rounded-md"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteEvent(evt.id)}
                                  title="Delete Event"
                                  className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-800/60 hover:bg-slate-700 rounded-md"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <form
                onSubmit={handleCreateEvent}
                className="lg:col-span-5 bg-[#0B0F17] border border-slate-800 rounded-lg p-5 space-y-4 self-start"
              >
                <h3 className="text-sm font-semibold text-white">Create New Event</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Event Title (Dhivehi RTL or English)
                    </label>
                    <input
                      type="text"
                      required
                      value={newEventTitle}
                      onChange={(e) => setNewEventTitle(e.target.value)}
                      placeholder="e.g., މޯލްޑިވްސް ޓޫރިޒަމް އެވޯޑްސް 2026"
                      className="w-full px-3 py-2 text-sm bg-[#111726] border border-slate-700 rounded-md text-white font-thaana focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Event Date</label>
                      <input
                        type="date"
                        required
                        value={newEventDate}
                        onChange={(e) => setNewEventDate(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-[#111726] border border-slate-700 rounded-md text-white tabular-nums focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Venue</label>
                      <input
                        type="text"
                        value={newEventVenue}
                        onChange={(e) => setNewEventVenue(e.target.value)}
                        placeholder="Dharubaaruge, Malé"
                        className="w-full px-3 py-2 text-sm bg-[#111726] border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Primary Organization</label>
                    <select
                      value={newEventOrgId || currentOrg?.id || ''}
                      onChange={(e) => setNewEventOrgId(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#111726] border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500"
                    >
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Multi-Selection Sponsors for New Event */}
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs text-slate-300 font-medium">
                        Select Event Sponsors ({newEventSponsorIds.length} Selected)
                      </label>
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() =>
                            setNewEventSponsorIds(
                              logos
                                .filter(
                                  (l) =>
                                    l.category === 'sponsor' &&
                                    (!l.organizationId ||
                                      l.organizationId === (newEventOrgId || currentOrg?.id)) &&
                                    !l.eventId
                                )
                                .map((l) => l.id)
                            )
                          }
                          className="text-blue-400 hover:text-blue-300"
                        >
                          Select All
                        </button>
                        <span className="text-slate-600">·</span>
                        <button
                          type="button"
                          onClick={() => setNewEventSponsorIds([])}
                          className="text-slate-400 hover:text-white"
                        >
                          None
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
                      {logos
                        .filter(
                          (l) =>
                            l.category === 'sponsor' &&
                            (!l.organizationId ||
                              l.organizationId === (newEventOrgId || currentOrg?.id)) &&
                            (!l.eventId || newEventSponsorIds.includes(l.id))
                        )
                        .map((logo) => {
                          const isChecked = newEventSponsorIds.includes(logo.id);
                          return (
                            <label
                              key={logo.id}
                              className={`p-2 rounded-md border flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                                isChecked
                                  ? 'bg-blue-950/35 border-blue-500/60 text-white'
                                  : 'bg-[#111726] border-slate-800 text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() =>
                                    setNewEventSponsorIds((prev) =>
                                      prev.includes(logo.id)
                                        ? prev.filter((id) => id !== logo.id)
                                        : [...prev, logo.id]
                                    )
                                  }
                                  className="rounded border-slate-700 shrink-0"
                                />
                                <img
                                  src={logo.dataUrl}
                                  alt={logo.name}
                                  referrerPolicy="no-referrer"
                                  className="h-5 w-10 object-contain bg-slate-900 rounded px-1 shrink-0"
                                />
                                <span className="text-xs truncate">{logo.name}</span>
                              </div>
                              <span className="text-[10px] text-slate-500 capitalize shrink-0">
                                {logo.category}
                              </span>
                            </label>
                          );
                        })}
                    </div>

                    <input
                      ref={quickSponsorUploadRef}
                      type="file"
                      multiple
                      accept="image/png,image/svg+xml,image/webp,image/jpeg"
                      onChange={(e) => handleQuickMultiSponsorUpload('create', e)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => quickSponsorUploadRef.current?.click()}
                      className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5 text-blue-400" />
                      <span>Upload & Select Multiple Sponsor Logos</span>
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create & Switch to Event
                </button>
              </form>
            </div>
          )}

          {/* 2. ORGANIZATIONS MODAL */}
          {activeModal === 'organizations' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-3">
                <div className="text-xs font-medium text-slate-400">
                  My Organizations ({organizations.length})
                </div>
                {organizations.length === 0 ? (
                  <div className="p-6 rounded-lg bg-[#0B0F17] border border-dashed border-slate-800 text-center space-y-1.5">
                    <div className="text-xs font-semibold text-slate-300">
                      No organizations created yet
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Create your organization profile using the form on the right.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {organizations.map((org) => {
                      const l1 = logos.find((l) => l.id === org.mainLogo1Id);
                      const l2 = logos.find((l) => l.id === org.mainLogo2Id);
                      const isCurrentOrg = currentOrg?.id === org.id;
                      return (
                        <div
                          key={org.id}
                          className="p-4 rounded-lg bg-[#0B0F17] border border-slate-800 flex items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="text-sm font-semibold text-white">{org.name}</div>
                            {org.nameDhivehi && (
                              <div className="text-xs text-blue-400 font-thaana">{org.nameDhivehi}</div>
                            )}
                            <div className="text-xs text-slate-400">{org.address}</div>
                            {(org.phone || org.email || org.website) && (
                              <div className="text-[11px] text-slate-500 flex items-center flex-wrap gap-2">
                                {org.phone && <span>{org.phone}</span>}
                                {org.email && <span>· {org.email}</span>}
                                {org.website && <span>· {org.website}</span>}
                              </div>
                            )}
                            {org.socialLinks && org.socialLinks.length > 0 && (
                              <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
                                {org.socialLinks.map((soc) => (
                                  <span
                                    key={soc.id}
                                    className="px-1.5 py-0.5 text-[10px] bg-slate-900 border border-slate-800 rounded text-slate-300"
                                  >
                                    {soc.platform.toUpperCase()}: {soc.displayName}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-3 pt-1">
                              {l1 && (
                                <img
                                  src={l1.dataUrl}
                                  alt={l1.name}
                                  referrerPolicy="no-referrer"
                                  className="h-6 object-contain bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800"
                                />
                              )}
                              {l2 && (
                                <img
                                  src={l2.dataUrl}
                                  alt={l2.name}
                                  referrerPolicy="no-referrer"
                                  className="h-6 object-contain bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800"
                                />
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => {
                                if (onSelectOrgFilter) {
                                  onSelectOrgFilter(org.id);
                                }
                                const orgEvents = events.filter((e) => e.primaryOrgId === org.id);
                                if (orgEvents.length > 0) {
                                  onSelectEvent(orgEvents[0].id);
                                } else {
                                  onUpdateActiveEvent((prev) => ({
                                    ...prev,
                                    primaryOrgId: org.id,
                                    mainLogo1Id: org.mainLogo1Id,
                                    mainLogo2Id: org.mainLogo2Id || '',
                                    orgNameOverride: org.name,
                                    orgAddressOverride: org.address,
                                    updatedAt: new Date().toISOString(),
                                  }));
                                }
                                onClose();
                              }}
                              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                                isCurrentOrg
                                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-blue-600 text-white hover:bg-blue-500'
                              }`}
                            >
                              {isCurrentOrg ? 'Active Org' : 'Switch Org'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStartEditOrganization(org)}
                              className="p-1.5 text-slate-300 hover:text-white bg-slate-800 rounded-md"
                              title="Edit Organization"
                            >
                              <Pencil className="w-3.5 h-3.5 text-blue-400" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onSaveOrganizations(organizations.filter((item) => item.id !== org.id))
                              }
                              className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-800 rounded-md"
                              title="Delete Organization"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <form
                onSubmit={handleCreateOrganization}
                className="lg:col-span-5 bg-[#0B0F17] border border-slate-800 rounded-lg p-5 space-y-4 self-start"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">
                    {editingOrgId ? 'Edit Organization Profile' : 'Add Organization Profile'}
                  </h3>
                  {editingOrgId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingOrgId(null);
                        setOrgName('');
                        setOrgShortName('');
                        setOrgDhivehi('');
                        setOrgAddress('');
                      }}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-xs text-slate-400 mb-1">Organization Name</label>
                      <input
                        type="text"
                        required
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="e.g., Maldives National Chamber"
                        className="w-full px-3 py-1.5 text-xs bg-[#111726] border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Short Name</label>
                      <input
                        type="text"
                        value={orgShortName}
                        onChange={(e) => setOrgShortName(e.target.value)}
                        placeholder="MNCC"
                        className="w-full px-2.5 py-1.5 text-xs bg-[#111726] border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Dhivehi Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={orgDhivehi}
                      onChange={(e) => setOrgDhivehi(e.target.value)}
                      placeholder="ދިވެހި ނަން"
                      className="w-full px-3 py-1.5 text-xs bg-[#111726] border border-slate-700 rounded-md text-white font-thaana focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Address / Subtitle</label>
                    <input
                      type="text"
                      value={orgAddress}
                      onChange={(e) => setOrgAddress(e.target.value)}
                      placeholder="Boduthakurufaanu Magu, Malé"
                      className="w-full px-3 py-1.5 text-xs bg-[#111726] border border-slate-700 rounded-md text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Phone</label>
                      <input
                        type="text"
                        value={orgPhone}
                        onChange={(e) => setOrgPhone(e.target.value)}
                        placeholder="+960 332..."
                        className="w-full px-2 py-1 text-xs bg-[#111726] border border-slate-700 rounded-md text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Email</label>
                      <input
                        type="text"
                        value={orgEmail}
                        onChange={(e) => setOrgEmail(e.target.value)}
                        placeholder="info@org.mv"
                        className="w-full px-2 py-1 text-xs bg-[#111726] border border-slate-700 rounded-md text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Website</label>
                      <input
                        type="text"
                        value={orgWebsite}
                        onChange={(e) => setOrgWebsite(e.target.value)}
                        placeholder="org.mv"
                        className="w-full px-2 py-1 text-xs bg-[#111726] border border-slate-700 rounded-md text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Facebook</label>
                      <input
                        type="text"
                        value={orgFacebook}
                        onChange={(e) => setOrgFacebook(e.target.value)}
                        placeholder="@page"
                        className="w-full px-2 py-1 text-xs bg-[#111726] border border-slate-700 rounded-md text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Instagram</label>
                      <input
                        type="text"
                        value={orgInstagram}
                        onChange={(e) => setOrgInstagram(e.target.value)}
                        placeholder="@handle"
                        className="w-full px-2 py-1 text-xs bg-[#111726] border border-slate-700 rounded-md text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">X / Twitter</label>
                      <input
                        type="text"
                        value={orgX}
                        onChange={(e) => setOrgX(e.target.value)}
                        placeholder="@handle"
                        className="w-full px-2 py-1 text-xs bg-[#111726] border border-slate-700 rounded-md text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="block text-xs text-slate-400 mb-1">Main Logo 1</label>
                      {logos.find((l) => l.id === orgLogo1) ? (
                        <div className="h-12 bg-[#111726] border border-slate-700/80 rounded-md p-1.5 flex items-center justify-center">
                          <img
                            src={logos.find((l) => l.id === orgLogo1)?.dataUrl}
                            alt="Main Logo 1"
                            referrerPolicy="no-referrer"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="h-12 bg-[#111726]/50 border border-dashed border-slate-800 rounded-md p-1.5 flex items-center justify-center text-[11px] text-slate-500">
                          No Logo 1 Uploaded
                        </div>
                      )}
                      <input
                        ref={orgLogo1InputRef}
                        type="file"
                        accept="image/png,image/svg+xml,image/webp,image/jpeg"
                        onChange={(e) => handleOrgMainLogoUpload(1, e)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => orgLogo1InputRef.current?.click()}
                        className="w-full py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                      >
                        <Upload className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>Upload Logo 1</span>
                      </button>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs text-slate-400 mb-1">Main Logo 2</label>
                      {logos.find((l) => l.id === orgLogo2) ? (
                        <div className="h-12 bg-[#111726] border border-slate-700/80 rounded-md p-1.5 flex items-center justify-center">
                          <img
                            src={logos.find((l) => l.id === orgLogo2)?.dataUrl}
                            alt="Main Logo 2"
                            referrerPolicy="no-referrer"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="h-12 bg-[#111726]/50 border border-dashed border-slate-800 rounded-md p-1.5 flex items-center justify-center text-[11px] text-slate-500">
                          No Logo 2 Uploaded
                        </div>
                      )}
                      <input
                        ref={orgLogo2InputRef}
                        type="file"
                        accept="image/png,image/svg+xml,image/webp,image/jpeg"
                        onChange={(e) => handleOrgMainLogoUpload(2, e)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => orgLogo2InputRef.current?.click()}
                        className="w-full py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                      >
                        <Upload className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>Upload Logo 2</span>
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-md transition-colors"
                >
                  Save Organization Permanently
                </button>
              </form>
            </div>
          )}

          {/* 3. REUSABLE LOGOS & FONTS MODAL */}
          {activeModal === 'assets' && (
            <div className="space-y-8">
              {/* Logos Section */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-3">
                  <div className="text-xs font-medium text-slate-400">
                    Logos for {currentOrg ? currentOrg.name : 'Selected Organization'} ({modalScopedLogos.length})
                  </div>
                  {modalScopedLogos.length === 0 ? (
                    <div className="p-6 rounded-lg bg-[#0B0F17] border border-dashed border-slate-800 text-center space-y-1.5">
                      <div className="text-xs font-semibold text-slate-300">
                        No logos uploaded for {currentOrg ? `"${currentOrg.name}"` : 'this organization'} yet
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Upload organization, sponsor, or participant logos using the panel on the right.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {modalScopedLogos.map((logo) => (
                        <div
                          key={logo.id}
                          className="p-3 rounded-lg bg-[#0B0F17] border border-slate-800 flex flex-col justify-between gap-2"
                        >
                          <div className="h-14 bg-slate-900/90 rounded flex items-center justify-center p-2 border border-slate-800/60">
                            <img
                              src={logo.dataUrl}
                              alt={logo.name}
                              referrerPolicy="no-referrer"
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="truncate">
                              <div className="text-xs font-medium text-white truncate">
                                {logo.name}
                              </div>
                              <div className="text-[11px] text-slate-400 capitalize">
                                {logo.category}
                              </div>
                            </div>
                            <button
                              onClick={() => onSaveLogos(logos.filter((l) => l.id !== logo.id))}
                              className="p-1 text-slate-500 hover:text-rose-400"
                              title="Remove Logo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="lg:col-span-4 bg-[#0B0F17] border border-slate-800 rounded-lg p-5 space-y-4 self-start">
                  <h3 className="text-sm font-semibold text-white">Upload Organization Logo</h3>
                  <p className="text-xs text-slate-400">
                    Uploaded logos are scoped to{' '}
                    <span className="text-white font-medium">
                      {currentOrg ? currentOrg.name : 'your active organization'}
                    </span>
                    .
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Logo Label</label>
                      <input
                        type="text"
                        value={logoName}
                        onChange={(e) => setLogoName(e.target.value)}
                        placeholder="e.g., Official Telecom Partner"
                        className="w-full px-3 py-2 text-xs bg-[#111726] border border-slate-700 rounded-md text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Category</label>
                      <select
                        value={logoCategory}
                        onChange={(e) => setLogoCategory(e.target.value as LogoCategory)}
                        className="w-full px-3 py-2 text-xs bg-[#111726] border border-slate-700 rounded-md text-white"
                      >
                        <option value="organization">Organization Main Logo</option>
                        <option value="sponsor">Sponsor Logo</option>
                        <option value="participant">Participant / Co-Org Logo</option>
                      </select>
                    </div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/svg+xml,image/webp,image/jpeg"
                      onChange={handleLogoFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Select PNG / SVG Logo File
                    </button>
                  </div>
                </div>
              </div>

              {/* Custom Fonts Section (Super Admin Only) */}
              {isSuper && (
                <div className="pt-6 border-t border-slate-800 grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-8 space-y-3">
                    <div className="text-xs font-medium text-slate-400 flex items-center gap-2">
                      <Type className="w-3.5 h-3.5 text-blue-400" />
                      <span>Persistent Typography & Dhivehi Thaana Fonts ({fonts.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {fonts.map((f) => (
                        <div
                          key={f.id}
                          className="p-3.5 rounded-lg bg-[#0B0F17] border border-slate-800 flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="text-xs font-semibold text-white">{f.name}</div>
                            <div
                              className="text-sm text-slate-300 mt-1"
                              style={{ fontFamily: f.family }}
                            >
                              މޯލްޑިވްސް އިވެންޓްސް · Event Studio 2026
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              onUpdateActiveEvent((prev) => ({
                                ...prev,
                                textConfig: {
                                  ...prev.textConfig,
                                  fontFamily: f.family,
                                },
                                updatedAt: new Date().toISOString(),
                              }));
                              onClose();
                            }}
                            className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded whitespace-nowrap"
                          >
                            Use Font
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-4 bg-[#0B0F17] border border-slate-800 rounded-lg p-5 space-y-4 self-start">
                    <h3 className="text-sm font-semibold text-white">Add Custom / Dhivehi Font</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Font Display Name</label>
                        <input
                          type="text"
                          value={fontName}
                          onChange={(e) => setFontName(e.target.value)}
                          placeholder="e.g., MV Faseyha / Faruma"
                          className="w-full px-3 py-2 text-xs bg-[#111726] border border-slate-700 rounded-md text-white"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={fontRtl}
                          onChange={(e) => setFontRtl(e.target.checked)}
                          className="rounded border-slate-700"
                        />
                        <span>Optimized for Dhivehi RTL Typography</span>
                      </label>
                      <input
                        ref={fontFileInputRef}
                        type="file"
                        accept=".ttf,.otf,.woff,.woff2"
                        onChange={handleFontFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fontFileInputRef.current?.click()}
                        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Upload .TTF / .WOFF2 Font File
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. TEMPLATES & PRESETS MODAL */}
          {activeModal === 'templates' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-3">
                <div className="text-xs font-medium text-slate-400">
                  Saved Setups & Presets for {currentOrg ? currentOrg.name : 'Selected Organization'} ({modalScopedTemplates.length})
                </div>
                {modalScopedTemplates.length === 0 ? (
                  <div className="p-6 rounded-lg bg-[#0B0F17] border border-dashed border-slate-800 text-center space-y-1.5">
                    <div className="text-xs font-semibold text-slate-300">
                      No saved setups for {currentOrg ? `"${currentOrg.name}"` : 'this organization'} yet
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Save your current banner, gradient, or color grading setup on the right.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {modalScopedTemplates.map((tpl) => (
                      <div
                        key={tpl.id}
                        className="p-4 rounded-lg bg-[#0B0F17] border border-slate-800 flex items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-white">{tpl.name}</div>
                          <div className="text-xs text-slate-400">{tpl.description}</div>
                          <div className="text-[11px] text-blue-400 uppercase tracking-wider">
                            Preset Type: {tpl.category}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleApplyTemplate(tpl)}
                            className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-md whitespace-nowrap"
                          >
                            Apply Setup
                          </button>
                          <button
                            onClick={() =>
                              onSaveTemplates(templates.filter((t) => t.id !== tpl.id))
                            }
                            className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-800/60 rounded-md"
                            title="Delete Setup"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <form
                onSubmit={handleSaveCurrentAsTemplate}
                className="lg:col-span-5 bg-[#0B0F17] border border-slate-800 rounded-lg p-5 space-y-4 self-start"
              >
                <h3 className="text-sm font-semibold text-white">
                  Save Current Event Design as Preset
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Preset Name</label>
                    <input
                      type="text"
                      required
                      value={tplName}
                      onChange={(e) => setTplName(e.target.value)}
                      placeholder="e.g., Blue Gala Gradient + RTL Title"
                      className="w-full px-3 py-2 text-xs bg-[#111726] border border-slate-700 rounded-md text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Description</label>
                    <input
                      type="text"
                      value={tplDesc}
                      onChange={(e) => setTplDesc(e.target.value)}
                      placeholder="Notes on banner height, gradient stops, or color look"
                      className="w-full px-3 py-2 text-xs bg-[#111726] border border-slate-700 rounded-md text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Preset Scope</label>
                    <select
                      value={tplCat}
                      onChange={(e) => setTplCat(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs bg-[#111726] border border-slate-700 rounded-md text-white"
                    >
                      <option value="banner">Footer Banner + Gradient + Typography</option>
                      <option value="color-grade">Lightroom Color & Tone Adjustments</option>
                      <option value="full-event">Complete Event Design & Orientation Rules</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-md transition-colors"
                >
                  Save Preset Permanently
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
