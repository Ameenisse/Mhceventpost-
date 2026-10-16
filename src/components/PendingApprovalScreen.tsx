import React, { useState } from 'react';
import {
  Clock,
  LogOut,
  Mail,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import { AuthenticatedUserProfile, DeveloperProfileConfig } from '../types/studio';
import { SUPER_ADMIN_EMAIL } from '../services/persistentStorage';
import { PWAInstallButton } from './PWAInstallButton';

interface PendingApprovalScreenProps {
  user: AuthenticatedUserProfile;
  developerProfile: DeveloperProfileConfig;
  onRefreshStatus: () => void;
  onSignOut: () => void;
}

export const PendingApprovalScreen: React.FC<PendingApprovalScreenProps> = ({
  user,
  developerProfile,
  onRefreshStatus,
  onSignOut,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefreshStatus();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const transparency = developerProfile.photoTransparency ?? 30;
  const effectiveOpacity = (100 - transparency) / 100;

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col justify-between relative overflow-hidden">
      {/* Background Lighting */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.12),_transparent_60%),radial-gradient(ellipse_at_bottom_left,_rgba(37,99,235,0.10),_transparent_55%)]" />

      {/* Top Header */}
      <header className="relative z-10 h-16 px-6 lg:px-12 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-sm">
            EP
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-white">
              Event Photo Branding Studio
            </div>
            <div className="text-[11px] text-slate-400">
              Access Verification & Sign-Up Gate
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <PWAInstallButton />
          <button
            onClick={onSignOut}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Center Main Stage */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10 my-auto">
        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Sign-Up Pending Notice */}
          <div className="lg:col-span-7 space-y-6 bg-[#111726] border border-amber-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-amber-950/20">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-amber-950/70 border border-amber-500/40 text-amber-300 uppercase tracking-wide">
                Sign-Up Request Received
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Account Pending Approval
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Thank you for registering. Access to the Event Photo Branding Studio requires approval by the Super Admin (<span className="text-amber-300 font-semibold">{SUPER_ADMIN_EMAIL}</span>).
              </p>
            </div>

            {/* User Profile Card */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Requested Account Details
              </div>
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    className="w-10 h-10 rounded-full border border-slate-700 object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-900/50 border border-blue-500/30 flex items-center justify-center text-blue-300 font-bold text-sm">
                    {user.displayName.slice(0, 2) || 'US'}
                  </div>
                )}
                <div>
                  <div className="text-sm font-semibold text-white">{user.displayName}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>{user.email}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Checking Status...' : 'Check Approval Status'}</span>
              </button>

              <button
                onClick={onSignOut}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500 italic">
              Once approved by the Super Admin, clicking "Check Approval Status" will immediately unlock full studio workspace features.
            </p>
          </div>

          {/* Right Column: Developer Card */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center space-y-4">
            <div className="relative group w-52 sm:w-60 rounded-2xl overflow-hidden border border-slate-800/90 bg-[#111726] shadow-2xl shadow-blue-950/40 transition-all duration-300 hover:scale-[1.02]">
              <div className="aspect-[9/16] w-full overflow-hidden relative bg-[#0B0F17]">
                <img
                  src={developerProfile.photoUrl || '/amin-isse.jpg'}
                  alt={`Develop by: ${developerProfile.developerName || 'Amin Isse'}`}
                  className="w-full h-full object-cover object-top transition-opacity duration-300"
                  style={{ opacity: effectiveOpacity }}
                />
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none" />
              </div>

              <div className="absolute inset-x-0 bottom-0 py-3 px-3.5 text-center bg-black/75 backdrop-blur-md border-t border-slate-800/60">
                <div className="text-xs font-bold text-white tracking-wide">
                  Develop by: {developerProfile.developerName || 'Amin Isse'}
                </div>
                {developerProfile.designation && (
                  <div className="text-[10px] text-blue-300 mt-0.5 line-clamp-1">
                    {developerProfile.designation}
                  </div>
                )}
              </div>
            </div>

            <div className="text-center">
              <span className="text-[11px] text-slate-500">
                Super Admin Contact: <span className="text-slate-400 font-mono">{SUPER_ADMIN_EMAIL}</span>
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 h-12 px-6 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
        <div>Event Photo Branding Studio</div>
        <div>Super Admin Approval Gate</div>
      </footer>
    </div>
  );
};
