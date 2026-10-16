import React, { useRef, useState } from 'react';
import {
  Check,
  FileType,
  Plus,
  Settings,
  ShieldCheck,
  Trash2,
  Type,
  Upload,
} from 'lucide-react';
import {
  AuthenticatedUserProfile,
  CustomFontAsset,
  EventConfiguration,
} from '../types/studio';
import { PWAInstallButton } from './PWAInstallButton';

interface SettingsPageProps {
  user: AuthenticatedUserProfile;
  fonts: CustomFontAsset[];
  activeEvent: EventConfiguration;
  onSaveFonts: (nextFonts: CustomFontAsset[]) => void;
  onUpdateActiveEvent: (updater: (prev: EventConfiguration) => EventConfiguration) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  user,
  fonts,
  activeEvent,
  onSaveFonts,
  onUpdateActiveEvent,
}) => {
  const [fontName, setFontName] = useState('');
  const [isRtlOptimized, setIsRtlOptimized] = useState(true);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [sampleTextDhivehi, setSampleTextDhivehi] = useState(
    'ދިވެހިރާއްޖޭގެ ފަތުރުވެރިކަމުގެ ރަންޔޫބީލް ޙަފްލާ 2026'
  );
  const [sampleTextEnglish, setSampleTextEnglish] = useState(
    'Event Photo Branding Studio — High Resolution Typography'
  );
  const fontFileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadCustomFont = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const cleanName = fontName.trim() || file.name.replace(/\.[^/.]+$/, '');
    const familyToken = cleanName.replace(/[^a-zA-Z0-9_-]/g, '');

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        const fontFace = new FontFace(familyToken, `url(${dataUrl})`);
        const loadedFace = await fontFace.load();
        document.fonts.add(loadedFace);
      } catch (err) {
        console.warn('Custom font registration warning:', err);
      }

      const newFont: CustomFontAsset = {
        id: `font-${Date.now()}`,
        ownerUid: user.uid,
        name: cleanName,
        family: `'${familyToken}', 'Mv_Eamaan_XP', 'Faruma', sans-serif`,
        isRtlOptimized,
        dataUrl,
        createdAt: new Date().toISOString(),
      };

      onSaveFonts([newFont, ...fonts]);
      setFontName('');
      setUploadStatus(`Custom font "${cleanName}" uploaded and registered for Canvas rendering.`);
      setTimeout(() => setUploadStatus(null), 4000);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteFont = (fontId: string) => {
    onSaveFonts(fonts.filter((f) => f.id !== fontId));
  };

  const handleApplyFontToActiveEvent = (font: CustomFontAsset) => {
    onUpdateActiveEvent((prev) => ({
      ...prev,
      textConfig: {
        ...prev.textConfig,
        fontFamily: font.family,
        direction: font.isRtlOptimized ? 'rtl' : prev.textConfig.direction,
      },
    }));
    setUploadStatus(`Applied "${font.name}" to current event "${activeEvent.title}".`);
    setTimeout(() => setUploadStatus(null), 3000);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0B0F17] p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white">
                Studio Settings & Custom Fonts
              </h1>
              <p className="text-xs text-slate-400">
                Upload custom Dhivehi Thaana & English fonts (.TTF, .OTF, .WOFF2) and configure default export quality
              </p>
            </div>
          </div>
        </div>

        {uploadStatus && (
          <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{uploadStatus}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 5 Cols: Add Custom Font Form */}
          <div className="lg:col-span-5 bg-[#111726] border border-slate-800 rounded-2xl p-5 space-y-4 self-start">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Plus className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">Add Custom Font</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Font Display Name
                </label>
                <input
                  type="text"
                  value={fontName}
                  onChange={(e) => setFontName(e.target.value)}
                  placeholder="e.g. MV Faseyha / Custom Thaana Bold"
                  className="w-full px-3 py-2 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isRtlOptimized}
                  onChange={(e) => setIsRtlOptimized(e.target.checked)}
                  className="rounded border-slate-700 text-blue-600"
                />
                <span>Optimized for Dhivehi (Thaana RTL Script)</span>
              </label>

              <div
                onClick={() => fontFileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-[#0B0F17]/60 space-y-2"
              >
                <Upload className="w-8 h-8 text-emerald-400 mx-auto" />
                <div className="text-xs font-semibold text-white">
                  Click to Select Font File (.TTF, .OTF, .WOFF, .WOFF2)
                </div>
                <p className="text-[11px] text-slate-400">
                  Font is immediately registered in the browser & synced to your account for event titles.
                </p>
                <input
                  ref={fontFileInputRef}
                  type="file"
                  accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
                  onChange={handleUploadCustomFont}
                  className="hidden"
                />
              </div>
            </div>

            {/* Live Preview Tester Input */}
            <div className="pt-3 border-t border-slate-800 space-y-2.5">
              <div className="text-xs font-semibold text-slate-300">
                Live Font Preview Text
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">
                  Dhivehi RTL Sample Text
                </label>
                <input
                  type="text"
                  dir="rtl"
                  value={sampleTextDhivehi}
                  onChange={(e) => setSampleTextDhivehi(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-white font-thaana"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">
                  English LTR Sample Text
                </label>
                <input
                  type="text"
                  value={sampleTextEnglish}
                  onChange={(e) => setSampleTextEnglish(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-white"
                />
              </div>
            </div>
          </div>

          {/* Right 7 Cols: Custom Fonts Library & Export Quality Settings */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#111726] border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Type className="w-4 h-4 text-blue-400" />
                  <h2 className="text-sm font-bold text-white">
                    Installed & Custom Fonts ({fonts.length})
                  </h2>
                </div>
                <span className="text-[11px] text-slate-400">
                  Click "Use in Event" to apply to active event
                </span>
              </div>

              {fonts.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No custom fonts uploaded yet. Upload a .TTF or .WOFF2 font on the left.
                </div>
              ) : (
                <div className="space-y-3">
                  {fonts.map((font) => {
                    const isCurrent = activeEvent?.textConfig.fontFamily === font.family;
                    return (
                      <div
                        key={font.id}
                        className={`p-4 rounded-xl border transition-all space-y-2.5 ${
                          isCurrent
                            ? 'bg-blue-950/25 border-blue-500/60'
                            : 'bg-[#0B0F17] border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <FileType className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-bold text-white">{font.name}</span>
                            {font.isRtlOptimized && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300">
                                Dhivehi RTL
                              </span>
                            )}
                            {font.dataUrl && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                                Custom Uploaded
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleApplyFontToActiveEvent(font)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                                isCurrent
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                              }`}
                            >
                              {isCurrent ? 'Active on Event' : 'Use in Event'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteFont(font.id)}
                              title="Remove Font"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Live Rendered Sample */}
                        <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800/80 space-y-1.5">
                          {font.isRtlOptimized && (
                            <div
                              dir="rtl"
                              style={{ fontFamily: font.family }}
                              className="text-base text-white font-bold"
                            >
                              {sampleTextDhivehi}
                            </div>
                          )}
                          <div
                            dir="ltr"
                            style={{ fontFamily: font.family }}
                            className="text-xs text-slate-300"
                          >
                            {sampleTextEnglish}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Original Quality & HD Banner Guarantee Settings */}
            <div className="bg-[#111726] border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-white">
                  Original Photo Resolution & HD Vector Overlay Settings
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Output Format
                  </label>
                  <select
                    value={activeEvent.exportConfig.format}
                    onChange={(e) =>
                      onUpdateActiveEvent((prev) => ({
                        ...prev,
                        exportConfig: {
                          ...prev.exportConfig,
                          format: e.target.value as 'image/jpeg' | 'image/png' | 'image/webp',
                        },
                      }))
                    }
                    className="w-full px-3 py-2 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-white"
                  >
                    <option value="image/jpeg">JPEG (Maximum Quality 95%–100%)</option>
                    <option value="image/png">PNG (Lossless Uncompressed)</option>
                    <option value="image/webp">WEBP (High Efficiency HD)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Resolution Mode
                  </label>
                  <select
                    value={activeEvent.exportConfig.resolutionMode}
                    onChange={(e) =>
                      onUpdateActiveEvent((prev) => ({
                        ...prev,
                        exportConfig: {
                          ...prev.exportConfig,
                          resolutionMode: e.target.value as 'original' | '4k' | '2k' | '1080p',
                        },
                      }))
                    }
                    className="w-full px-3 py-2 text-xs bg-[#0B0F17] border border-slate-700 rounded-lg text-white"
                  >
                    <option value="original">
                      Keep Original Image Size + HD Super-Sampled Banner (Default)
                    </option>
                    <option value="4k">4K UHD (3840px)</option>
                    <option value="2k">2K QHD (2560px)</option>
                    <option value="1080p">Full HD (1920px)</option>
                  </select>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Uploaded photos keep their exact original width and height. Even when a low-resolution photo is uploaded, banner text and logos are rendered using high-density vector supersampling so typography and logos stay crisp and clear.
              </p>
            </div>

            {/* PWA / Browser App Installation Card */}
            <div className="rounded-2xl bg-[#111726] border border-slate-800 p-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Browser App Installation (PWA)</h3>
                  <p className="text-xs text-slate-400">
                    Run Event Photo Branding Studio on your desktop or mobile device without address bars
                  </p>
                </div>
              </div>

              <PWAInstallButton variant="card" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
