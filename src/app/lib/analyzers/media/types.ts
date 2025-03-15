import { AnalyzerResult } from '../../../types/interfaces';

/**
 * Categories for different types of media files
 */
export enum MediaCategory {
  PEPE = 'pepe',
  JAK = 'jak',
  GIF = 'gif',
  RANDOM = 'random'
}

/**
 * Information about a downloaded media file
 */
export interface MediaFile {
  filename: string;      // Original filename
  storedName: string;    // Name used for storage (with timestamp)
  category: MediaCategory; // Category of the file
  threadId: number;      // Source thread ID
  postId: number;        // Source post ID
  md5: string;          // File hash for deduplication
  timestamp: number;     // When the file was downloaded
  fileSize: number;      // Size in bytes
  width: number;        // Image width
  height: number;       // Image height
}

/**
 * Statistics for a media category
 */
export interface CategoryStats {
  category: MediaCategory;
  fileCount: number;
  totalSize: number;
  lastUpdated: number;
}

/**
 * Result structure for Media analysis
 */
export interface MediaAnalyzerResult extends AnalyzerResult {
  categoryStats: CategoryStats[];  // Statistics for each category
  recentFiles: MediaFile[];       // Most recently downloaded files
  metadata: {
    totalFilesProcessed: number;  // Total number of files seen
    filesDownloaded: number;      // Number of files actually downloaded
    duplicatesSkipped: number;    // Number of duplicates found
    filesDeleted: number;         // Number of old files removed
    lastPurge: number;           // When old files were last purged
  };
} 