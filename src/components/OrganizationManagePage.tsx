import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  Calendar,
  Check,
  Copy,
  Edit3,
  FolderKanban,
  Globe,
  Mail,
  MapPin,
  Phone,
  Plus,
  Sliders,
  Trash2,
  Type,
  Upload,
  X,
} from 'lucide-react';
import {
  BrandingLogoAsset,
  CustomFontAsset,
  EventConfiguration,
  OrganizationProfile,
  SocialMediaRecord,
} from '../types/studio';
import { optimizeLogoDataUrl } from '../services/indexedDbStore';

interface OrganizationManagePageProps {
  organizations: OrganizationProfile[];
  events: EventConfiguration[];
  logos: BrandingLogoAsset[];
  fonts?: CustomFontAsset[];
  activeOrgId: string;
  onSelectOrg: (orgId: string) => void;
  onSaveOrganizations: (nextOrgs: OrganizationProfile[]) => void;
  onSaveLogos: (nextLogos: BrandingLogoAsset[]) => void;
  onNavigateToEvents: (orgId: string) => void;
  onNavigateToEditor?: (orgId: string) => void;
}

export const OrganizationManagePage: React.FC<OrganizationManagePageProps> = ({
  organizations,
  events,
  logos,
  fonts = [],
  activeOrgId,
  onSelectOrg,
  onSaveOrganizations,
  onSaveLogos,
  onNavigateToEvents,
  onNavigateToEditor,
}) => {
  const currentOrg =
    organizations.find((o) => o.id === activeOrgId) || organizations[0] || null;

  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form state
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
  const [headerPosition, setHeaderPosition] = useState<OrganizationProfile['headerPosition']>('top-right');
  const [headerDisplayMode, setHeaderDisplayMode] = useState<OrganizationProfile['headerDisplayMode']>('both-logos');
  const [logo1Scale, setLogo1Scale] = useState(100);
  const [logo2Scale, setLogo2Scale] = useState(95);
  const [headerLogoGap, setHeaderLogoGap] = useState(14);
  const [headerFontFamily, setHeaderFontFamily] = useState(
    "'Mv_Eamaan_XP', 'Faruma', 'Noto Sans Thaana', sans-serif"
  );
  const [headerTextColor, setHeaderTextColor] = useState('#FFFFFF');
  const [headerTextSize, setHeaderTextSize] = useState(24);
  const [headerTextWeight, setHeaderTextWeight] = useState<'400' | '500' | '600' | '700' | '800'>('700');
  const [headerAddressSize, setHeaderAddressSize] = useState(15);
  const [headerAddressColor, setHeaderAddressColor] = useState('rgba(226, 232, 240, 0.92)');
  const [primaryColor, setPrimaryColor] = useState('#0D2B4E');
  const [secondaryColor, setSecondaryColor] = useState('#041020');

  const logo1InputRef = useRef<HTMLInputElement>(null);
  const logo2InputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setEditingOrgId(null);
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
    setHeaderPosition('top-right');
    setHeaderDisplayMode('both-logos');
    setLogo1Scale(100);
    setLogo2Scale(95);
    setHeaderLogoGap(14);
    setHeaderFontFamily("'Mv_Eamaan_XP', 'Faruma', 'Noto Sans Thaana', sans-serif");
    setHeaderTextColor('#FFFFFF');
    setHeaderTextSize(24);
    setHeaderTextWeight('700');
    setHeaderAddressSize(15);
    setHeaderAddressColor('rgba(226, 232, 240, 0.92)');
    setPrimaryColor('#0D2B4E');
    setSecondaryColor('#041020');
  };

  const handleStartEditOrg = (org: OrganizationProfile) => {
    setEditingOrgId(org.id);
    setOrgName(org.name);
    setOrgShortName(org.shortName || '');
    setOrgDhivehi(org.nameDhivehi || '');
    setOrgAddress(org.address);
    setOrgPhone(org.phone || '');
    setOrgEmail(org.email || '');
    setOrgWebsite(org.website || '');
    const fb = org.socialLinks?.find((s) => s.platform === 'facebook');
    const ig = org.socialLinks?.find((s) => s.platform === 'instagram');
    const xLink = org.socialLinks?.find((s) => s.platform === 'x');
    setOrgFacebook(fb?.displayName || '');
    setOrgInstagram(ig?.displayName || '');
    setOrgX(xLink?.displayName || '');
    setOrgLogo1(org.mainLogo1Id || '');
    setOrgLogo2(org.mainLogo2Id || '');
    setHeaderPosition(org.headerPosition || 'top-right');
    setHeaderDisplayMode(org.headerDisplayMode || 'both-logos');
    setLogo1Scale(org.logo1Scale ?? 100);
    setLogo2Scale(org.logo2Scale ?? 95);
    setHeaderLogoGap(org.headerLogoGap ?? 14);
    setHeaderFontFamily(
      org.headerFontFamily || "'Mv_Eamaan_XP', 'Faruma', 'Noto Sans Thaana', sans-serif"
    );
    setHeaderTextColor(org.headerTextColor || '#FFFFFF');
    setHeaderTextSize(org.headerTextSize || 24);
    setHeaderTextWeight(org.headerTextWeight || '700');
    setHeaderAddressSize(org.headerAddressSize || 15);
    setHeaderAddressColor(org.headerAddressColor || 'rgba(226, 232, 240, 0.92)');
    setPrimaryColor(org.primaryColor || '#0D2B4E');
    setSecondaryColor(org.secondaryColor || '#041020');
  };

  // Automatically load current organization into form on mount or when active org changes
  // so data is NEVER auto-reset, keeping data permanent until explicitly deleted or changed
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (!hasInitializedRef.current && currentOrg) {
      handleStartEditOrg(currentOrg);
      hasInitializedRef.current = true;
    }
  }, [currentOrg]);

  useEffect(() => {
    if (currentOrg && (!editingOrgId || editingOrgId === currentOrg.id)) {
      handleStartEditOrg(currentOrg);
    }
  }, [currentOrg?.id]);

  const handleOrgLogoUpload = (slot: 1 | 2, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const cleanFileTitle = file.name.replace(/\.[^/.]+$/, '');
    const reader = new FileReader();
    reader.onload = async () => {
      const rawDataUrl = reader.result as string;
      const dataUrl = await optimizeLogoDataUrl(rawDataUrl);
      const img = new Image();
      img.onload = () => {
        const aspect = img.naturalWidth / Math.max(1, img.naturalHeight);
        const createdLogo: BrandingLogoAsset = {
          id: `logo-org-${Date.now()}-${slot}`,
          name: orgName.trim() ? `${orgName.trim()} (Logo ${slot})` : cleanFileTitle,
          category: 'organization',
          organizationId: editingOrgId || activeOrgId || undefined,
          dataUrl,
          aspectRatio: Number(aspect.toFixed(2)),
          createdAt: new Date().toISOString(),
        };
        onSaveLogos([createdLogo, ...logos]);
        if (slot === 1) {
          setOrgLogo1(createdLogo.id);
        } else {
          setOrgLogo2(createdLogo.id);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;

    const socialLinks: SocialMediaRecord[] = [];
    if (orgFacebook.trim()) {
      socialLinks.push({
        id: 'soc-fb',
        platform: 'facebook',
        displayName: orgFacebook.trim(),
        urlOrContact: orgFacebook.trim(),
        icon: 'FB',
        visible: true,
      });
    }
    if (orgInstagram.trim()) {
      socialLinks.push({
        id: 'soc-ig',
        platform: 'instagram',
        displayName: orgInstagram.trim(),
        urlOrContact: orgInstagram.trim(),
        icon: 'IG',
        visible: true,
      });
    }
    if (orgX.trim()) {
      socialLinks.push({
        id: 'soc-x',
        platform: 'x',
        displayName: orgX.trim(),
        urlOrContact: orgX.trim(),
        icon: 'X',
        visible: true,
      });
    }

    if (editingOrgId) {
      const updated = organizations.map((o) =>
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
              headerPosition,
              headerDisplayMode,
              logo1Scale,
              logo2Scale,
              headerLogoGap,
              headerFontFamily,
              headerTextColor,
              headerTextSize,
              headerTextWeight,
              headerAddressSize,
              headerAddressColor,
              primaryColor,
              secondaryColor,
              updatedAt: new Date().toISOString(),
            }
          : o
      );
      onSaveOrganizations(updated);
      // Keep organization loaded permanently until explicitly deleted or changed
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
        headerPosition,
        headerStyle: 'side-by-side',
        headerDisplayMode,
        logo1Scale,
        logo2Scale,
        headerLogoGap,
        headerFontFamily,
        headerTextColor,
        headerTextSize,
        headerTextWeight,
        headerAddressSize,
        headerAddressColor,
        headerPaddingX: 40,
        headerPaddingY: 32,
        headerScrimOpacity: 35,
        defaultDirection: 'rtl',
        primaryColor,
        secondaryColor,
        preferences: {
          defaultFormat: 'image/jpeg',
          defaultQuality: 0.95,
          autoApplyHeader: true,
        },
        updatedAt: new Date().toISOString(),
      };
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
      onSelectOrg(newOrgId);
      setEditingOrgId(newOrgId);
      // Keep newly created organization loaded permanently until explicitly deleted or changed
    }
  };

  const handleDuplicateOrg = (org: OrganizationProfile) => {
    const copy: OrganizationProfile = {
      ...JSON.parse(JSON.stringify(org)),
      id: `org-${Date.now()}`,
      name: `${org.name} (Copy)`,
      updatedAt: new Date().toISOString(),
    };
    onSaveOrganizations([copy, ...organizations]);
  };

  const handleDeleteOrg = (orgId: string) => {
    const remaining = organizations.filter((o) => o.id !== orgId);
    onSaveOrganizations(remaining);
    if (activeOrgId === orgId && remaining[0]) {
      onSelectOrg(remaining[0].id);
    }
    setConfirmDeleteId(null);
  };

  const orgLogoOptions = logos.filter(
    (l) =>
      l.category === 'organization' &&
      (!editingOrgId || !l.organizationId || l.organizationId === editingOrgId)
  );

  const availableOrgFonts = useMemo(() => {
    const list = [
      { label: 'MV Eamaan XP (Dhivehi Official — Default)', value: "'Mv_Eamaan_XP', 'Faruma', 'Noto Sans Thaana', sans-serif" },
      { label: 'Faruma (Dhivehi Classic)', value: "'Faruma', 'Mv_Eamaan_XP', 'Noto Sans Thaana', sans-serif" },
      { label: 'MV Waheed (Dhivehi Bold)', value: "'MV Waheed', 'Mv_Eamaan_XP', 'Faruma', sans-serif" },
      { label: 'Noto Sans Thaana (Modern Dhivehi)', value: "'Noto Sans Thaana', 'Mv_Eamaan_XP', 'Faruma', sans-serif" },
      { label: 'Outfit (Modern Display)', value: "'Outfit', 'Mv_Eamaan_XP', 'Faruma', sans-serif" },
      { label: 'Public Sans (Clean Editorial)', value: "'Public Sans', 'Mv_Eamaan_XP', sans-serif" },
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
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-white">
                  Organization Management
                </h1>
                <p className="text-xs text-slate-400">
                  Create and manage organizations, customize Dhivehi &amp; English typography fonts, top-right branding logos, and address styling
                </p>
              </div>
            </div>
          </div>

          {editingOrgId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 self-start cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Switch to Create New Organization</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Create / Edit Organization Form */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-5 bg-[#111726] border border-slate-800 rounded-2xl p-5 space-y-4 self-start"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                {editingOrgId ? (
                  <Edit3 className="w-4 h-4 text-amber-400" />
                ) : (
                  <Plus className="w-4 h-4 text-blue-400" />
                )}
                <h2 className="text-sm font-bold text-white">
                  {editingOrgId ? 'Edit Organization Profile' : 'Create New Organization'}
                </h2>
              </div>
              {editingOrgId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              )}
            </div>

            {/* Basic Information */}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Organization Name *
                </label>
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Ministry of Tourism & Arts"
                  className="w-full px-3 py-2 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Short Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={orgShortName}
                    onChange={(e) => setOrgShortName(e.target.value)}
                    placeholder="e.g. MoTA"
                    className="w-full px-3 py-2 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Name in Dhivehi (Optional)
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    value={orgDhivehi}
                    onChange={(e) => setOrgDhivehi(e.target.value)}
                    placeholder="މިނިސްޓްރީ އޮފް ޓޫރިޒަމް"
                    className="w-full px-3 py-2 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-white font-thaana focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Organization Address (Displayed in Top-Right Header)
                </label>
                <input
                  type="text"
                  value={orgAddress}
                  onChange={(e) => setOrgAddress(e.target.value)}
                  placeholder="Velaanaage 5th Floor, Ameer Ahmed Magu, Malé"
                  className="w-full px-3 py-2 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={orgPhone}
                    onChange={(e) => setOrgPhone(e.target.value)}
                    placeholder="+960 332-3228"
                    className="w-full px-2.5 py-1.5 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={orgEmail}
                    onChange={(e) => setOrgEmail(e.target.value)}
                    placeholder="info@org.mv"
                    className="w-full px-2.5 py-1.5 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Website
                  </label>
                  <input
                    type="text"
                    value={orgWebsite}
                    onChange={(e) => setOrgWebsite(e.target.value)}
                    placeholder="www.org.mv"
                    className="w-full px-2.5 py-1.5 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Organization Main Logos */}
            <div className="pt-2 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">
                  Organization Header Logos (Top-Right Corner)
                </span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-2 py-0.5 rounded">
                  HD Vector / PNG
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Main Logo 1 */}
                <div className="p-2.5 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-300">Main Logo 1</span>
                    <button
                      type="button"
                      onClick={() => logo1InputRef.current?.click()}
                      className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload</span>
                    </button>
                    <input
                      ref={logo1InputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={(e) => handleOrgLogoUpload(1, e)}
                      className="hidden"
                    />
                  </div>
                  <select
                    value={orgLogo1}
                    onChange={(e) => setOrgLogo1(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded text-white cursor-pointer"
                  >
                    <option value="">None</option>
                    {orgLogoOptions.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                  {orgLogo1 && logos.find((l) => l.id === orgLogo1) && (
                    <div className="h-12 rounded bg-slate-900/90 border border-slate-800 flex items-center justify-center p-1.5">
                      <img
                        src={logos.find((l) => l.id === orgLogo1)?.dataUrl}
                        alt="Main Logo 1"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  )}
                </div>

                {/* Main Logo 2 */}
                <div className="p-2.5 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-300">Main Logo 2</span>
                    <button
                      type="button"
                      onClick={() => logo2InputRef.current?.click()}
                      className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload</span>
                    </button>
                    <input
                      ref={logo2InputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={(e) => handleOrgLogoUpload(2, e)}
                      className="hidden"
                    />
                  </div>
                  <select
                    value={orgLogo2}
                    onChange={(e) => setOrgLogo2(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded text-white cursor-pointer"
                  >
                    <option value="">None (Single Logo)</option>
                    {orgLogoOptions.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                  {orgLogo2 && logos.find((l) => l.id === orgLogo2) && (
                    <div className="h-12 rounded bg-slate-900/90 border border-slate-800 flex items-center justify-center p-1.5">
                      <img
                        src={logos.find((l) => l.id === orgLogo2)?.dataUrl}
                        alt="Main Logo 2"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Placement & Display Mode */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Default Placement
                  </label>
                  <select
                    value={headerPosition}
                    onChange={(e) =>
                      setHeaderPosition(e.target.value as OrganizationProfile['headerPosition'])
                    }
                    className="w-full px-2.5 py-1.5 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-white cursor-pointer"
                  >
                    <option value="top-right">Top Right Corner (Default)</option>
                    <option value="top-bar">Top Full Bar</option>
                    <option value="top-corners">Top Split Corners</option>
                    <option value="top-center">Top Center</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Logo Display Mode
                  </label>
                  <select
                    value={headerDisplayMode}
                    onChange={(e) =>
                      setHeaderDisplayMode(
                        e.target.value as OrganizationProfile['headerDisplayMode']
                      )
                    }
                    className="w-full px-2.5 py-1.5 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-white cursor-pointer"
                  >
                    <option value="both-logos">Show Both Logos</option>
                    <option value="one-logo">Show Main Logo 1 Only</option>
                    <option value="hide-header">Hide Organization Header</option>
                  </select>
                </div>
              </div>

              {/* Sizing & Gaps */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Logo 1 Size ({logo1Scale}%)
                  </label>
                  <input
                    type="range"
                    min={40}
                    max={150}
                    value={logo1Scale}
                    onChange={(e) => setLogo1Scale(Number(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Logo 2 Size ({logo2Scale}%)
                  </label>
                  <input
                    type="range"
                    min={40}
                    max={150}
                    value={logo2Scale}
                    onChange={(e) => setLogo2Scale(Number(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Logo Gap ({headerLogoGap}px)
                  </label>
                  <input
                    type="range"
                    min={4}
                    max={48}
                    value={headerLogoGap}
                    onChange={(e) => setHeaderLogoGap(Number(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Organization Header Typography Customization */}
              <div className="p-3 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-200 flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-amber-400" />
                    <span>Customize Organization Font &amp; Typography</span>
                  </span>
                  <span className="text-[10px] text-blue-400">Header Text</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">
                      Organization Font Family
                    </label>
                    <select
                      value={headerFontFamily}
                      onChange={(e) => setHeaderFontFamily(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded text-white cursor-pointer"
                    >
                      {availableOrgFonts.map((f, idx) => (
                        <option key={`opt-org-${f.value}-${idx}`} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">
                      Name Weight
                    </label>
                    <select
                      value={headerTextWeight}
                      onChange={(e) =>
                        setHeaderTextWeight(
                          e.target.value as '400' | '500' | '600' | '700' | '800'
                        )
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded text-white cursor-pointer"
                    >
                      <option value="400">Regular (400)</option>
                      <option value="500">Medium (500)</option>
                      <option value="600">Semi-Bold (600)</option>
                      <option value="700">Bold (700)</option>
                      <option value="800">Extra-Bold (800)</option>
                    </select>
                  </div>
                </div>

                {/* Live Font Sample */}
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
                  <div className="text-[10px] text-slate-400 mb-1">Font Preview:</div>
                  <div
                    style={{ fontFamily: headerFontFamily }}
                    className="text-sm font-bold text-white font-thaana"
                    dir="rtl"
                  >
                    {orgDhivehi || 'މިނިސްޓްރީ އޮފް ޓޫރިޒަމް'}
                  </div>
                  <div
                    style={{ fontFamily: headerFontFamily }}
                    className="text-xs text-slate-300 mt-0.5"
                  >
                    {orgName || 'Ministry of Tourism & Arts'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">
                      Name Font Size ({headerTextSize}px)
                    </label>
                    <input
                      type="range"
                      min={16}
                      max={44}
                      value={headerTextSize}
                      onChange={(e) => setHeaderTextSize(Number(e.target.value))}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">
                      Name Text Color
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={headerTextColor}
                        onChange={(e) => setHeaderTextColor(e.target.value)}
                        className="w-7 h-6 rounded bg-transparent border border-slate-700 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={headerTextColor}
                        onChange={(e) => setHeaderTextColor(e.target.value)}
                        className="w-full px-2 py-0.5 text-xs bg-slate-900 border border-slate-700 rounded text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">
                      Address Font Size ({headerAddressSize}px)
                    </label>
                    <input
                      type="range"
                      min={10}
                      max={28}
                      value={headerAddressSize}
                      onChange={(e) => setHeaderAddressSize(Number(e.target.value))}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">
                      Address Text Color
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={
                          headerAddressColor.startsWith('#')
                            ? headerAddressColor
                            : '#E2E8F0'
                        }
                        onChange={(e) => setHeaderAddressColor(e.target.value)}
                        className="w-7 h-6 rounded bg-transparent border border-slate-700 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={headerAddressColor}
                        onChange={(e) => setHeaderAddressColor(e.target.value)}
                        className="w-full px-2 py-0.5 text-xs bg-slate-900 border border-slate-700 rounded text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Brand Colors */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Default Primary Banner Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-8 h-7 rounded bg-transparent border border-slate-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs bg-[#0B0F17] border border-slate-700 rounded text-white font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Default Secondary Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-8 h-7 rounded bg-transparent border border-slate-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs bg-[#0B0F17] border border-slate-700 rounded text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Social Media */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="block text-[11px] font-medium text-slate-400">
                Social Media Handles (Optional on Photo)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={orgFacebook}
                  onChange={(e) => setOrgFacebook(e.target.value)}
                  placeholder="Facebook @page"
                  className="px-2.5 py-1.5 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-white"
                />
                <input
                  type="text"
                  value={orgInstagram}
                  onChange={(e) => setOrgInstagram(e.target.value)}
                  placeholder="Instagram @handle"
                  className="px-2.5 py-1.5 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-white"
                />
                <input
                  type="text"
                  value={orgX}
                  onChange={(e) => setOrgX(e.target.value)}
                  placeholder="X / Twitter @handle"
                  className="px-2.5 py-1.5 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>
                {editingOrgId ? 'Save Organization Changes' : 'Create Organization'}
              </span>
            </button>
          </form>

          {/* Right Column: Saved Organizations List */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">
                Your Organizations ({organizations.length})
              </h2>
              <span className="text-xs text-slate-400">
                Select an organization to manage its events and sponsors
              </span>
            </div>

            {organizations.length === 0 ? (
              <div className="bg-[#111726] border border-dashed border-slate-800 rounded-2xl p-10 text-center space-y-3">
                <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
                <div className="text-sm font-semibold text-slate-300">
                  No Organizations Created Yet
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Use the form on the left to create your first organization profile with its top-right corner logos and address.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {organizations.map((org) => {
                  const isSelected = org.id === activeOrgId;
                  const orgEvents = events.filter((e) => e.primaryOrgId === org.id);
                  const logo1 = logos.find((l) => l.id === org.mainLogo1Id);
                  const logo2 = logos.find((l) => l.id === org.mainLogo2Id);

                  return (
                    <div
                      key={org.id}
                      onClick={() => onSelectOrg(org.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-950/25 border-blue-500/60 shadow-lg shadow-blue-950/20'
                          : 'bg-[#111726] border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5 min-w-0">
                          {/* Logos Preview */}
                          <div className="flex items-center gap-1.5 bg-[#0B0F17] border border-slate-800 rounded-xl p-2 shrink-0">
                            {logo1 ? (
                              <img
                                src={logo1.dataUrl}
                                alt={logo1.name}
                                className="w-9 h-9 object-contain"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-slate-500">
                                <Building2 className="w-4 h-4" />
                              </div>
                            )}
                            {logo2 && (
                              <img
                                src={logo2.dataUrl}
                                alt={logo2.name}
                                className="w-9 h-9 object-contain border-l border-slate-800 pl-1.5"
                              />
                            )}
                          </div>

                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-white truncate">
                                {org.name}
                              </span>
                              {org.shortName && (
                                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                                  {org.shortName}
                                </span>
                              )}
                              {isSelected && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-600/30 border border-blue-500/40 text-blue-300 font-semibold">
                                  Active Organization
                                </span>
                              )}
                            </div>

                            {org.nameDhivehi && (
                              <div className="text-xs text-amber-300/90 font-thaana" dir="rtl">
                                {org.nameDhivehi}
                              </div>
                            )}

                            <div className="flex items-center flex-wrap gap-3 text-xs text-slate-400">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                                <span>{org.address}</span>
                              </span>
                              {org.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                                  <span>{org.phone}</span>
                                </span>
                              )}
                              {org.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                                  <span>{org.email}</span>
                                </span>
                              )}
                              {org.website && (
                                <span className="flex items-center gap-1">
                                  <Globe className="w-3.5 h-3.5 text-slate-500" />
                                  <span>{org.website}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div
                          className="flex items-center flex-wrap gap-2 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleStartEditOrg(org)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onNavigateToEvents(org.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-xs font-medium text-blue-300 flex items-center gap-1.5 cursor-pointer"
                          >
                            <FolderKanban className="w-3.5 h-3.5" />
                            <span>Events ({orgEvents.length})</span>
                          </button>

                          {onNavigateToEditor && (
                            <button
                              type="button"
                              onClick={() => onNavigateToEditor(org.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-xs font-medium text-emerald-300 flex items-center gap-1.5 cursor-pointer"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                              <span>Generate Photos</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDuplicateOrg(org)}
                            title="Duplicate Organization"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {confirmDeleteId === org.id ? (
                            <div className="flex items-center gap-1 bg-rose-950/60 border border-rose-500/40 rounded-lg px-2 py-1">
                              <button
                                type="button"
                                onClick={() => handleDeleteOrg(org.id)}
                                className="text-[11px] font-bold text-rose-300 hover:text-white cursor-pointer"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="text-[11px] text-slate-400 hover:text-white ml-1 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(org.id)}
                              title="Delete Organization"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Footer stats bar */}
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-blue-400" />
                            <span>
                              {orgEvents.length} Saved {orgEvents.length === 1 ? 'Event' : 'Events'}
                            </span>
                          </span>
                          <span>·</span>
                          <span>Font: {org.headerFontFamily?.split(',')[0].replace(/['"]/g, '') || 'Mv_Eamaan_XP'}</span>
                        </div>
                        <span className="text-slate-500">
                          Updated {new Date(org.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
