import JSZip from 'jszip';
import {
  BrandingLogoAsset,
  EventConfiguration,
  ExportSuccessSummary,
  OrganizationProfile,
  TemporaryPhotoItem,
} from '../types/studio';
import { renderPhotoItemToBlob } from './canvasRenderer';

/**
 * Sanitize event title and date to produce safe folder and archive names.
 * Example for Folder: 2026-10-12_Event_Title
 * Example for ZIP: Event_Title_2026-10-12.zip
 */
export function sanitizeEventSlug(rawTitle: string, fallback = 'Event_Photos'): string {
  // Replace characters illegal in Windows/macOS/Linux directory names
  const cleaned = rawTitle
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  return cleaned.length > 0 ? cleaned.slice(0, 80) : fallback;
}

export function buildEventFolderName(event: EventConfiguration): string {
  const datePart = event.date || new Date().toISOString().slice(0, 10);
  const titleSlug = sanitizeEventSlug(
    event.orgNameOverride ? `${event.title}_${event.orgNameOverride}` : event.title,
    'Event_Title'
  );
  return `${datePart}_${titleSlug}`;
}

export function buildEventZipBaseName(event: EventConfiguration): string {
  const datePart = event.date || new Date().toISOString().slice(0, 10);
  const titleSlug = sanitizeEventSlug(event.title, 'Event_Title');
  return `${titleSlug}_${datePart}`;
}

export function getExtensionForMime(mime: 'image/jpeg' | 'image/png' | 'image/webp'): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

export function formatOutputFilename(
  photo: TemporaryPhotoItem,
  indexZeroBased: number,
  event: EventConfiguration
): string {
  const ext = getExtensionForMime(event.exportConfig.format);
  if (event.exportConfig.preserveOriginalFilename) {
    const base = photo.filename.replace(/\.[^/.]+$/, '');
    const safeBase = sanitizeEventSlug(base, `IMG_${String(indexZeroBased + 1).padStart(4, '0')}`);
    return `${safeBase}_branded.${ext}`;
  }
  const num = event.exportConfig.numberingStart + indexZeroBased;
  const padded = String(num).padStart(4, '0');
  const prefix = sanitizeEventSlug(event.exportConfig.filenamePrefix || 'IMG', 'IMG');
  return `${prefix}_${padded}.${ext}`;
}

/**
 * Checks whether the File System Access API (`showDirectoryPicker`) is supported
 * and allowed in the current browsing context.
 */
export function isDirectoryPickerSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Resolve a non-colliding filename inside a FileSystemDirectoryHandle so we never
 * overwrite existing files without permission.
 */
async function resolveUniqueFilenameInDir(
  dirHandle: any,
  desiredFilename: string
): Promise<string> {
  const dotIdx = desiredFilename.lastIndexOf('.');
  const base = dotIdx !== -1 ? desiredFilename.slice(0, dotIdx) : desiredFilename;
  const ext = dotIdx !== -1 ? desiredFilename.slice(dotIdx) : '';

  let candidate = desiredFilename;
  let counter = 1;

  while (counter < 500) {
    try {
      // If getFileHandle succeeds without create:true, the file already exists
      await dirHandle.getFileHandle(candidate, { create: false });
      candidate = `${base}_${counter}${ext}`;
      counter++;
    } catch (err: any) {
      if (err && err.name === 'NotFoundError') {
        return candidate;
      }
      // Any other error, return candidate
      return candidate;
    }
  }
  return `${base}_${Date.now()}${ext}`;
}

export interface BatchExportCallbacks {
  onStepChange: (stepLabel: string) => void;
  onProgress: (completed: number, total: number) => void;
  onPhotoStatusUpdate: (
    photoId: string,
    status: TemporaryPhotoItem['status'],
    blob?: Blob,
    errorMessage?: string
  ) => void;
  signal: AbortSignal;
}

/**
 * Direct-to-Folder Export using the File System Access API.
 * 1. Requests directory access directly from user gesture.
 * 2. Creates `{Date}_{Event_Title}/` subfolder inside chosen directory.
 * 3. Streams each generated photo directly to disk, closing each WritableStream properly.
 * 4. Verifies every file exists and has size > 0 before returning success.
 */
export async function exportPhotosToDeviceFolder(
  photosToExport: TemporaryPhotoItem[],
  event: EventConfiguration,
  allLogos: BrandingLogoAsset[],
  callbacks: BatchExportCallbacks,
  activeOrganization?: OrganizationProfile,
  simulateFailureOnIndex?: number // Optional hook to test Acceptance Test 10 (partial/failed export recovery)
): Promise<{
  allSucceeded: boolean;
  exportedCount: number;
  failedFiles: { id: string; filename: string; reason: string }[];
  folderName: string;
  summary?: ExportSuccessSummary;
}> {
  const win = window as any;
  if (typeof win.showDirectoryPicker !== 'function') {
    throw new Error('Direct folder access (File System Access API) is not supported in this browser or iframe context. Please use Download ZIP.');
  }

  // Request directory handle immediately from user action
  const rootDirHandle = await win.showDirectoryPicker({
    mode: 'readwrite',
  });

  const subFolderName = buildEventFolderName(event);
  const eventFolderHandle = await rootDirHandle.getDirectoryHandle(subFolderName, {
    create: true,
  });

  const total = photosToExport.length;
  let exportedCount = 0;
  const failedFiles: { id: string; filename: string; reason: string }[] = [];

  callbacks.onStepChange(`Writing branded photos to ${subFolderName}/...`);
  callbacks.onProgress(0, total);

  for (let i = 0; i < total; i++) {
    if (callbacks.signal.aborted) {
      throw new Error('Export cancelled by user.');
    }

    const photo = photosToExport[i];
    callbacks.onPhotoStatusUpdate(photo.id, 'processing');

    try {
      if (simulateFailureOnIndex !== undefined && i === simulateFailureOnIndex) {
        throw new Error('Simulated disk write interruption (Acceptance Test 10 verification)');
      }

      // Reuse already-generated blob if available, otherwise render on-the-fly and release immediately
      const blob =
        photo.generatedBlob ??
        (await renderPhotoItemToBlob(photo, event, allLogos, activeOrganization));

      const desiredName = formatOutputFilename(photo, i, event);
      const safeUniqueName = await resolveUniqueFilenameInDir(eventFolderHandle, desiredName);

      const fileHandle = await eventFolderHandle.getFileHandle(safeUniqueName, { create: true });
      const writable = await fileHandle.createWritable();
      try {
        await writable.write(blob);
      } finally {
        await writable.close();
      }

      // Verify the written file exists and is non-empty
      const writtenFile: File = await fileHandle.getFile();
      if (!writtenFile || writtenFile.size === 0) {
        throw new Error(`Verification failed: written file ${safeUniqueName} is 0 bytes.`);
      }

      exportedCount++;
      callbacks.onPhotoStatusUpdate(photo.id, 'exported');
      callbacks.onProgress(exportedCount, total);
    } catch (err: any) {
      const reason = err?.message || 'File write failed';
      failedFiles.push({ id: photo.id, filename: photo.filename, reason });
      callbacks.onPhotoStatusUpdate(photo.id, 'failed', undefined, reason);
    }
  }

  const allSucceeded = failedFiles.length === 0 && exportedCount === total && total > 0;

  return {
    allSucceeded,
    exportedCount,
    failedFiles,
    folderName: `${rootDirHandle.name}/${subFolderName}`,
    summary: allSucceeded
      ? {
          eventName: event.title,
          eventDate: event.date,
          totalExported: exportedCount,
          exportFormat: event.exportConfig.format.replace('image/', '').toUpperCase(),
          destinationFolder: `${rootDirHandle.name}/${subFolderName}/`,
          exportMethod: 'folder-direct',
          timestamp: new Date().toISOString(),
        }
      : undefined,
  };
}

/**
 * Generates a real ZIP archive containing `{Event_Title}_{Date}/IMG_0001.jpg`
 * for all selected/imported photos.
 * Uses `showSaveFilePicker` stream if available to verify disk write completion,
 * or falls back to a standard browser download link (which requires explicit user confirmation before clearing).
 */
export async function exportPhotosAsZipArchive(
  photosToExport: TemporaryPhotoItem[],
  event: EventConfiguration,
  allLogos: BrandingLogoAsset[],
  callbacks: BatchExportCallbacks,
  activeOrganization?: OrganizationProfile,
  simulateFailureOnIndex?: number
): Promise<{
  allSucceeded: boolean;
  exportedCount: number;
  failedFiles: { id: string; filename: string; reason: string }[];
  zipFilename: string;
  verifiedByFileSystemStream: boolean;
  summary?: ExportSuccessSummary;
}> {
  const zip = new JSZip();
  const baseFolderName = buildEventZipBaseName(event);
  const zipFilename = `${baseFolderName}.zip`;
  const folderInZip = zip.folder(baseFolderName)!;

  const total = photosToExport.length;
  let processedCount = 0;
  const failedFiles: { id: string; filename: string; reason: string }[] = [];

  callbacks.onStepChange('Rendering & packaging photographs into archive...');
  callbacks.onProgress(0, total);

  for (let i = 0; i < total; i++) {
    if (callbacks.signal.aborted) {
      throw new Error('ZIP generation cancelled by user.');
    }

    const photo = photosToExport[i];
    callbacks.onPhotoStatusUpdate(photo.id, 'processing');

    try {
      if (simulateFailureOnIndex !== undefined && i === simulateFailureOnIndex) {
        throw new Error('Simulated image encoding failure during batch');
      }

      const blob =
        photo.generatedBlob ??
        (await renderPhotoItemToBlob(photo, event, allLogos, activeOrganization));

      const outName = formatOutputFilename(photo, i, event);
      folderInZip.file(outName, blob);

      processedCount++;
      callbacks.onPhotoStatusUpdate(photo.id, 'generated', blob);
      callbacks.onProgress(processedCount, total);
    } catch (err: any) {
      const reason = err?.message || 'Failed to render photo for ZIP';
      failedFiles.push({ id: photo.id, filename: photo.filename, reason });
      callbacks.onPhotoStatusUpdate(photo.id, 'failed', undefined, reason);
    }
  }

  if (processedCount === 0) {
    return {
      allSucceeded: false,
      exportedCount: 0,
      failedFiles,
      zipFilename,
      verifiedByFileSystemStream: false,
    };
  }

  callbacks.onStepChange('Compressing ZIP archive...');
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'STORE', // JPEG/PNG/WebP are already compressed; STORE is fast and memory-efficient
  });

  // Try explicit Save File Dialog with writable stream if supported & not blocked by cross-origin iframe
  const win = window as any;
  let verifiedByFileSystemStream = false;

  if (typeof win.showSaveFilePicker === 'function') {
    try {
      const fileHandle = await win.showSaveFilePicker({
        suggestedName: zipFilename,
        types: [
          {
            description: 'ZIP Archive',
            accept: { 'application/zip': ['.zip'] },
          },
        ],
      });
      const writable = await fileHandle.createWritable();
      try {
        await writable.write(zipBlob);
      } finally {
        await writable.close();
      }
      const savedFile = await fileHandle.getFile();
      if (savedFile && savedFile.size > 0) {
        verifiedByFileSystemStream = true;
      }
    } catch (pickerErr: any) {
      if (pickerErr?.name === 'AbortError') {
        throw new Error('Save dialog was cancelled.');
      }
      // If blocked by iframe security policy, fall through to standard anchor download
      verifiedByFileSystemStream = false;
    }
  }

  if (!verifiedByFileSystemStream) {
    // Fallback to normal browser download link
    const zipUrl = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = zipUrl;
    a.download = zipFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revoke after a short delay to allow browser download manager to start reading the blob
    setTimeout(() => URL.revokeObjectURL(zipUrl), 15000);
  }

  const allSucceeded = failedFiles.length === 0 && processedCount === total;

  return {
    allSucceeded,
    exportedCount: processedCount,
    failedFiles,
    zipFilename,
    verifiedByFileSystemStream,
    summary: allSucceeded
      ? {
          eventName: event.title,
          eventDate: event.date,
          totalExported: processedCount,
          exportFormat: `ZIP (${event.exportConfig.format.replace('image/', '').toUpperCase()})`,
          destinationFolder: `${baseFolderName}/ (${zipFilename})`,
          exportMethod: verifiedByFileSystemStream ? 'zip-file-handle' : 'zip-browser-link',
          timestamp: new Date().toISOString(),
        }
      : undefined,
  };
}
