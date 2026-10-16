import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FolderCheck,
  HardDriveDownload,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { ExportSuccessSummary } from '../types/studio';

interface ExportVerificationModalsProps {
  // 1. Export Success Screen (Section 9)
  exportSuccessSummary: ExportSuccessSummary | null;
  onDismissExportSuccess: () => void;

  // 2. ZIP Fallback Confirmation Dialog (Section 7)
  pendingZipConfirmation: {
    zipFilename: string;
    exportedCount: number;
    eventName: string;
  } | null;
  onConfirmZipSavedAndClear: () => void;
  onKeepPhotosAfterZip: () => void;

  // 3. Partial / Failed Export Recovery Modal (Section 8)
  failedExportState: {
    exportedCount: number;
    totalCount: number;
    failedFiles: { id: string; filename: string; reason: string }[];
    lastExportMode: 'folder' | 'zip';
  } | null;
  onRetryFailedExport: () => void;
  onDismissFailedExport: () => void;

  // 4. Manual Clear Photos Confirmation Modal (Section 12)
  showManualClearConfirm: boolean;
  totalPhotosCount: number;
  onConfirmManualClear: () => void;
  onCancelManualClear: () => void;
}

export const ExportVerificationModals: React.FC<ExportVerificationModalsProps> = ({
  exportSuccessSummary,
  onDismissExportSuccess,
  pendingZipConfirmation,
  onConfirmZipSavedAndClear,
  onKeepPhotosAfterZip,
  failedExportState,
  onRetryFailedExport,
  onDismissFailedExport,
  showManualClearConfirm,
  totalPhotosCount,
  onConfirmManualClear,
  onCancelManualClear,
}) => {
  return (
    <>
      {/* ====================================================================
          SECTION 9: EXPORT SUCCESS SCREEN
         ==================================================================== */}
      {exportSuccessSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111726] border border-emerald-500/40 rounded-xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Photos Exported Successfully
                </h2>
                <p className="text-xs text-slate-300">
                  All output files have been verified and temporary session photographs have been
                  automatically cleared from memory.
                </p>
              </div>
            </div>

            <div className="bg-[#0B0F17] border border-slate-800 rounded-lg p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Event Name</span>
                <span className="font-semibold text-white font-thaana text-right">
                  {exportSuccessSummary.eventName}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Total Exported Photos</span>
                <span className="font-mono font-semibold text-emerald-400 tabular-nums">
                  {exportSuccessSummary.totalExported} Photos
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Export Format</span>
                <span className="font-mono text-slate-200">{exportSuccessSummary.exportFormat}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Destination Folder</span>
                <span className="font-mono text-blue-400 truncate max-w-[260px]">
                  {exportSuccessSummary.destinationFolder}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-blue-950/30 border border-blue-500/30 flex items-center gap-3 text-xs text-blue-200">
              <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
              <div>
                <span className="font-semibold text-white">Event Configuration Preserved:</span>{' '}
                Organization logos, linear gradient stops, Dhivehi RTL typography, and sponsor
                placements remain saved and ready to import your next batch.
              </div>
            </div>

            <button
              onClick={onDismissExportSuccess}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Return to Event Editor (Ready to Import New Photos)
            </button>
          </div>
        </div>
      )}

      {/* ====================================================================
          SECTION 7: ZIP DOWNLOAD FALLBACK CONFIRMATION
         ==================================================================== */}
      {pendingZipConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111726] border border-slate-700 rounded-xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 shrink-0">
                <HardDriveDownload className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-bold text-white">
                  Have you successfully saved the ZIP file?
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Archive{' '}
                  <span className="font-mono text-blue-300">
                    {pendingZipConfirmation.zipFilename}
                  </span>{' '}
                  ({pendingZipConfirmation.exportedCount} branded photos) was sent to your browser
                  download manager. Because standard browser downloads do not notify web apps when
                  disk writing finishes, please confirm before temporary photos are cleared.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={onConfirmZipSavedAndClear}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                Yes, Clear Photos
              </button>
              <button
                onClick={onKeepPhotosAfterZip}
                className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                Keep Photos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          SECTION 8: FAILED OR PARTIAL EXPORT RECOVERY MODAL
         ==================================================================== */}
      {failedExportState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111726] border border-amber-500/50 rounded-xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-bold text-white">
                  Export Incomplete — Temporary Photos Preserved
                </h2>
                <p className="text-xs text-slate-300">
                  {failedExportState.exportedCount} of {failedExportState.totalCount} photos
                  succeeded, while {failedExportState.failedFiles.length} failed. Automatic memory
                  cleanup was halted so you do not lose your imported batch or adjustments.
                </p>
              </div>
            </div>

            <div className="bg-[#0B0F17] border border-slate-800 rounded-lg p-3 max-h-40 overflow-y-auto space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Failed Files ({failedExportState.failedFiles.length})
              </div>
              {failedExportState.failedFiles.map((f) => (
                <div
                  key={f.id}
                  className="text-xs flex items-center justify-between gap-2 py-1 border-b border-slate-800/60 last:border-0"
                >
                  <span className="font-mono text-rose-300 truncate">{f.filename}</span>
                  <span className="text-slate-400 text-[11px] shrink-0">{f.reason}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onRetryFailedExport}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Failed Files ({failedExportState.failedFiles.length})
              </button>
              <button
                onClick={onDismissFailedExport}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
              >
                Return to Editor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          SECTION 12: MANUAL CLEAR PHOTOS CONFIRMATION
         ==================================================================== */}
      {showManualClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111726] border border-slate-700 rounded-xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-bold text-white">
                  Clear {totalPhotosCount} Temporary Photos from Memory?
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  This will immediately revoke all temporary object URLs, release decoded image
                  buffers, and reset the photo import gallery. Your original files on your device
                  remain untouched, and all Event Branding & Banner settings will remain saved.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={onConfirmManualClear}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Clear Temporary Photos
              </button>
              <button
                onClick={onCancelManualClear}
                className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
