import React, { useRef, useState } from 'react';
import {
  Archive,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Copy,
  Edit3,
  FolderKanban,
  FolderUp,
  Image as ImageIcon,
  ImagePlus,
  Layers,
  Loader2,
  Pencil,
  Play,
  Plus,
  Sliders,
  Sparkles,
  Trash2,
  Upload,
  Share2,
  X,
  Check,
} from 'lucide-react';
import { BackendAIService } from '../services/aiService';
import {
  AuthenticatedUserProfile,
  BatchProcessState,
  BrandingLogoAsset,
  CloudSyncState,
  EventConfiguration,
  OrganizationProfile,
  SavedTemplatePreset,
  TemporaryPhotoItem,
  InspectorTab,
} from '../types/studio';

interface StudioDashboardViewProps {
  user: AuthenticatedUserProfile;
  organizations: OrganizationProfile[];
  events: EventConfiguration[];
  logos: BrandingLogoAsset[];
  templates: SavedTemplatePreset[];
  activeEvent: EventConfiguration;
  selectedOrgIdFilter: string; // 'all' or specific orgId
  onSelectOrgFilter: (orgId: string) => void;
  onSelectEvent: (eventId: string) => void;
  onOpenEditor: (initialTab?: InspectorTab) => void;
  onOpenModal: (modal: 'events' | 'organizations' | 'assets' | 'templates') => void;
  onDuplicateEvent: (evt: EventConfiguration) => void;
  onDeleteEvent: (eventId: string) => void;
  // Generate Photos Quick Workflow
  photos: TemporaryPhotoItem[];
  onImportFiles: (files: FileList | File[]) => void;
  onGenerateAll: () => void;
  onGenerateSelected: () => void;
  onExportFolder?: () => void;
  onExportZip: () => void;
  onClearPhotos: () => void;
  batchState: BatchProcessState;
  cloudSyncState: CloudSyncState;
}

export const StudioDashboardView: React.FC<StudioDashboardViewProps> = ({
  organizations,
  events,
  logos,
  templates,
  activeEvent,
  selectedOrgIdFilter,
  onSelectOrgFilter,
  onSelectEvent,
  onOpenEditor,
  onOpenModal,
  onDuplicateEvent,
  onDeleteEvent,
  photos,
  onImportFiles,
  onGenerateAll,
  onGenerateSelected,
  onExportFolder,
  onExportZip,
  onClearPhotos,
  batchState,
  cloudSyncState,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // AI Social Media Captions State
  const [showCaptionsModal, setShowCaptionsModal] = useState(false);
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [captionsResult, setCaptionsResult] = useState<{
    englishCaption: string;
    dhivehiCaption: string;
    hashtags: string[];
  } | null>(null);
  const [captionCopied, setCaptionCopied] = useState<'english' | 'dhivehi' | null>(null);

  const handleGenerateCaptions = async () => {
    setIsGeneratingCaptions(true);
    setShowCaptionsModal(true);
    try {
      const sponsorNames = activeEvent.sponsorsConfig.selectedSponsorIds
        .map((id) => logos.find((l) => l.id === id)?.name)
        .filter(Boolean) as string[];

      const res = await BackendAIService.generateCaptions({
        eventName: activeEvent.title,
        organizationName: activeOrg?.name || 'Organization',
        venue: activeEvent.venue,
        date: activeEvent.date,
        keySponsors: sponsorNames,
        photoCount: photos.length || 1,
      });
      if (res) {
        setCaptionsResult(res);
      }
    } catch (e) {
      console.error('Failed to generate captions:', e);
    } finally {
      setIsGeneratingCaptions(false);
    }
  };

  // Active organization for the currently selected organization or active event
  const activeOrg: OrganizationProfile | undefined =
    organizations.find((o) => o.id === selectedOrgIdFilter) ||
    organizations.find((o) => o.id === activeEvent?.primaryOrgId) ||
    organizations[0];

  // Events strictly belonging to the active organization (never mix all organizations)
  const visibleEvents = activeOrg
    ? events.filter((e) => e.primaryOrgId === activeOrg.id)
    : [];

  // Logos strictly belonging to the active organization or its events
  const visibleLogos = activeOrg
    ? logos.filter(
        (l) =>
          l.organizationId === activeOrg.id ||
          l.id === activeOrg.mainLogo1Id ||
          l.id === activeOrg.mainLogo2Id ||
          visibleEvents.some(
            (e) =>
              e.id === l.eventId ||
              e.sponsorsConfig.selectedSponsorIds.includes(l.id) ||
              e.sponsorsConfig.selectedParticipantIds.includes(l.id)
          )
      )
    : [];

  // Saved setups/templates strictly belonging to the active organization
  const visibleTemplates = activeOrg
    ? templates.filter((t) => t.organizationId === activeOrg.id)
    : [];

  const selectedPhotosCount = photos.filter((p) => p.selected).length;
  const generatedPhotosCount = photos.filter((p) => p.status === 'generated').length;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onImportFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0B0F17] p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Metrics Bar (Scoped to User & Active Organization) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-xl bg-[#111726] border border-slate-800/90 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">My Organizations</div>
              <div className="text-2xl font-bold text-white tabular-nums mt-0.5">
                {organizations.length}
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Building2 className="w-4 h-4" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#111726] border border-slate-800/90 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <div className="text-xs text-slate-400 truncate">
                {activeOrg ? `${activeOrg.shortName || activeOrg.name} Events` : 'Organization Events'}
              </div>
              <div className="text-2xl font-bold text-white tabular-nums mt-0.5">
                {visibleEvents.length}
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-600/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#111726] border border-slate-800/90 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <div className="text-xs text-slate-400 truncate">
                {activeOrg ? `${activeOrg.shortName || activeOrg.name} Logos` : 'Organization Logos'}
              </div>
              <div className="text-2xl font-bold text-white tabular-nums mt-0.5">
                {visibleLogos.length}
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <ImageIcon className="w-4 h-4" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#111726] border border-slate-800/90 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <div className="text-xs text-slate-400 truncate">
                {activeOrg ? `${activeOrg.shortName || activeOrg.name} Setups` : 'Organization Setups'}
              </div>
              <div className="text-2xl font-bold text-white tabular-nums mt-0.5">
                {visibleTemplates.length}
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* SECTION 3: GENERATE PHOTOS WORKFLOW CARD (Matches user's reference screenshot) */}
        <section className="bg-[#111726] border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <div>
                <h2 className="text-lg font-bold text-white">Generate Photos</h2>
                <p className="text-xs text-slate-400">
                  Step-by-step batch branding: Select Organization → Select Event → Drop Photos →
                  Generate & Download
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => onOpenEditor('banner-gradient')}
                className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                <span>Customize Banner & Gradient</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenEditor('sponsors')}
                className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5"
              >
                <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>Edit Sponsors ({activeEvent.sponsorsConfig.selectedSponsorIds.length})</span>
              </button>
            </div>
          </div>

          {/* Step 1 & Step 2: Organization and Event Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Step 1 · Organization
                </label>
                <button
                  type="button"
                  onClick={() => onOpenModal('organizations')}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                >
                  + Create Organization
                </button>
              </div>
              <div className="relative">
                <select
                  value={activeOrg?.id || ''}
                  onChange={(e) => {
                    const orgId = e.target.value;
                    onSelectOrgFilter(orgId);
                    const firstEvtForOrg = events.find((ev) => ev.primaryOrgId === orgId);
                    if (firstEvtForOrg) {
                      onSelectEvent(firstEvtForOrg.id);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#0B0F17] border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500 appearance-none"
                >
                  {organizations.length === 0 ? (
                    <option value="">No organizations yet — click + Create Organization</option>
                  ) : (
                    organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name} ({org.address})
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Step 2 · {activeOrg ? `${activeOrg.shortName || activeOrg.name} Event` : 'Event'}
                </label>
                <button
                  type="button"
                  onClick={() => onOpenModal(activeOrg ? 'events' : 'organizations')}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                >
                  + Create New Event
                </button>
              </div>
              <div className="relative">
                <select
                  value={
                    visibleEvents.some((e) => e.id === activeEvent.id)
                      ? activeEvent.id
                      : visibleEvents[0]?.id || ''
                  }
                  onChange={(e) => onSelectEvent(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#0B0F17] border border-slate-700 rounded-xl text-white font-thaana focus:outline-none focus:border-blue-500 appearance-none"
                >
                  {visibleEvents.length === 0 ? (
                    <option value="">
                      {activeOrg
                        ? `No events for ${activeOrg.name} — click + Create New Event`
                        : 'Create an organization first'}
                    </option>
                  ) : (
                    visibleEvents.map((evt) => (
                      <option key={evt.id} value={evt.id}>
                        {evt.title} — {evt.date} {evt.venue ? `(${evt.venue})` : ''}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Step 3: Event Design Summary Bar */}
          <div className="p-4 rounded-xl bg-[#0B0F17] border border-slate-800/90 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs text-slate-400">Active Event Design Summary</div>
              <div className="text-sm font-bold text-white font-thaana">{activeEvent.title}</div>
              <div className="text-xs text-slate-400 flex items-center flex-wrap gap-2">
                <span className="tabular-nums">{activeEvent.date}</span>
                <span>·</span>
                <span>{activeEvent.venue}</span>
                <span>·</span>
                <span className="text-blue-400">
                  Banner: {activeEvent.footerBanner.heightPercent}% height (
                  {activeEvent.footerBanner.backgroundColor})
                </span>
                <span>·</span>
                <span className="text-emerald-400">
                  Logo Height: {activeEvent.sponsorsConfig.logoHeight}px · Gap:{' '}
                  {activeEvent.sponsorsConfig.gapBetweenLogos}px
                </span>
              </div>
            </div>

            {/* Active Sponsor Logo Thumbnails */}
            <div className="flex items-center flex-wrap gap-2">
              {activeEvent.sponsorsConfig.selectedSponsorIds.map((id) => {
                const sLogo = logos.find((l) => l.id === id);
                if (!sLogo) return null;
                return (
                  <img
                    key={id}
                    src={sLogo.dataUrl}
                    alt={sLogo.name}
                    title={sLogo.name}
                    referrerPolicy="no-referrer"
                    className="h-7 w-14 object-contain bg-slate-900 border border-slate-800 rounded px-1.5"
                  />
                );
              })}
              <button
                type="button"
                onClick={() => onOpenEditor('event-org')}
                className="px-3 py-1.5 text-xs font-semibold text-blue-400 hover:text-white bg-blue-950/40 hover:bg-blue-600 border border-blue-500/40 rounded-lg transition-colors"
              >
                Preview & Adjust Design
              </button>
            </div>
          </div>

          {/* Step 4: Large Drag and Drop Photos Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
              isDragging
                ? 'border-blue-400 bg-blue-950/40'
                : 'border-slate-700/90 bg-[#0B0F17]/90 hover:border-slate-600'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  onImportFiles(e.target.files);
                  e.target.value = '';
                }
              }}
              className="hidden"
            />
            <input
              ref={(el) => {
                folderInputRef.current = el;
                if (el) {
                  el.setAttribute('webkitdirectory', '');
                  el.setAttribute('directory', '');
                }
              }}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  onImportFiles(e.target.files);
                  e.target.value = '';
                }
              }}
              className="hidden"
            />

            <div className="max-w-md mx-auto space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 mx-auto">
                <Upload className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">
                  {photos.length === 0
                    ? 'Drag and Drop Photos'
                    : `${photos.length} Temporary Photos Loaded in RAM (${selectedPhotosCount} Selected)`}
                </h3>
                <p className="text-xs text-slate-400">
                  Or select multiple images or an entire event folder from your device. Photos stay
                  in temporary browser memory and are never uploaded to any server.
                </p>
              </div>

              <div className="flex items-center justify-center flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <ImagePlus className="w-4 h-4" />
                  <span>Select Photos</span>
                </button>
                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <FolderUp className="w-4 h-4" />
                  <span>Select Folder</span>
                </button>
              </div>


              {/* Temporary Thumbnail Strip when photos are imported */}
              {photos.length > 0 && (
                <div className="pt-4 border-t border-slate-800 space-y-2 text-left">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">
                      Imported Batch Preview ({generatedPhotosCount}/{photos.length} Generated)
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => onOpenEditor('event-org')}
                        className="text-blue-400 hover:text-blue-300 font-medium"
                      >
                        Customize Event Branding →
                      </button>
                      <button
                        type="button"
                        onClick={onClearPhotos}
                        className="text-rose-400 hover:text-rose-300"
                      >
                        Clear Batch
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {photos.slice(0, 14).map((p) => (
                      <div
                        key={p.id}
                        className="relative w-16 h-12 rounded-md overflow-hidden border border-slate-700 shrink-0 bg-slate-900"
                      >
                        <img
                          src={p.previewObjectUrl}
                          alt={p.filename}
                          className="w-full h-full object-cover"
                        />
                        {p.status === 'generated' && (
                          <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                    ))}
                    {photos.length > 14 && (
                      <div className="px-3 py-2 text-xs text-slate-400 shrink-0">
                        +{photos.length - 14} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step 5: Event Configuration Status + Generate All / Download Buttons */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-slate-400">Event configuration</span>
              <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {cloudSyncState.status === 'syncing'
                    ? 'Saving to Cloud...'
                    : cloudSyncState.status === 'error'
                    ? 'Saved Locally (Cloud Sync Retry)'
                    : 'Saved'}
                </span>
              </span>
            </div>

            {batchState.isProcessing || batchState.isExporting ? (
              <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/50 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                  <div>
                    <div className="text-xs font-semibold text-white">
                      {batchState.currentStepLabel}
                    </div>
                    <div className="text-[11px] text-blue-300 tabular-nums">
                      Processed {batchState.completedCount} of {batchState.totalCount} photos
                    </div>
                  </div>
                </div>
                <div className="w-48 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{
                      width: `${
                        batchState.totalCount > 0
                          ? Math.round((batchState.completedCount / batchState.totalCount) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <button
                  type="button"
                  disabled={photos.length === 0}
                  onClick={onGenerateAll}
                  className="sm:col-span-6 py-3 px-5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    Generate All Photos {photos.length > 0 ? `(${photos.length})` : ''}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={selectedPhotosCount === 0}
                  onClick={onGenerateSelected}
                  className="sm:col-span-3 py-3 px-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 text-blue-400" />
                  <span>Selected ({selectedPhotosCount})</span>
                </button>

                <button
                  type="button"
                  disabled={photos.length === 0}
                  onClick={onExportZip}
                  className="sm:col-span-3 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/40"
                >
                  <Archive className="w-4 h-4" />
                  <span>Download ZIP</span>
                </button>
              </div>
            )}

            {/* AI Announcements & Captions Action */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <span className="text-[11px] text-slate-400">
                AI Social Announcement Generator
              </span>
              <button
                type="button"
                onClick={handleGenerateCaptions}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-950/50 hover:bg-purple-900 border border-purple-500/40 text-purple-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-purple-300" />
                <span>Generate Captions (English & Dhivehi)</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* AI Captions Modal */}
      {showCaptionsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0F172A] border border-purple-500/30 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Social Media Announcements</h3>
                  <p className="text-[11px] text-slate-400">
                    Bilingual publishing captions synthesized by Gemini 3.8
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCaptionsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isGeneratingCaptions ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                <p className="text-xs">Generating bilingual captions and sponsor credits...</p>
              </div>
            ) : captionsResult ? (
              <div className="space-y-4">
                {/* English Announcement */}
                <div className="space-y-1.5 bg-[#0B0F17] p-3.5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-300">English Caption</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${captionsResult.englishCaption}\n\n${captionsResult.hashtags.join(' ')}`
                        );
                        setCaptionCopied('english');
                        setTimeout(() => setCaptionCopied(null), 2000);
                      }}
                      className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      {captionCopied === 'english' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-200 whitespace-pre-line leading-relaxed">
                    {captionsResult.englishCaption}
                  </p>
                </div>

                {/* Dhivehi Announcement */}
                <div className="space-y-1.5 bg-[#0B0F17] p-3.5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-300">Dhivehi (Thaana) Caption</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${captionsResult.dhivehiCaption}\n\n${captionsResult.hashtags.join(' ')}`
                        );
                        setCaptionCopied('dhivehi');
                        setTimeout(() => setCaptionCopied(null), 2000);
                      }}
                      className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      {captionCopied === 'dhivehi' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p
                    dir="rtl"
                    className="text-xs text-slate-200 whitespace-pre-line leading-relaxed font-thaana text-right"
                  >
                    {captionsResult.dhivehiCaption}
                  </p>
                </div>

                {/* Hashtags */}
                <div className="flex flex-wrap gap-1.5">
                  {captionsResult.hashtags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-purple-950/40 border border-purple-800/40 text-[10px] text-purple-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleGenerateCaptions}
                disabled={isGeneratingCaptions}
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Regenerate</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCaptionsModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
