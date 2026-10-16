import React, { useState } from 'react';
import { Download, Monitor, Share2, Smartphone, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  collapsed?: boolean;
  variant?: 'sidebar' | 'header' | 'card';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  collapsed = false,
  variant = 'sidebar',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // If already running in standalone mode, show an optional installed badge or null
  if (isInstalled) {
    if (variant === 'card') {
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>App is installed and running in Standalone Window Mode</span>
        </div>
      );
    }
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (outcome) {
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 3500);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  // Header variant
  if (variant === 'header') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          title="Install App from Browser"
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-semibold transition-all shadow-sm ${className}`}
        >
          <Download className="w-3.5 h-3.5 text-blue-400" />
          <span>Install App</span>
        </button>

        {showGuideModal && (
          <InstallGuideModal isIOS={isIOS} onClose={() => setShowGuideModal(false)} />
        )}
      </>
    );
  }

  // Card variant (for Settings page)
  if (variant === 'card') {
    return (
      <div className={`p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Install App to Desktop / Mobile</div>
              <div className="text-xs text-slate-400">
                Run Event Photo Branding Studio as a standalone desktop app with zero browser frames
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClick}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Install Now</span>
          </button>
        </div>

        {installSuccess && (
          <div className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Installation completed! You can launch the app directly from your apps list or desktop.</span>
          </div>
        )}

        {showGuideModal && (
          <InstallGuideModal isIOS={isIOS} onClose={() => setShowGuideModal(false)} />
        )}
      </div>
    );
  }

  // Sidebar variant
  return (
    <>
      {collapsed ? (
        <button
          type="button"
          onClick={handleClick}
          title="Install App from Browser (Desktop & Mobile)"
          className="w-full flex items-center justify-center p-2.5 rounded-xl text-blue-400 hover:text-blue-300 hover:bg-blue-600/15 border border-blue-500/30 transition-all shadow-sm group"
        >
          <Download className="w-4 h-4 shrink-0 transition-transform group-hover:-translate-y-0.5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className="w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-medium bg-gradient-to-r from-blue-600/15 to-indigo-600/15 border border-blue-500/30 text-blue-300 hover:text-white hover:border-blue-500/50 hover:from-blue-600/25 hover:to-indigo-600/25 transition-all shadow-sm group text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-blue-600/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
              <Download className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-white truncate text-[11px] leading-tight">Install App</div>
              <div className="text-[10px] text-slate-400 truncate">Run natively in browser</div>
            </div>
          </div>
          <span className="text-[9px] uppercase tracking-wider font-bold bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-400/20 shrink-0">
            PWA
          </span>
        </button>
      )}

      {showGuideModal && (
        <InstallGuideModal isIOS={isIOS} onClose={() => setShowGuideModal(false)} />
      )}
    </>
  );
};

// Guided modal for manual browser installation or iOS Safari
const InstallGuideModal: React.FC<{ isIOS: boolean; onClose: () => void }> = ({
  isIOS,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111726] border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-left">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600/25 border border-blue-500/40 text-blue-400 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Install App to Browser & Desktop</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isIOS ? (
          <div className="space-y-3 text-xs text-slate-300">
            <p className="text-slate-400">
              To install <strong>Event Photo Branding Studio</strong> on your iPhone or iPad:
            </p>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  Tap the <Share2 className="w-3.5 h-3.5 inline mx-1 text-blue-400" />{' '}
                  <strong>Share</strong> button in Safari's bottom toolbar.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  Scroll down the menu and tap <strong>"Add to Home Screen"</strong>.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  Tap <strong>Add</strong> in the top-right corner to launch it like a native app.
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-xs text-slate-300">
            <p className="text-slate-400">
              You can install this app directly from your browser toolbar:
            </p>
            <div className="grid grid-cols-1 gap-2.5">
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <Monitor className="w-4 h-4 text-blue-400" />
                  <span>Chrome / Edge / Brave</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Look for the <strong>Install icon</strong> (<Download className="w-3 h-3 inline mx-0.5 text-blue-400" />) on the right side of the URL address bar, or open the browser menu (⋮) and select <strong>"Install Event Photo Branding Studio"</strong>.
                </p>
              </div>

              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Android Chrome</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Open Chrome's top-right menu (⋮) and tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
