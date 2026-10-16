import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Award,
  Ban,
  Building2,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  FolderKanban,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  UserMinus,
  Users,
  UserX,
  X,
} from 'lucide-react';
import {
  DeveloperProfileConfig,
  EventConfiguration,
  OrganizationProfile,
  RegisteredUserRecord,
  UserApprovalStatus,
} from '../types/studio';
import {
  PersistentStorageService,
  SUPER_ADMIN_EMAIL,
} from '../services/persistentStorage';

interface SuperAdminPanelProps {
  currentUserEmail: string;
  developerProfile: DeveloperProfileConfig;
  onUpdateDeveloperProfile: (profile: DeveloperProfileConfig) => void;
  onNavigateHome?: () => void;
}

export const SuperAdminPanel: React.FC<SuperAdminPanelProps> = ({
  currentUserEmail,
  developerProfile,
  onUpdateDeveloperProfile,
}) => {
  const [activeTab, setActiveTab] = useState<
    'users' | 'organizations' | 'events' | 'developer'
  >('users');

  // 1. Users state
  const [users, setUsers] = useState<RegisteredUserRecord[]>(() =>
    PersistentStorageService.getRegisteredUsers()
  );
  const [userFilter, setUserFilter] = useState<'all' | UserApprovalStatus>('all');
  const [userSearch, setUserSearch] = useState('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<RegisteredUserRecord | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // 2. All Organizations state
  const [allOrgs, setAllOrgs] = useState<OrganizationProfile[]>([]);
  const [orgSearch, setOrgSearch] = useState('');
  const [selectedOrgDetails, setSelectedOrgDetails] = useState<OrganizationProfile | null>(null);

  // 3. All Events state
  const [allEvents, setAllEvents] = useState<EventConfiguration[]>([]);
  const [eventSearch, setEventSearch] = useState('');
  const [selectedEventDetails, setSelectedEventDetails] = useState<EventConfiguration | null>(null);

  // 4. Developer profile edit state
  const [devPhotoUrl, setDevPhotoUrl] = useState<string>(developerProfile.photoUrl);
  const [devTransparency, setDevTransparency] = useState<number>(
    developerProfile.photoTransparency ?? 30
  );
  const [devName, setDevName] = useState<string>(developerProfile.developerName);
  const [devDesignation, setDevDesignation] = useState<string>(developerProfile.designation);
  const [devBio, setDevBio] = useState<string>(developerProfile.bio || '');
  const [devSavedSuccess, setDevSavedSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load global organizations and events when switching tabs
  React.useEffect(() => {
    (async () => {
      const orgs = await PersistentStorageService.getAllOrganizationsAcrossUsers();
      setAllOrgs(orgs);
      const evts = await PersistentStorageService.getAllEventsAcrossUsers();
      setAllEvents(evts);
    })();
  }, [activeTab]);

  const showNotification = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  // User Approval Handlers
  const handleApproveUser = async (uid: string, name: string) => {
    const updated = await PersistentStorageService.updateUserStatus(uid, 'approved');
    setUsers([...updated]);
    showNotification(`User "${name}" has been approved. They now have full studio access.`);
  };

  const handleSuspendUser = async (uid: string, name: string) => {
    const updated = await PersistentStorageService.updateUserStatus(uid, 'suspended');
    setUsers([...updated]);
    showNotification(`User "${name}" has been suspended from studio access.`);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    const targetUid = userToDelete.uid;
    const targetName = userToDelete.displayName;
    try {
      const updated = await PersistentStorageService.deleteUser(targetUid);
      setUsers([...updated]);
      const [o, e] = await Promise.all([
        PersistentStorageService.getAllOrganizationsAcrossUsers(),
        PersistentStorageService.getAllEventsAcrossUsers(),
      ]);
      setAllOrgs(o);
      setAllEvents(e);
      showNotification(`User "${targetName}" and associated data permanently deleted.`);
      setUserToDelete(null);
    } catch (err) {
      console.error('Failed to delete user:', err);
      showNotification(`Failed to delete user "${targetName}".`);
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Developer Profile Handlers

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const res = ev.target?.result as string;
      if (res) {
        setDevPhotoUrl(res);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetOriginalPhoto = () => {
    setDevPhotoUrl('/amin-isse.jpg');
    setDevTransparency(30); // 30% transparency as requested
  };

  const handleSaveDeveloperProfile = async () => {
    const updatedProfile: DeveloperProfileConfig = {
      photoUrl: devPhotoUrl,
      photoTransparency: devTransparency,
      developerName: devName.trim() || 'Amin Isse',
      designation: devDesignation.trim() || 'Lead Developer & Solutions Architect',
      bio: devBio.trim(),
      updatedAt: new Date().toISOString(),
    };
    await PersistentStorageService.saveDeveloperProfile(updatedProfile);
    onUpdateDeveloperProfile(updatedProfile);
    setDevSavedSuccess(true);
    showNotification('Developer profile and transparency updated successfully across the app!');
    setTimeout(() => setDevSavedSuccess(false), 3000);
  };

  // Filtered lists
  const pendingCount = users.filter((u) => u.status === 'pending').length;
  const approvedCount = users.filter((u) => u.status === 'approved').length;
  const suspendedCount = users.filter((u) => u.status === 'suspended').length;

  const filteredUsers = users.filter((u) => {
    if (userFilter !== 'all' && u.status !== userFilter) return false;
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      return (
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredOrgs = allOrgs.filter((o) => {
    if (!orgSearch.trim()) return true;
    const q = orgSearch.toLowerCase();
    return (
      o.name.toLowerCase().includes(q) ||
      (o.nameDhivehi && o.nameDhivehi.includes(q)) ||
      (o.address && o.address.toLowerCase().includes(q)) ||
      (o.ownerUid && o.ownerUid.toLowerCase().includes(q))
    );
  });

  const filteredEvents = allEvents.filter((e) => {
    if (!eventSearch.trim()) return true;
    const q = eventSearch.toLowerCase();
    return (
      e.title.toLowerCase().includes(q) ||
      e.venue.toLowerCase().includes(q) ||
      e.date.includes(q)
    );
  });

  return (
    <div className="flex-1 bg-[#0B0F17] text-slate-100 flex flex-col overflow-y-auto">
      {/* Top Banner Header */}
      <div className="border-b border-slate-800 bg-[#0F172A]/80 backdrop-blur-md px-6 py-5 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold shadow-lg shadow-amber-950/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">Super Admin Panel</h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Master Control
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Logged in as <span className="text-white font-medium">{currentUserEmail}</span> (Super Admin) · Approve signups, manage developer profile & inspect all organizations & events
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-3 text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-400">Users:</span>
              <span className="font-semibold text-white">{users.length}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-500/40 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-300">Pending:</span>
              <span className="font-bold text-amber-300">{pendingCount}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">Orgs:</span>
              <span className="font-semibold text-white">{allOrgs.length}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center gap-2">
              <FolderKanban className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-slate-400">Events:</span>
              <span className="font-semibold text-white">{allEvents.length}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto flex items-center gap-2 mt-5 border-t border-slate-800/80 pt-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>User Sign-Up Requests</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-black">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('organizations')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'organizations'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>All Organizations ({allOrgs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('events')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'events'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FolderKanban className="w-4 h-4" />
            <span>All Events ({allEvents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('developer')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'developer'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Developer Profile & Transparency</span>
          </button>
        </div>
      </div>

      {/* Floating Action Notice Toast */}
      {actionNotice && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-slate-900 border border-blue-500/50 text-white text-xs shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Main Tab Content */}
      <div className="max-w-7xl mx-auto w-full p-6 space-y-6">
        {/* ========================================================================= */}
        {/* TAB 1: USER SIGN-UP REQUESTS & APPROVAL                                    */}
        {/* ========================================================================= */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Header controls: Search & Filter Tabs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#111726] border border-slate-800 p-4 rounded-xl">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setUserFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    userFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  All ({users.length})
                </button>
                <button
                  onClick={() => setUserFilter('pending')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    userFilter === 'pending'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-800 text-amber-300 hover:bg-slate-700'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>Pending Approval ({pendingCount})</span>
                </button>
                <button
                  onClick={() => setUserFilter('approved')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    userFilter === 'approved'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-emerald-300 hover:bg-slate-700'
                  }`}
                >
                  <Check className="w-3 h-3" />
                  <span>Approved ({approvedCount})</span>
                </button>
                <button
                  onClick={() => setUserFilter('suspended')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    userFilter === 'suspended'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-800 text-rose-300 hover:bg-slate-700'
                  }`}
                >
                  <Ban className="w-3 h-3" />
                  <span>Suspended ({suspendedCount})</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>


            {/* Users Table / List */}
            <div className="bg-[#111726] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-medium">
                      <th className="py-3 px-4">User / Photographer</th>
                      <th className="py-3 px-4">Role & Status</th>
                      <th className="py-3 px-4">Requested At</th>
                      <th className="py-3 px-4">Workspace Data</th>
                      <th className="py-3 px-4 text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-500">
                          No users found matching current filter or search query.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const isSelf = u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
                        return (
                          <tr key={u.uid} className="hover:bg-slate-900/40 transition-colors">
                            {/* User details */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                {u.photoURL ? (
                                  <img
                                    src={u.photoURL}
                                    alt={u.displayName}
                                    className="w-9 h-9 rounded-full object-cover border border-slate-700"
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-full bg-blue-900/50 border border-blue-500/30 flex items-center justify-center text-blue-300 font-bold text-xs uppercase">
                                    {u.displayName.slice(0, 2) || 'US'}
                                  </div>
                                )}
                                <div>
                                  <div className="font-semibold text-white flex items-center gap-2">
                                    <span>{u.displayName}</span>
                                    {isSelf && (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                                        Super Admin
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400">{u.email}</div>
                                </div>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                {u.status === 'pending' && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-950/60 text-amber-300 border border-amber-500/40 animate-pulse">
                                    <Clock className="w-3 h-3" />
                                    <span>Pending Approval</span>
                                  </span>
                                )}
                                {u.status === 'approved' && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-500/40">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Approved</span>
                                  </span>
                                )}
                                {u.status === 'suspended' && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-rose-950/60 text-rose-300 border border-rose-500/40">
                                    <Ban className="w-3 h-3" />
                                    <span>Suspended</span>
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Date */}
                            <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                              {u.requestedAt ? new Date(u.requestedAt).toLocaleString() : 'N/A'}
                            </td>

                            {/* Data counts */}
                            <td className="py-3.5 px-4 text-slate-300 text-[11px]">
                              <span className="text-slate-400">Orgs:</span>{' '}
                              <span className="font-semibold text-white">
                                {u.organizationCount ?? 0}
                              </span>{' '}
                              · <span className="text-slate-400">Events:</span>{' '}
                              <span className="font-semibold text-white">{u.eventCount ?? 0}</span>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right">
                              {isSelf ? (
                                <span className="text-xs text-slate-500 italic">Protected</span>
                              ) : (
                                <div className="flex items-center justify-end gap-2">
                                  {u.status === 'pending' && (
                                    <>
                                      <button
                                        onClick={() => handleApproveUser(u.uid, u.displayName)}
                                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-colors cursor-pointer"
                                        title="Approve user sign-up"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Approve</span>
                                      </button>
                                      <button
                                        onClick={() => setUserToDelete(u)}
                                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 text-rose-400 hover:text-rose-200 border border-slate-700 hover:border-rose-500/40 font-medium text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                        title="Reject & delete sign-up request"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Reject</span>
                                      </button>
                                    </>
                                  )}

                                  {u.status === 'approved' && (
                                    <>
                                      <button
                                        onClick={() => handleSuspendUser(u.uid, u.displayName)}
                                        className="px-2.5 py-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-500/40 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                                        title="Suspend this user"
                                      >
                                        <Ban className="w-3.5 h-3.5" />
                                        <span>Suspend</span>
                                      </button>
                                      <button
                                        onClick={() => setUserToDelete(u)}
                                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 border border-slate-700 transition-colors cursor-pointer"
                                        title="Delete user and all data"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}

                                  {u.status === 'suspended' && (
                                    <>
                                      <button
                                        onClick={() => handleApproveUser(u.uid, u.displayName)}
                                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                                        title="Reactivate this suspended user"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Reactivate</span>
                                      </button>
                                      <button
                                        onClick={() => setUserToDelete(u)}
                                        className="px-2.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                                        title="Permanently delete this suspended user and all workspace data"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Delete User</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ALL ORGANIZATIONS (GLOBAL AUDIT)                                   */}
        {/* ========================================================================= */}
        {activeTab === 'organizations' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#111726] border border-slate-800 p-4 rounded-xl">
              <div>
                <h2 className="text-sm font-bold text-white">Global Organizations Library</h2>
                <p className="text-xs text-slate-400">
                  Total organizations created across all registered studio photographers: {allOrgs.length}
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search organizations..."
                  value={orgSearch}
                  onChange={(e) => setOrgSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrgs.length === 0 ? (
                <div className="col-span-full py-16 text-center text-slate-500 text-xs bg-[#111726]/60 border border-slate-800 rounded-xl space-y-1">
                  <Building2 className="w-8 h-8 text-slate-600 mx-auto" />
                  <div className="text-slate-400 font-semibold">No Organizations Found</div>
                  <div>No organizations created yet across registered photographers.</div>
                </div>
              ) : (
                filteredOrgs.map((org) => {
                const orgEvents = allEvents.filter((e) => e.primaryOrgId === org.id);
                return (
                  <div
                    key={org.id}
                    className="p-5 rounded-xl bg-[#111726] border border-slate-800 hover:border-blue-500/40 transition-all flex flex-col justify-between space-y-4 shadow-lg group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-white text-sm group-hover:text-blue-300 transition-colors">
                            {org.name}
                          </h3>
                          {org.nameDhivehi && (
                            <div className="text-xs text-emerald-400 font-thaana mt-0.5">
                              {org.nameDhivehi}
                            </div>
                          )}
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-950 border border-blue-500/30 text-blue-300 shrink-0">
                          {orgEvents.length} {orgEvents.length === 1 ? 'Event' : 'Events'}
                        </span>
                      </div>

                      {org.address && (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="truncate">{org.address}</span>
                        </div>
                      )}

                      <div className="text-[11px] text-slate-500">
                        Owner UID: <span className="text-slate-400 font-mono">{org.ownerUid?.slice(0, 16) || 'System'}...</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                      <span>Header Layout: {org.headerPosition || 'top-right'}</span>
                      <button
                        onClick={() => setSelectedOrgDetails(org)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>
                    </div>
                  </div>
                );
              })
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: ALL EVENTS (GLOBAL AUDIT)                                          */}
        {/* ========================================================================= */}
        {activeTab === 'events' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#111726] border border-slate-800 p-4 rounded-xl">
              <div>
                <h2 className="text-sm font-bold text-white">Global Events & Branding Configurations</h2>
                <p className="text-xs text-slate-400">
                  Total saved events across all registered photographers: {allEvents.length}
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search events, venues, dates..."
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEvents.length === 0 ? (
                <div className="col-span-full py-16 text-center text-slate-500 text-xs bg-[#111726]/60 border border-slate-800 rounded-xl space-y-1">
                  <FolderKanban className="w-8 h-8 text-slate-600 mx-auto" />
                  <div className="text-slate-400 font-semibold">No Events Found</div>
                  <div>No branding events created yet across registered photographers.</div>
                </div>
              ) : (
                filteredEvents.map((evt) => {
                const parentOrg = allOrgs.find((o) => o.id === evt.primaryOrgId);
                const sponsorCount =
                  (evt.sponsorsConfig?.selectedSponsorIds?.length || 0) +
                  (evt.sponsorsConfig?.selectedParticipantIds?.length || 0);

                return (
                  <div
                    key={evt.id}
                    className="p-5 rounded-xl bg-[#111726] border border-slate-800 hover:border-purple-500/40 transition-all flex flex-col justify-between space-y-4 shadow-lg group"
                  >
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-purple-400 mb-1">
                          <Building2 className="w-3 h-3" />
                          <span>{parentOrg?.name || 'Assigned Organization'}</span>
                        </div>
                        <h3 className="font-bold text-white text-sm group-hover:text-purple-300 transition-colors font-thaana">
                          {evt.title}
                        </h3>
                        {evt.textConfig?.subtitle && (
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            {evt.textConfig.subtitle}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-400">
                        {evt.date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>{evt.date}</span>
                          </div>
                        )}
                        {evt.venue && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="truncate">{evt.venue}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Award className="w-3.5 h-3.5 text-amber-400" />
                        <span>{sponsorCount} Sponsors/Logos</span>
                      </div>
                      <button
                        onClick={() => setSelectedEventDetails(evt)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>
                    </div>
                  </div>
                );
              })
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: DEVELOPER PROFILE & TRANSPARENCY SETTINGS                          */}
        {/* ========================================================================= */}
        {activeTab === 'developer' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left 7 cols: Form Controls */}
            <div className="lg:col-span-7 space-y-6 bg-[#111726] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-950/60 border border-blue-500/30 text-blue-300 text-xs font-semibold mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Developer Branding & Credit Card</span>
                </div>
                <h2 className="text-xl font-bold text-white">Super Admin Profile Settings</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Configure the developer portrait photo, transparency percentage, developer name, and designation displayed on the home page and throughout the studio.
                </p>
              </div>

              {/* Developer Photo Upload */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <label className="text-xs font-semibold text-slate-300 block">
                  Developer Photo / Portrait
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-blue-600/30"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Developer Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetOriginalPhoto}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-2 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                    <span>Paste Same Original Image (30% Transparency)</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Supports high-resolution PNG, JPG, or WebP. Defaults to original photo (<code className="text-slate-400 font-mono">/amin-isse.jpg</code>).
                </p>
              </div>

              {/* Transparency Slider */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block">
                      Photo Transparency Percentage
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Controls the background fade transparency of the developer portrait.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-bold text-amber-400">{devTransparency}%</span>
                    <span className="text-[10px] text-slate-500 ml-1">
                      (Opacity: {100 - devTransparency}%)
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={devTransparency}
                    onChange={(e) => setDevTransparency(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between items-center text-[10px] text-slate-500">
                    <span>0% (Solid / 100% Opacity)</span>
                    <button
                      type="button"
                      onClick={() => setDevTransparency(30)}
                      className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/40 text-amber-300 font-semibold hover:bg-amber-900/80 transition-colors"
                    >
                      Set 30% Transparency (Recommended)
                    </button>
                    <span>100% (Fully Transparent)</span>
                  </div>
                </div>
              </div>

              {/* Developer Name & Designation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Developer Name</label>
                  <input
                    type="text"
                    value={devName}
                    onChange={(e) => setDevName(e.target.value)}
                    placeholder="Amin Isse"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Designation / Title</label>
                  <input
                    type="text"
                    value={devDesignation}
                    onChange={(e) => setDevDesignation(e.target.value)}
                    placeholder="Lead Developer & Solutions Architect"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Bio / Technical Note (Optional)</label>
                <textarea
                  value={devBio}
                  onChange={(e) => setDevBio(e.target.value)}
                  rows={2}
                  placeholder="Specialized in automated brand identity architectures, Dhivehi typography, and local RAM batch processing."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Save Button */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {devSavedSuccess ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                      <Check className="w-4 h-4" /> Changes Saved!
                    </span>
                  ) : (
                    'Persists to Cloud and Local Cache.'
                  )}
                </span>
                <button
                  type="button"
                  onClick={handleSaveDeveloperProfile}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Developer Profile</span>
                </button>
              </div>
            </div>

            {/* Right 5 cols: Live Card Preview Exactly as Seen on Home Page */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Live Home Screen Card Preview (Updates in Real-Time):</span>
              </div>

              <div className="flex justify-center">
                <div className="relative group w-56 sm:w-64 rounded-2xl overflow-hidden border border-slate-800/90 bg-[#111726] shadow-2xl shadow-blue-950/40 transition-all duration-300 hover:scale-[1.02] hover:border-blue-500/40">
                  <div className="aspect-[9/16] w-full overflow-hidden relative bg-[#0B0F17]">
                    <img
                      src={devPhotoUrl || '/amin-isse.jpg'}
                      alt={`Develop by: ${devName || 'Amin Isse'}`}
                      className="w-full h-full object-cover object-top transition-opacity duration-300"
                      style={{ opacity: (100 - devTransparency) / 100 }}
                    />
                    {/* Subtle Gradient Scrim at bottom */}
                    <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none" />
                  </div>

                  {/* Developer Credit Overlay */}
                  <div className="absolute inset-x-0 bottom-0 py-3 px-3.5 text-center bg-black/75 backdrop-blur-md border-t border-slate-800/60">
                    <div className="text-xs font-bold text-white tracking-wide">
                      Develop by: {devName || 'Amin Isse'}
                    </div>
                    {devDesignation && (
                      <div className="text-[10px] text-blue-300 mt-0.5 line-clamp-1">
                        {devDesignation}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-500/20 text-xs text-blue-200 space-y-1">
                <div className="font-semibold text-blue-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Transparency Rule Verified</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  When transparency is set to 30%, the original portrait renders at 70% opacity with smooth gradient falloff. Users and visitors on the login and home page will see this exact card styling.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Inspect Organization Modal */}
      {selectedOrgDetails && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-[#111726] border border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white text-base">{selectedOrgDetails.name}</h3>
                <span className="text-xs text-slate-400 font-mono">ID: {selectedOrgDetails.id}</span>
              </div>
              <button
                onClick={() => setSelectedOrgDetails(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              {selectedOrgDetails.nameDhivehi && (
                <div>
                  <span className="text-slate-500">Dhivehi Name:</span>{' '}
                  <span className="font-thaana text-emerald-300 font-semibold">
                    {selectedOrgDetails.nameDhivehi}
                  </span>
                </div>
              )}
              {selectedOrgDetails.address && (
                <div>
                  <span className="text-slate-500">Address:</span> {selectedOrgDetails.address}
                </div>
              )}
              {selectedOrgDetails.phone && (
                <div>
                  <span className="text-slate-500">Phone:</span> {selectedOrgDetails.phone}
                </div>
              )}
              {selectedOrgDetails.email && (
                <div>
                  <span className="text-slate-500">Email:</span> {selectedOrgDetails.email}
                </div>
              )}
              {selectedOrgDetails.website && (
                <div>
                  <span className="text-slate-500">Website:</span> {selectedOrgDetails.website}
                </div>
              )}
              <div>
                <span className="text-slate-500">Owner UID:</span>{' '}
                <span className="font-mono text-blue-300">{selectedOrgDetails.ownerUid || 'System'}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedOrgDetails(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Event Modal */}
      {selectedEventDetails && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-[#111726] border border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white text-base font-thaana">
                  {selectedEventDetails.title}
                </h3>
                <span className="text-xs text-slate-400 font-mono">ID: {selectedEventDetails.id}</span>
              </div>
              <button
                onClick={() => setSelectedEventDetails(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              {selectedEventDetails.textConfig?.subtitle && (
                <div>
                  <span className="text-slate-500">Subtitle:</span>{' '}
                  {selectedEventDetails.textConfig.subtitle}
                </div>
              )}
              <div>
                <span className="text-slate-500">Date:</span> {selectedEventDetails.date || 'N/A'}
              </div>
              <div>
                <span className="text-slate-500">Venue:</span> {selectedEventDetails.venue || 'N/A'}
              </div>
              <div>
                <span className="text-slate-500">Primary Org ID:</span>{' '}
                <span className="font-mono text-purple-300">{selectedEventDetails.primaryOrgId}</span>
              </div>
              <div>
                <span className="text-slate-500">Owner UID:</span>{' '}
                <span className="font-mono text-blue-300">{selectedEventDetails.ownerUid || 'System'}</span>
              </div>
              <div>
                <span className="text-slate-500">Typography Font:</span>{' '}
                <span className="font-mono">{selectedEventDetails.textConfig?.fontFamily || 'Faruma'}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedEventDetails(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#111726] border border-rose-500/40 p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-500/40 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {userToDelete.status === 'suspended' ? 'Delete Suspended User?' : 'Delete User?'}
                </h3>
                <p className="text-xs text-rose-300/80">Permanent removal of user profile & credentials</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Name:</span>
                <span className="font-semibold text-white">{userToDelete.displayName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Email:</span>
                <span className="text-slate-300 font-mono text-[11px]">{userToDelete.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Status:</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    userToDelete.status === 'suspended'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : userToDelete.status === 'pending'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {userToDelete.status}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">UID:</span>
                <span className="text-slate-400 font-mono text-[10px] truncate max-w-[200px]">
                  {userToDelete.uid}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete this user? Their account registration and all local workspace organizations and event configurations will be permanently removed.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={handleConfirmDeleteUser}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-rose-950/50 transition-colors cursor-pointer"
              >
                {isDeletingUser ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Permanently Delete</span>
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
