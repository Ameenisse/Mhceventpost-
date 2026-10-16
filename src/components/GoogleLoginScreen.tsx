import React, { useState } from 'react';
import {
  AlertCircle,
  Building2,
  Camera,
  CheckCircle2,
  FolderKanban,
  Layers,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebaseClient';
import { DEFAULT_DEVELOPER_PROFILE, PersistentStorageService } from '../services/persistentStorage';
import { AuthenticatedUserProfile, DeveloperProfileConfig } from '../types/studio';
import { PWAInstallButton } from './PWAInstallButton';

interface GoogleLoginScreenProps {
  onLoginSuccess?: () => void;
  developerProfile?: DeveloperProfileConfig;
  onDirectSignIn?: (profile: AuthenticatedUserProfile) => void;
}

export const GoogleLoginScreen: React.FC<GoogleLoginScreenProps> = ({
  developerProfile,
  onDirectSignIn,
}) => {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const devProfile: DeveloperProfileConfig = developerProfile || DEFAULT_DEVELOPER_PROFILE;
  const transparency = devProfile.photoTransparency ?? 30;
  const effectiveOpacity = (100 - transparency) / 100;

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setErrorMessage(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setErrorMessage('Sign-in popup was closed before completion. Please try again.');
      } else if (code === 'auth/popup-blocked') {
        setErrorMessage(
          'Your browser blocked the sign-in popup. Please allow popups for this site and try again.'
        );
      } else if (code === 'auth/unauthorized-domain') {
        setErrorMessage(
          'This domain is not yet authorized in Firebase Console. Please add this domain under Firebase Authentication settings.'
        );
      } else {
        setErrorMessage(err?.message || 'Failed to authenticate with Google. Please try again.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col justify-between relative overflow-hidden">
      {/* Subtle Ambient Background Gradient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(29,78,216,0.18),_transparent_55%),radial-gradient(ellipse_at_bottom_left,_rgba(16,185,129,0.10),_transparent_50%)]" />

      {/* Top Bar */}
      <header className="relative z-10 h-16 px-6 lg:px-12 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold text-sm">
            EP
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-white">
              Event Photo Branding Studio
            </div>
            <div className="text-[11px] text-slate-400">
              Multi-Organization Cloud Branding · Local RAM Batch Processor
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <PWAInstallButton variant="header" />
          <div className="hidden sm:flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-500/30 px-3 py-1.5 rounded-md">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Zero Cloud Photo Storage · 100% Local</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10 my-auto">
        <div className="max-w-5xl w-full space-y-8">
          {/* Top Hero Section with Developer Card on the right side of text */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8 bg-[#111726]/70 border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="space-y-4 text-left flex-1 min-w-0">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-950/60 border border-blue-500/30 text-blue-300 text-xs font-medium shadow-inner">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Set Up Organization & Event Once · Reuse Forever</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-[1.2]">
                Professional Event Photo Branding Studio
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                Sign in with your Google account to manage unlimited organizations, reusable event
                configurations, Dhivehi RTL typography in Mv Eamaan XP &amp; Faruma font, interactive linear gradient banners, and
                sponsor logo libraries across devices — while processing event photographs strictly in
                temporary browser memory.
              </p>
            </div>

            {/* Developer Card on the right side of text */}
            <div className="shrink-0 flex flex-col items-center">
              <div className="relative group w-44 sm:w-52 rounded-2xl overflow-hidden border border-slate-800/90 bg-[#111726] shadow-2xl shadow-blue-950/40 transition-all duration-300 hover:scale-[1.02] hover:border-blue-500/40">
                <div className="aspect-[9/16] w-full overflow-hidden relative bg-[#0B0F17]">
                  <img
                    src={devProfile.photoUrl || '/amin-isse.jpg'}
                    alt={`Develop by: ${devProfile.developerName || 'Amin Isse'}`}
                    className="w-full h-full object-cover object-top transition-opacity duration-300"
                    style={{ opacity: effectiveOpacity }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/amin-isse.svg';
                    }}
                  />
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none" />
                </div>
                <div className="absolute inset-x-0 bottom-0 py-2.5 px-3 text-center bg-black/75 backdrop-blur-md border-t border-slate-800/60">
                  <div className="text-xs font-bold text-white tracking-wide">
                    Develop by: {devProfile.developerName || 'Amin Isse'}
                  </div>
                  {devProfile.designation && (
                    <div className="text-[10px] text-blue-300 mt-0.5 line-clamp-1">
                      {devProfile.designation}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Middle Row: Two Value-Proposition Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 sm:p-5 rounded-xl bg-[#111726]/90 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-400">
                <Building2 className="w-4 h-4" />
                <span>Unlimited Organizations & Events</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Save Main Logo 1 & 2, addresses, social links, sponsor bars, and custom Dhivehi
                fonts permanently under your Google account.
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-xl bg-[#111726]/90 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <Camera className="w-4 h-4" />
                <span>Volatile Local Batch Rendering</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Import 100+ event photos in memory, apply saved branding at full original
                resolution with lossless logo quality, export to folder or ZIP, and auto-clear temporary photos.
              </p>
            </div>
          </div>

          {/* Bottom Row: Centered Sign in to Your Studio Card */}
          <div className="max-w-2xl mx-auto w-full">
            <div className="bg-[#111726] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
              <div className="space-y-2 text-center">
                <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 mx-auto">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-white">Sign in to Your Studio</h2>
                <p className="text-xs text-slate-400">
                  Authenticate with Google to access your organizations, events, and reusable
                  logo assets.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-500/40 flex items-start gap-2.5 text-xs text-rose-200">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1">{errorMessage}</div>
                </div>
              )}

              <div className="space-y-3">
                {/* Official Google OAuth Sign-in */}
                <button
                  type="button"
                  disabled={isSigningIn}
                  onClick={handleGoogleSignIn}
                  className="w-full py-3 px-4 bg-white hover:bg-slate-100 disabled:opacity-60 text-slate-900 font-semibold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer"
                >
                  {isSigningIn ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      <span>Connecting to Google...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>
              </div>

              <div className="pt-4 border-t border-slate-800/80 space-y-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Strict per-account data isolation via Firebase UID Security Rules</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>
                    Imported event photographs stay in local RAM and are never uploaded
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 h-14 px-6 lg:px-12 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <div>Event Photo Branding Studio · High Performance Batch Photography Processing</div>
        <div className="flex items-center gap-3">
          <span className="text-slate-400 font-medium tracking-wide">
            powered by: <span className="text-slate-200 font-semibold">Tahiyyah investment</span>
          </span>
          <span className="text-slate-700">|</span>
          <span>Local Batch Photography Studio</span>
        </div>
      </footer>
    </div>
  );
};
