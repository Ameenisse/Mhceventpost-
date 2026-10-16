import React, { useRef, useState } from 'react';
import {
  Award,
  Building2,
  Check,
  Edit3,
  FolderKanban,
  Image as ImageIcon,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  BrandingLogoAsset,
  EventConfiguration,
  LogoCategory,
  OrganizationProfile,
} from '../types/studio';
import { optimizeLogoDataUrl } from '../services/indexedDbStore';

interface SponsorsManagePageProps {
  organizations: OrganizationProfile[];
  events: EventConfiguration[];
  logos: BrandingLogoAsset[];
  activeOrgId: string;
  activeEvent: EventConfiguration;
  onSelectOrg: (orgId: string) => void;
  onSelectEvent: (eventId: string) => void;
  onSaveLogos: (nextLogos: BrandingLogoAsset[]) => void;
  onUpdateActiveEvent: (updater: (prev: EventConfiguration) => EventConfiguration) => void;
}

export const SponsorsManagePage: React.FC<SponsorsManagePageProps> = ({
  organizations,
  events,
  logos,
  activeOrgId,
  activeEvent,
  onSelectOrg,
  onSelectEvent,
  onSaveLogos,
  onUpdateActiveEvent,
}) => {
  const currentOrg =
    organizations.find((o) => o.id === activeOrgId) ||
    organizations.find((o) => o.id === activeEvent?.primaryOrgId) ||
    organizations[0];

  const [logoName, setLogoName] = useState('');
  const [logoCategory, setLogoCategory] = useState<LogoCategory>('sponsor');
  const [editingLogoId, setEditingLogoId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | LogoCategory>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  const orgEvents = currentOrg
    ? events.filter((e) => e.primaryOrgId === currentOrg.id)
    : events;

  // Logos belonging to the active organization
  const scopedLogos = currentOrg
    ? logos.filter(
        (l) =>
          l.organizationId === currentOrg.id ||
          l.id === currentOrg.mainLogo1Id ||
          l.id === currentOrg.mainLogo2Id ||
          orgEvents.some(
            (e) =>
              e.id === l.eventId ||
              e.sponsorsConfig.selectedSponsorIds.includes(l.id) ||
              e.sponsorsConfig.selectedParticipantIds.includes(l.id)
          )
      )
    : logos;

  const filteredLogos = scopedLogos.filter((l) => {
    const matchesCategory = filterCategory === 'all' || l.category === filterCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      l.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Upload one or multiple sponsor logos (CREATE)
  const handleMultiLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    e.target.value = '';

    const created: BrandingLogoAsset[] = await Promise.all(
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
                const customTitle =
                  fileArray.length === 1 && logoName.trim()
                    ? logoName.trim()
                    : file.name.replace(/\.[^/.]+$/, '');
                resolve({
                  id: `logo-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
                  name: customTitle,
                  category: logoCategory,
                  organizationId: currentOrg?.id,
                  eventId: activeEvent?.id,
                  dataUrl,
                  aspectRatio: Number(aspect.toFixed(2)),
                  createdAt: new Date().toISOString(),
                });
              };
              img.onerror = () => {
                resolve({
                  id: `logo-${Date.now()}-${idx}`,
                  name: file.name.replace(/\.[^/.]+$/, ''),
                  category: logoCategory,
                  organizationId: currentOrg?.id,
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

    onSaveLogos([...created, ...logos]);
    setLogoName('');
  };

  // Start editing a sponsor logo (UPDATE)
  const handleStartEdit = (logo: BrandingLogoAsset) => {
    setEditingLogoId(logo.id);
    setLogoName(logo.name);
    setLogoCategory(logo.category);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLogoId || !logoName.trim()) return;
    const updated = logos.map((l) =>
      l.id === editingLogoId
        ? {
            ...l,
            name: logoName.trim(),
            category: logoCategory,
          }
        : l
    );
    onSaveLogos(updated);
    setEditingLogoId(null);
    setLogoName('');
  };

  const handleReplaceLogoImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingLogoId) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const aspect = img.naturalWidth / Math.max(1, img.naturalHeight);
        onSaveLogos(
          logos.map((l) =>
            l.id === editingLogoId
              ? {
                  ...l,
                  dataUrl,
                  aspectRatio: Number(aspect.toFixed(2)),
                }
              : l
          )
        );
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Delete a sponsor logo (DELETE)
  const handleDeleteLogo = (logoId: string) => {
    onSaveLogos(logos.filter((l) => l.id !== logoId));
    // Also remove from active event if selected
    if (activeEvent) {
      onUpdateActiveEvent((prev) => ({
        ...prev,
        sponsorsConfig: {
          ...prev.sponsorsConfig,
          selectedSponsorIds: prev.sponsorsConfig.selectedSponsorIds.filter(
            (id) => id !== logoId
          ),
          selectedParticipantIds: prev.sponsorsConfig.selectedParticipantIds.filter(
            (id) => id !== logoId
          ),
        },
      }));
    }
    setConfirmDeleteId(null);
    if (editingLogoId === logoId) {
      setEditingLogoId(null);
      setLogoName('');
    }
  };

  // Toggle sponsor assignment on currently active event
  const handleToggleSponsorForActiveEvent = (logoId: string) => {
    onUpdateActiveEvent((prev) => {
      const currentList = prev.sponsorsConfig.selectedSponsorIds || [];
      const exists = currentList.includes(logoId);
      const nextList = exists
        ? currentList.filter((id) => id !== logoId)
        : [...currentList, logoId];
      return {
        ...prev,
        sponsorsConfig: {
          ...prev.sponsorsConfig,
          selectedSponsorIds: nextList,
        },
      };
    });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0B0F17] p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white">
                Sponsors & Partner Logos CRUD Manager
              </h1>
              <p className="text-xs text-slate-400">
                Create, view, rename, replace, and delete high-resolution sponsor logos & assign them per event
              </p>
            </div>
          </div>

          {/* Organization & Active Event Selectors */}
          <div className="flex items-center flex-wrap gap-2">
            <div className="flex items-center gap-1.5 bg-[#111726] border border-slate-700 rounded-xl px-3 py-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              <select
                value={currentOrg?.id || ''}
                onChange={(e) => onSelectOrg(e.target.value)}
                className="bg-transparent text-xs font-semibold text-white focus:outline-none"
              >
                {organizations.map((o) => (
                  <option key={o.id} value={o.id} className="bg-slate-900 text-white">
                    {o.name}
                  </option>
                ))}
              </select>
            </div>

            {orgEvents.length > 0 && (
              <div className="flex items-center gap-1.5 bg-[#111726] border border-slate-700 rounded-xl px-3 py-1.5">
                <FolderKanban className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] text-slate-400">Active Event:</span>
                <select
                  value={activeEvent?.id || ''}
                  onChange={(e) => onSelectEvent(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-white focus:outline-none max-w-[180px] truncate"
                >
                  {orgEvents.map((ev) => (
                    <option key={ev.id} value={ev.id} className="bg-slate-900 text-white">
                      {ev.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Create / Edit Sponsor Logo Form */}
          <div className="lg:col-span-4 bg-[#111726] border border-slate-800 rounded-2xl p-5 space-y-4 self-start">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                {editingLogoId ? (
                  <Edit3 className="w-4 h-4 text-amber-400" />
                ) : (
                  <Plus className="w-4 h-4 text-purple-400" />
                )}
                <h2 className="text-sm font-bold text-white">
                  {editingLogoId ? 'Edit Sponsor Logo' : 'Add New Sponsor Logos'}
                </h2>
              </div>
              {editingLogoId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingLogoId(null);
                    setLogoName('');
                  }}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              )}
            </div>

            {editingLogoId ? (
              <form onSubmit={handleSaveEdit} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Sponsor / Logo Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={logoName}
                    onChange={(e) => setLogoName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Category
                  </label>
                  <select
                    value={logoCategory}
                    onChange={(e) => setLogoCategory(e.target.value as LogoCategory)}
                    className="w-full px-3 py-2 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-white"
                  >
                    <option value="sponsor">Official Sponsor</option>
                    <option value="participant">Participant / Partner</option>
                    <option value="co-organizer">Co-Organizer</option>
                    <option value="organization">Organization Main Logo</option>
                  </select>
                </div>

                {/* Preview & Replace Image */}
                {logos.find((l) => l.id === editingLogoId) && (
                  <div className="p-3 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-2 text-center">
                    <div className="h-20 flex items-center justify-center p-2">
                      <img
                        src={logos.find((l) => l.id === editingLogoId)?.dataUrl}
                        alt={logoName}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => replaceFileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-blue-300 inline-flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Replace Logo Image File</span>
                    </button>
                    <input
                      ref={replaceFileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleReplaceLogoImage}
                      className="hidden"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Update Sponsor Logo</span>
                </button>
              </form>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Sponsor Name (Optional for bulk upload)
                  </label>
                  <input
                    type="text"
                    value={logoName}
                    onChange={(e) => setLogoName(e.target.value)}
                    placeholder="e.g. Bank of Maldives / Dhiraagu"
                    className="w-full px-3 py-2 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Logo Category
                  </label>
                  <select
                    value={logoCategory}
                    onChange={(e) => setLogoCategory(e.target.value as LogoCategory)}
                    className="w-full px-3 py-2 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-white"
                  >
                    <option value="sponsor">Official Sponsor</option>
                    <option value="participant">Participant / Partner</option>
                    <option value="co-organizer">Co-Organizer</option>
                    <option value="organization">Organization Main Logo</option>
                  </select>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-purple-500/60 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-[#0B0F17]/60 space-y-2"
                >
                  <Upload className="w-8 h-8 text-purple-400 mx-auto" />
                  <div className="text-xs font-semibold text-white">
                    Click to Upload One or Multiple Logos
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Supports transparent PNG, SVG, WEBP, JPG. Aspect ratio & HD quality preserved.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleMultiLogoUpload}
                    className="hidden"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Column: CRUD List & Event Sponsor Assignment */}
          <div className="lg:col-span-8 space-y-4">
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111726] border border-slate-800 rounded-2xl p-3.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search sponsors by name..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {(['all', 'sponsor', 'participant', 'co-organizer', 'organization'] as const).map(
                  (cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFilterCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                        filterCategory === cat
                          ? 'bg-purple-600 text-white'
                          : 'bg-[#0B0F17] text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {cat}
                    </button>
                  )
                )}
              </div>
            </div>

            {filteredLogos.length === 0 ? (
              <div className="bg-[#111726] border border-dashed border-slate-800 rounded-2xl p-10 text-center space-y-3">
                <ImageIcon className="w-10 h-10 text-slate-600 mx-auto" />
                <div className="text-sm font-semibold text-slate-300">
                  No Sponsor Logos Found
                </div>
                <p className="text-xs text-slate-500">
                  Upload sponsor or partner logos on the left to build your organization's reusable sponsor library.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {filteredLogos.map((logo) => {
                  const isSelectedInActiveEvent =
                    activeEvent?.sponsorsConfig.selectedSponsorIds.includes(logo.id);

                  return (
                    <div
                      key={logo.id}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                        isSelectedInActiveEvent
                          ? 'bg-blue-950/20 border-blue-500/60'
                          : 'bg-[#111726] border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-2.5">
                        {/* Logo Preview Box */}
                        <div className="h-24 rounded-xl bg-[#0B0F17] border border-slate-800/90 flex items-center justify-center p-3 relative">
                          <img
                            src={logo.dataUrl}
                            alt={logo.name}
                            className="max-h-full max-w-full object-contain"
                          />
                          <span className="absolute top-2 right-2 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-900/90 text-slate-300 border border-slate-700">
                            {logo.category}
                          </span>
                        </div>

                        <div>
                          <div className="text-xs font-bold text-white truncate">
                            {logo.name}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Aspect Ratio: {logo.aspectRatio}:1
                          </div>
                        </div>
                      </div>

                      {/* Event Toggle + Edit / Delete CRUD Buttons */}
                      <div className="space-y-2 pt-2 border-t border-slate-800/80">
                        {activeEvent && logo.category !== 'organization' && (
                          <button
                            type="button"
                            onClick={() => handleToggleSponsorForActiveEvent(logo.id)}
                            className={`w-full py-1.5 px-2.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                              isSelectedInActiveEvent
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>
                              {isSelectedInActiveEvent
                                ? 'Selected in Active Event'
                                : 'Select for Active Event'}
                            </span>
                          </button>
                        )}

                        <div className="flex items-center justify-between gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(logo)}
                            className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 flex items-center justify-center gap-1"
                          >
                            <Edit3 className="w-3 h-3 text-amber-400" />
                            <span>Edit</span>
                          </button>

                          {confirmDeleteId === logo.id ? (
                            <div className="flex items-center gap-1 bg-rose-950/70 border border-rose-500/40 rounded-lg px-2 py-1">
                              <button
                                type="button"
                                onClick={() => handleDeleteLogo(logo.id)}
                                className="text-[10px] font-bold text-rose-300"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="text-[10px] text-slate-400"
                              >
                                X
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(logo.id)}
                              className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 text-[11px] flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
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
    </div>
  );
};
