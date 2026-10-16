import React from 'react';
import { Ban, LogOut } from 'lucide-react';
import { AuthenticatedUserProfile, DeveloperProfileConfig } from '../types/studio';
import { DEFAULT_DEVELOPER_PROFILE, SUPER_ADMIN_EMAIL } from '../services/persistentStorage';

interface SuspendedScreenProps {
  user: AuthenticatedUserProfile;
  onSignOut: () => void;
  developerProfile?: DeveloperProfileConfig;
}

export const SuspendedScreen: React.FC<SuspendedScreenProps> = ({
  user,
  onSignOut,
  developerProfile = DEFAULT_DEVELOPER_PROFILE,
}) => {
  const transparency = developerProfile.photoTransparency ?? 30;
  const effectiveOpacity = (100 - transparency) / 100;

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col justify-between relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(225,29,72,0.15),_transparent_60%)]" />

      <header className="relative z-10 h-16 px-6 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400 font-bold text-sm">
            EP
          </div>
          <div className="text-sm font-bold text-white">Event Photo Branding Studio</div>
        </div>
        <button
          onClick={onSignOut}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10 my-auto">
        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Account Suspended Notice */}
          <div className="lg:col-span-7 bg-[#111726] border border-rose-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl text-left space-y-6">
            <div className="w-12 h-12 rounded-xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Ban className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-rose-950/70 border border-rose-500/40 text-rose-300 uppercase tracking-wide">
                Account Suspended
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Access Suspended
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Your access to Event Photo Branding Studio has been suspended by the Super Admin.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-left text-xs space-y-1">
              <div className="text-slate-500">Account:</div>
              <div className="font-semibold text-white">{user.displayName}</div>
              <div className="text-slate-400">{user.email}</div>
            </div>

            <div className="space-y-3 pt-2">
              <p className="text-xs text-slate-400">
                For account reinstatement requests, please contact:
                <br />
                <span className="font-mono text-blue-400 font-semibold">{SUPER_ADMIN_EMAIL}</span>
              </p>

              <button
                onClick={onSignOut}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Right Column: Developer Card Set from Super Admin */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center space-y-4">
            <div className="relative group w-52 sm:w-60 rounded-2xl overflow-hidden border border-slate-800/90 bg-[#111726] shadow-2xl shadow-blue-950/40 transition-all duration-300 hover:scale-[1.02]">
              <div className="aspect-[9/16] w-full overflow-hidden relative bg-[#0B0F17]">
                <img
                  src={developerProfile.photoUrl || '/amin-isse.jpg'}
                  alt={`Develop by: ${developerProfile.developerName || 'Amin Isse'}`}
                  className="w-full h-full object-cover object-top transition-opacity duration-300"
                  style={{ opacity: effectiveOpacity }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/amin-isse.svg';
                  }}
                />
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none" />
              </div>

              <div className="absolute inset-x-0 bottom-0 py-3 px-3.5 text-center bg-black/75 backdrop-blur-md border-t border-slate-800/60">
                <div className="text-xs font-bold text-white tracking-wide">
                  Develop by: {developerProfile.developerName || 'Amin Isse'}
                </div>
                {developerProfile.designation && (
                  <div className="text-[11px] text-blue-300 mt-0.5 line-clamp-1">
                    {developerProfile.designation}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 h-12 px-6 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
        <div>Event Photo Branding Studio</div>
        <div>Super Admin Access Gate</div>
      </footer>
    </div>
  );
};
