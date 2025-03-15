import { Thread, Post } from '../../../types/interfaces';
import { BaseAnalyzer } from '../base';
import { MediaAnalyzerResult, MediaFile, MediaCategory, CategoryStats } from './types';
import fs from 'fs';
import path from 'path';
import { paths } from '../../utils/paths';
import axios from 'axios';
import crypto from 'crypto';

/**
 * Analyzer for downloading and managing media files
 */
export class MediaAnalyzer extends BaseAnalyzer<MediaAnalyzerResult> {
  name = 'media';
  description = 'Downloads and manages media files from threads';

  // Base URL for 4chan media
  private static MEDIA_BASE_URL = 'https://i.4cdn.org/pol';

  // Maximum age of files (24 hours in milliseconds)
  private static MAX_FILE_AGE = 24 * 60 * 60 * 1000;

  // Maximum number of random images to keep
  private static MAX_RANDOM_IMAGES = 20;

  // Maximum number of recent files to track in results
  private static MAX_RECENT_FILES = 50;

  // Map to track downloaded files by MD5
  private fileHashes = new Map<string, string>();

  /**
   * Initialize media directories
   */
  private async initDirectories(): Promise<void> {
    const mediaDir = path.resolve(paths.dataDir, 'media');
    
    // Create category directories
    for (const category of Object.values(MediaCategory)) {
      const categoryDir = path.resolve(mediaDir, category);
      if (!fs.existsSync(categoryDir)) {
        await fs.promises.mkdir(categoryDir, { recursive: true });
      }
    }
  }

  /**
   * Determine media category based on filename and extension
   */
  private categorizeFile(filename: string, ext: string): MediaCategory | null {
    const lowerFilename = filename.toLowerCase();
    const lowerExt = ext.toLowerCase();

    // Skip video files early
    if (['.webm', '.mp4', '.mov', '.avi', '.wmv', '.flv'].includes(lowerExt)) {
      return null;
    }

    // Check for GIFs
    if (lowerExt === '.gif') {
      return MediaCategory.GIF;
    }

    // Check for Pepe images - must explicitly contain 'pepe'
    if (lowerFilename.includes('pepe')) {
      return MediaCategory.PEPE;
    }

    // Check for Jak images - must explicitly contain 'jak'
    if (lowerFilename.includes('jak')) {
      return MediaCategory.JAK;
    }

    // For random category - only accept if we haven't hit the limit
    // and only certain image formats
    if (['.jpg', '.jpeg', '.png', '.webp'].includes(lowerExt)) {
      const randomDir = path.resolve(paths.dataDir, 'media', MediaCategory.RANDOM);
      if (fs.existsSync(randomDir)) {
        const randomFiles = fs.readdirSync(randomDir);
        if (randomFiles.length >= MediaAnalyzer.MAX_RANDOM_IMAGES) {
          return null;
        }
      }
      return MediaCategory.RANDOM;
    }

    return null;
  }

  /**
   * Download a file and save it to the appropriate directory
   */
  private async downloadFile(
    post: Post,
    category: MediaCategory,
    threadId: number
  ): Promise<MediaFile | null> {
    try {
      if (!post.tim || !post.ext || !post.filename) return null;

      const url = `${MediaAnalyzer.MEDIA_BASE_URL}/${post.tim}${post.ext}`;
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      
      // Calculate MD5 hash of file content
      const hash = crypto.createHash('md5').update(response.data).digest('hex');

      // Check for duplicates
      if (this.fileHashes.has(hash)) {
        console.log(`Skipping duplicate file: ${post.filename}${post.ext}`);
        return null;
      }

      // Generate stored filename with timestamp
      const timestamp = Date.now();
      const storedName = `${timestamp}_${post.tim}${post.ext}`;
      const filePath = path.resolve(paths.dataDir, 'media', category, storedName);

      // Save file
      await fs.promises.writeFile(filePath, response.data);
      this.fileHashes.set(hash, filePath);

      // Create media file record
      const mediaFile: MediaFile = {
        filename: `${post.filename}${post.ext}`,
        storedName,
        category,
        threadId,
        postId: post.no,
        md5: hash,
        timestamp,
        fileSize: post.fsize || 0,
        width: post.w || 0,
        height: post.h || 0
      };

      return mediaFile;
    } catch (error) {
      console.error(`Error downloading file from post ${post.no}:`, error);
      return null;
    }
  }

  /**
   * Remove files older than MAX_FILE_AGE
   */
  private async purgeOldFiles(): Promise<number> {
    let deletedCount = 0;
    const now = Date.now();

    for (const category of Object.values(MediaCategory)) {
      const categoryDir = path.resolve(paths.dataDir, 'media', category);
      if (!fs.existsSync(categoryDir)) continue;

      const files = await fs.promises.readdir(categoryDir);
      
      for (const file of files) {
        const filePath = path.resolve(categoryDir, file);
        const stats = await fs.promises.stat(filePath);
        
        // Check if file is older than MAX_FILE_AGE
        if (now - stats.mtimeMs > MediaAnalyzer.MAX_FILE_AGE) {
          await fs.promises.unlink(filePath);
          deletedCount++;
        }
      }
    }

    return deletedCount;
  }

  /**
   * Get statistics for each category
   */
  private async getCategoryStats(): Promise<CategoryStats[]> {
    const stats: CategoryStats[] = [];

    for (const category of Object.values(MediaCategory)) {
      const categoryDir = path.resolve(paths.dataDir, 'media', category);
      if (!fs.existsSync(categoryDir)) continue;

      const files = await fs.promises.readdir(categoryDir);
      let totalSize = 0;

      for (const file of files) {
        const filePath = path.resolve(categoryDir, file);
        const fileStats = await fs.promises.stat(filePath);
        totalSize += fileStats.size;
      }

      stats.push({
        category,
        fileCount: files.length,
        totalSize,
        lastUpdated: Date.now()
      });
    }

    return stats;
  }

  /**
   * Process media from all threads
   */
  async analyze(threads: Thread[]): Promise<MediaAnalyzerResult[]> {
    console.log('Starting media analysis...');
    
    // Initialize directories and tracking
    await this.initDirectories();
    this.fileHashes.clear();
    
    const downloadedFiles: MediaFile[] = [];
    let totalFiles = 0;
    let duplicatesSkipped = 0;
    let randomCount = 0;

    // Process each thread
    for (const thread of threads) {
      if (!thread.posts) continue;

      // Include OP if it has a file
      if (thread.tim && thread.ext && thread.filename) {
        totalFiles++;
        const opPost = {
          no: thread.no,
          resto: 0,
          time: thread.time,
          name: thread.name,
          tim: thread.tim,
          ext: thread.ext,
          filename: thread.filename,
          fsize: thread.fsize,
          w: thread.w,
          h: thread.h
        };
        const category = this.categorizeFile(thread.filename, thread.ext);
        
        // Skip if not categorized or random category is full
        if (!category || (category === MediaCategory.RANDOM && randomCount >= MediaAnalyzer.MAX_RANDOM_IMAGES)) {
          continue;
        }

        const mediaFile = await this.downloadFile(opPost, category, thread.no);
        
        if (mediaFile) {
          downloadedFiles.push(mediaFile);
          if (category === MediaCategory.RANDOM) randomCount++;
        } else {
          duplicatesSkipped++;
        }
      }

      // Process each post in thread
      for (const post of thread.posts) {
        if (!post.tim || !post.ext || !post.filename) continue;
        
        totalFiles++;
        const category = this.categorizeFile(post.filename, post.ext);
        
        // Skip if not categorized or random category is full
        if (!category || (category === MediaCategory.RANDOM && randomCount >= MediaAnalyzer.MAX_RANDOM_IMAGES)) {
          continue;
        }

        const mediaFile = await this.downloadFile(post, category, thread.no);
        if (mediaFile) {
          downloadedFiles.push(mediaFile);
          if (category === MediaCategory.RANDOM) randomCount++;
        } else {
          duplicatesSkipped++;
        }

        // Early exit if we have enough random images
        if (randomCount >= MediaAnalyzer.MAX_RANDOM_IMAGES) {
          break;
        }
      }
    }

    // Get category statistics
    const categoryStats = await this.getCategoryStats();

    // Create single result
    return [{
      timestamp: Date.now(),
      threadId: threads[0]?.no || 0,
      postId: threads[0]?.posts?.[0]?.no || 0,
      categoryStats,
      recentFiles: downloadedFiles.slice(-MediaAnalyzer.MAX_RECENT_FILES),
      metadata: {
        totalFilesProcessed: totalFiles,
        filesDownloaded: downloadedFiles.length,
        duplicatesSkipped,
        filesDeleted: 0, // We'll handle cleanup separately
        lastPurge: Date.now()
      }
    }];
  }
} 